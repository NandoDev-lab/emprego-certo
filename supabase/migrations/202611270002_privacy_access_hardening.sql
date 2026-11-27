-- Reforça privacidade e integridade do esquema local antes de qualquer integração.
-- Esta migração não representa, por si só, uma avaliação jurídica de conformidade.

-- Uma organização só se torna publicamente utilizável após validação operacional.
alter table public.companies
  add column verified_at timestamptz;

comment on column public.companies.verified_at is
  'Preenchido somente por um processo confiável de validação da organização.';

-- Limita a escrita de recrutamento a proprietários e recrutadores, excluindo leitores.
create or replace function public.is_company_recruiter(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = target_company
      and cm.profile_id = (select auth.uid())
      and cm.member_role in ('owner', 'recruiter')
  );
$$;

create or replace function public.is_job_company_recruiter(target_job uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.jobs j
    join public.company_members cm on cm.company_id = j.company_id
    where j.id = target_job
      and cm.profile_id = (select auth.uid())
      and cm.member_role in ('owner', 'recruiter')
  );
$$;

-- A verificação é informação pública necessária para filtrar vagas e empresas.
create or replace function public.is_company_verified(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.companies c
    where c.id = target_company and c.verified_at is not null
  );
$$;

-- Auxiliar restrito ao próprio usuário para descobrir se ele é recrutador.
create or replace function public.is_company_recruiter_for_any_company(target_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_members cm
    where cm.profile_id = target_profile
      and cm.profile_id = (select auth.uid())
      and cm.member_role in ('owner', 'recruiter')
  );
$$;

-- Consulta o registro mais recente; uma revogação substitui concessões anteriores.
-- Para terceiros, só retorna verdadeiro quando há relação de acesso recrutador válida.
create or replace function public.has_current_privacy_consent(
  target_profile uuid,
  target_purpose text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then false
    when target_purpose not in ('profile_discovery', 'application_profile_sharing') then false
    when target_profile = (select auth.uid()) then coalesce((
      select cr.granted
      from public.consent_records cr
      where cr.profile_id = target_profile and cr.purpose = target_purpose
      order by cr.recorded_at desc, cr.id desc
      limit 1
    ), false)
    when target_purpose = 'profile_discovery' then
      public.is_company_recruiter_for_any_company((select auth.uid()))
      and exists (
        select 1 from public.profiles p
        where p.id = target_profile and p.profile_visible
      )
      and coalesce((
        select cr.granted
        from public.consent_records cr
        where cr.profile_id = target_profile and cr.purpose = target_purpose
        order by cr.recorded_at desc, cr.id desc
        limit 1
      ), false)
    when target_purpose = 'application_profile_sharing' then
      exists (
        select 1
        from public.applications a
        join public.jobs j on j.id = a.job_id
        join public.company_members cm on cm.company_id = j.company_id
        where a.candidate_id = target_profile
          and a.profile_shared
          and cm.profile_id = (select auth.uid())
          and cm.member_role in ('owner', 'recruiter')
      )
      and coalesce((
        select cr.granted
        from public.consent_records cr
        where cr.profile_id = target_profile and cr.purpose = target_purpose
        order by cr.recorded_at desc, cr.id desc
        limit 1
      ), false)
    else false
  end;
$$;

-- O cliente escolhe apenas finalidade e decisão; versão e data vêm do servidor.
create or replace function public.record_privacy_consent(
  target_purpose text,
  is_granted boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile uuid := (select auth.uid());
  new_record_id uuid;
  next_recorded_at timestamptz;
begin
  if current_profile is null then
    raise exception 'Authentication required';
  end if;
  if target_purpose not in ('profile_discovery', 'application_profile_sharing') then
    raise exception 'Unsupported consent purpose';
  end if;

  -- Serializa alterações do mesmo titular e evita empates que embaralhem a decisão vigente.
  perform 1 from public.profiles p where p.id = current_profile for update;
  select greatest(
    clock_timestamp(),
    coalesce(max(cr.recorded_at) + interval '1 microsecond', '-infinity'::timestamptz)
  )
  into next_recorded_at
  from public.consent_records cr
  where cr.profile_id = current_profile and cr.purpose = target_purpose;

  insert into public.consent_records (profile_id, purpose, policy_version, granted, recorded_at)
  values (current_profile, target_purpose, 'privacy-ptbr-2026-11-v1', is_granted, next_recorded_at)
  returning id into new_record_id;

  return new_record_id;
end;
$$;

-- Impede a alteração posterior das identidades de vaga e de feedback.
create or replace function public.prevent_job_reassignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.company_id is distinct from old.company_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'Job identity and ownership cannot be changed';
  end if;
  return new;
end;
$$;

create trigger jobs_immutable_identity
  before update on public.jobs
  for each row execute procedure public.prevent_job_reassignment();

create or replace function public.prevent_feedback_reassignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.application_id is distinct from old.application_id
    or new.author_id is distinct from old.author_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Feedback identity and author cannot be changed';
  end if;
  return new;
end;
$$;

create trigger feedback_immutable_identity
  before update on public.application_feedback
  for each row execute procedure public.prevent_feedback_reassignment();

-- Mantém as datas de atualização e publicação coerentes sem confiar no navegador.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute procedure public.set_updated_at();

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute procedure public.set_updated_at();

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute procedure public.set_updated_at();

create trigger feedback_set_updated_at
  before update on public.application_feedback
  for each row execute procedure public.set_updated_at();

create or replace function public.set_feedback_approval_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Só uma ação explícita de publicação define a data; o navegador não a escolhe.
  if tg_op = 'INSERT' then
    new.visible_to_candidate := false;
    new.approved_at := null;
  elsif new.visible_to_candidate is distinct from old.visible_to_candidate then
    new.approved_at := case when new.visible_to_candidate then now() else null end;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger feedback_approval_timestamp
  before insert or update on public.application_feedback
  for each row execute procedure public.set_feedback_approval_timestamp();

-- Usuários não podem escolher o papel de recrutador usando metadados de cadastro.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''), 200),
    'candidate'::public.account_role
  );
  return new;
end;
$$;

-- Perfis privados por padrão; revelar perfil exige consentimento atual e papel adequado.
drop policy "Profiles visible to owner or opted-in recruiters" on public.profiles;
create policy "Profiles visible to owner or currently authorized recruiters"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (
      profile_visible
      and public.has_current_privacy_consent(id, 'profile_discovery')
      and public.is_company_recruiter_for_any_company((select auth.uid()))
    )
    or exists (
      select 1
      from public.applications a
      where a.candidate_id = profiles.id
        and a.profile_shared
        and public.is_job_company_recruiter(a.job_id)
        and public.has_current_privacy_consent(profiles.id, 'application_profile_sharing')
    )
  );

-- Empresas não verificadas e dados institucionais não são públicos.
drop policy "Companies are publicly readable" on public.companies;
create policy "Verified companies are publicly readable"
  on public.companies for select to anon, authenticated
  using (verified_at is not null);
create policy "Company members read their organization"
  on public.companies for select to authenticated
  using (public.is_company_member(id));
drop policy "Company members manage their company" on public.companies;
create policy "Company recruiters update organization details"
  on public.companies for update to authenticated
  using (public.is_company_recruiter(id))
  with check (public.is_company_recruiter(id));

-- Recrutadores veem dados profissionais adicionais somente com compartilhamento vigente.
drop policy "Hiring teams read skills shared in applications" on public.candidate_skills;
create policy "Hiring teams read skills with current consent"
  on public.candidate_skills for select to authenticated
  using (exists (
    select 1 from public.applications a
    where a.candidate_id = profile_id and a.profile_shared
      and public.is_job_company_recruiter(a.job_id)
      and public.has_current_privacy_consent(profile_id, 'application_profile_sharing')
  ));

drop policy "Hiring teams read shared experience" on public.candidate_experiences;
create policy "Hiring teams read experience with current consent"
  on public.candidate_experiences for select to authenticated
  using (exists (
    select 1 from public.applications a
    where a.candidate_id = profile_id and a.profile_shared
      and public.is_job_company_recruiter(a.job_id)
      and public.has_current_privacy_consent(profile_id, 'application_profile_sharing')
  ));

drop policy "Hiring teams read shared education" on public.candidate_educations;
create policy "Hiring teams read education with current consent"
  on public.candidate_educations for select to authenticated
  using (exists (
    select 1 from public.applications a
    where a.candidate_id = profile_id and a.profile_shared
      and public.is_job_company_recruiter(a.job_id)
      and public.has_current_privacy_consent(profile_id, 'application_profile_sharing')
  ));

-- Chaves corretas de avaliações não podem ser consultadas pelo navegador.
create or replace view public.published_skill_assessments
with (security_invoker = true)
as
  select id, skill_id, title, level, version, created_at
  from public.skill_assessments
  where is_published;

revoke select on public.skill_assessments from anon, authenticated;
grant select (id, skill_id, title, level, version, is_published, created_at)
  on public.skill_assessments to anon, authenticated;
grant select on public.published_skill_assessments to anon, authenticated;

-- Tentativas ficam somente para leitura até existir um avaliador seguro no servidor.
drop policy "Candidates submit own assessment attempts" on public.skill_assessment_attempts;
revoke insert, update, delete on public.skill_assessment_attempts from authenticated;

-- O registro imutável de consentimento é gravado pela função que fixa versão e data.
alter table public.consent_records
  add constraint consent_records_supported_purpose
    check (purpose in ('profile_discovery', 'application_profile_sharing')),
  add constraint consent_records_policy_version_length
    check (length(policy_version) between 1 and 80);

drop policy "Candidates record own consent changes" on public.consent_records;

-- Vagas publicadas só aparecem após verificação institucional.
drop policy "Published jobs are publicly readable" on public.jobs;
create policy "Verified published jobs are publicly readable"
  on public.jobs for select to anon, authenticated
  using (status = 'published' and public.is_company_verified(company_id));
create policy "Company members read all organization jobs"
  on public.jobs for select to authenticated
  using (public.is_company_member(company_id));

drop policy "Company members manage jobs" on public.jobs;
create policy "Verified company recruiters create jobs"
  on public.jobs for insert to authenticated
  with check (
    public.is_company_recruiter(company_id)
    and created_by = (select auth.uid())
    and (status <> 'published' or public.is_company_verified(company_id))
  );
create policy "Company recruiters update jobs"
  on public.jobs for update to authenticated
  using (public.is_company_recruiter(company_id))
  with check (
    public.is_company_recruiter(company_id)
    and (status <> 'published' or public.is_company_verified(company_id))
  );
create policy "Company recruiters delete jobs"
  on public.jobs for delete to authenticated
  using (public.is_company_recruiter(company_id));

drop policy "Job skills are readable with the job" on public.job_skills;
create policy "Skills on verified published jobs are public"
  on public.job_skills for select to anon, authenticated
  using (exists (
    select 1 from public.jobs j
    where j.id = job_id and j.status = 'published'
      and public.is_company_verified(j.company_id)
  ));
create policy "Company members read organization job skills"
  on public.job_skills for select to authenticated
  using (exists (
    select 1 from public.jobs j
    where j.id = job_id and public.is_company_member(j.company_id)
  ));

drop policy "Company members manage job skills" on public.job_skills;
create policy "Company recruiters insert job skills"
  on public.job_skills for insert to authenticated
  with check (exists (
    select 1 from public.jobs j
    where j.id = job_id and public.is_company_recruiter(j.company_id)
  ));
create policy "Company recruiters update job skills"
  on public.job_skills for update to authenticated
  using (exists (
    select 1 from public.jobs j
    where j.id = job_id and public.is_company_recruiter(j.company_id)
  ))
  with check (exists (
    select 1 from public.jobs j
    where j.id = job_id and public.is_company_recruiter(j.company_id)
  ));
create policy "Company recruiters delete job skills"
  on public.job_skills for delete to authenticated
  using (exists (
    select 1 from public.jobs j
    where j.id = job_id and public.is_company_recruiter(j.company_id)
  ));

-- Candidaturas expõem perfil apenas à equipe da vaga enquanto o consentimento vigora.
drop policy "Candidates read own applications and recruiters read job applications" on public.applications;
create policy "Candidates and currently authorized recruiters read applications"
  on public.applications for select to authenticated
  using (
    candidate_id = (select auth.uid())
    or (
      public.is_job_company_recruiter(job_id)
      and profile_shared
      and public.has_current_privacy_consent(candidate_id, 'application_profile_sharing')
    )
  );

drop policy "Candidates apply to published jobs" on public.applications;
create policy "Candidates apply with current sharing consent"
  on public.applications for insert to authenticated
  with check (
    candidate_id = (select auth.uid())
    and status = 'submitted'
    and profile_shared
    and public.has_current_privacy_consent(candidate_id, 'application_profile_sharing')
    and match_score is null
    and exists (
      select 1 from public.jobs j
      where j.id = job_id and j.status = 'published'
        and public.is_company_verified(j.company_id)
    )
  );

drop policy "Candidates or recruiters update application" on public.applications;
create policy "Candidates withdraw own applications"
  on public.applications for update to authenticated
  using (candidate_id = (select auth.uid()))
  with check (candidate_id = (select auth.uid()) and status = 'withdrawn');
create policy "Company recruiters update shared applications"
  on public.applications for update to authenticated
  using (
    public.is_job_company_recruiter(job_id)
    and profile_shared
    and public.has_current_privacy_consent(candidate_id, 'application_profile_sharing')
  )
  with check (
    public.is_job_company_recruiter(job_id)
    and profile_shared
    and public.has_current_privacy_consent(candidate_id, 'application_profile_sharing')
  );

-- Linha do tempo só pode ser criada pelo gatilho de mudança de status.
drop policy "Recruiters add timeline events" on public.application_events;

drop policy "Application participants read timeline" on public.application_events;
create policy "Candidates and authorized recruiters read timeline"
  on public.application_events for select to authenticated
  using (exists (
    select 1 from public.applications a
    where a.id = application_id
      and (
        a.candidate_id = (select auth.uid())
        or (
          public.is_job_company_recruiter(a.job_id)
          and a.profile_shared
          and public.has_current_privacy_consent(a.candidate_id, 'application_profile_sharing')
        )
      )
  ));

-- Feedback só pode ser escrito por recrutadores autorizados e começa privado.
drop policy "Participants read approved feedback" on public.application_feedback;
create policy "Authorized parties read feedback"
  on public.application_feedback for select to authenticated
  using (
    author_id = (select auth.uid())
    or exists (
      select 1 from public.applications a
      where a.id = application_id
        and (
          (
            public.is_job_company_recruiter(a.job_id)
            and a.profile_shared
            and public.has_current_privacy_consent(a.candidate_id, 'application_profile_sharing')
          )
          or (
            a.candidate_id = (select auth.uid())
            and visible_to_candidate
            and approved_at is not null
          )
        )
    )
  );

drop policy "Recruiters manage feedback for their applications" on public.application_feedback;
create policy "Company recruiters create private feedback"
  on public.application_feedback for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.applications a
      where a.id = application_id
        and public.is_job_company_recruiter(a.job_id)
        and a.profile_shared
        and public.has_current_privacy_consent(a.candidate_id, 'application_profile_sharing')
    )
  );
create policy "Company recruiters update feedback"
  on public.application_feedback for update to authenticated
  using (exists (
    select 1 from public.applications a
    where a.id = application_id
      and public.is_job_company_recruiter(a.job_id)
      and a.profile_shared
      and public.has_current_privacy_consent(a.candidate_id, 'application_profile_sharing')
  ))
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.applications a
      where a.id = application_id
        and public.is_job_company_recruiter(a.job_id)
        and a.profile_shared
        and public.has_current_privacy_consent(a.candidate_id, 'application_profile_sharing')
    )
  );

-- Retira permissões de tabela amplas e concede somente as colunas necessárias.
revoke insert, update, delete on public.companies from authenticated;
grant update (name, slug, description, website, industry, size_range, city, state, country, logo_url)
  on public.companies to authenticated;

revoke insert, update, delete on public.jobs from authenticated;
grant insert (
  company_id, created_by, title, description, responsibilities, requirements, benefits,
  salary_min, salary_max, salary_currency, employment_type, experience_level,
  workplace_mode, city, state, country, status, application_deadline, response_time_days
) on public.jobs to authenticated;
grant update (
  title, description, responsibilities, requirements, benefits, salary_min, salary_max,
  salary_currency, employment_type, experience_level, workplace_mode, city, state,
  country, status, application_deadline, response_time_days
) on public.jobs to authenticated;
grant delete on public.jobs to authenticated;

revoke insert, update, delete on public.job_skills from authenticated;
grant insert (job_id, skill_id, category, required, weight)
  on public.job_skills to authenticated;
grant update (skill_id, category, required, weight)
  on public.job_skills to authenticated;
grant delete on public.job_skills to authenticated;

revoke insert, update, delete on public.applications from authenticated;
grant insert (job_id, candidate_id, profile_shared, cover_note)
  on public.applications to authenticated;
grant update (status) on public.applications to authenticated;

revoke insert, update, delete on public.application_events from authenticated;

revoke insert, update, delete on public.application_feedback from authenticated;
grant insert (application_id, author_id, summary, strengths, development_areas)
  on public.application_feedback to authenticated;
grant update (summary, strengths, development_areas, visible_to_candidate)
  on public.application_feedback to authenticated;

revoke insert, update, delete on public.consent_records from authenticated;
grant execute on function public.record_privacy_consent(text, boolean) to authenticated;
grant execute on function public.has_current_privacy_consent(uuid, text) to authenticated;
grant execute on function public.is_company_recruiter(uuid) to authenticated;
grant execute on function public.is_job_company_recruiter(uuid) to authenticated;
grant execute on function public.is_company_recruiter_for_any_company(uuid) to authenticated;
grant execute on function public.is_company_verified(uuid) to anon, authenticated;

revoke all on function public.record_privacy_consent(text, boolean) from public, anon;
revoke all on function public.has_current_privacy_consent(uuid, text) from public, anon;
revoke all on function public.is_company_recruiter(uuid) from public, anon;
revoke all on function public.is_job_company_recruiter(uuid) from public, anon;
revoke all on function public.is_company_recruiter_for_any_company(uuid) from public, anon;
revoke all on function public.is_company_verified(uuid) from public;
revoke all on function public.prevent_job_reassignment() from public, anon, authenticated;
revoke all on function public.prevent_feedback_reassignment() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.set_feedback_approval_timestamp() from public, anon, authenticated;

-- Public calls can inspect only whether a company has been verified; writes remain denied.
grant execute on function public.is_company_verified(uuid) to anon, authenticated;

comment on function public.record_privacy_consent(text, boolean) is
  'Registra uma decisão explícita por finalidade com versão e horário definidos no servidor.';
comment on function public.has_current_privacy_consent(uuid, text) is
  'Verifica a última decisão de consentimento antes de expor dados de perfil.';
comment on view public.published_skill_assessments is
  'Metadados públicos de avaliações; não inclui questões nem gabaritos.';
