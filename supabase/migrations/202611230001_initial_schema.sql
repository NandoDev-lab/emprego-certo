-- Esquema inicial do Emprego Certo para Supabase/PostgreSQL.
-- Execute somente em um projeto novo ou após revisar o esquema existente.
-- As políticas de RLS limitam dados pessoais ao dono e às empresas autorizadas
-- por candidatura compartilhada. A chave service_role não deve ir para o navegador.

create extension if not exists pgcrypto;

-- Vocabulários fechados usados para validar perfis, vagas, candidaturas e avaliações.
create type public.account_role as enum ('candidate', 'recruiter', 'admin');
create type public.workplace_mode as enum ('remote', 'hybrid', 'onsite');
create type public.job_status as enum ('draft', 'published', 'paused', 'closed');
create type public.application_status as enum (
  'submitted', 'screening', 'assessment', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'
);
create type public.skill_category as enum ('hard', 'soft', 'language');

-- Perfil principal associado um a um à identidade criada pelo Supabase Auth.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.account_role not null default 'candidate',
  full_name text not null default '',
  headline text,
  city text,
  state text,
  country text not null default 'BR',
  salary_min integer check (salary_min is null or salary_min >= 0),
  salary_max integer check (salary_max is null or salary_max >= salary_min),
  workplace_preferences public.workplace_mode[] not null default '{}',
  bio text,
  profile_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Informações institucionais públicas da empresa, sem credenciais de acesso.
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  website text,
  industry text,
  size_range text,
  city text,
  state text,
  country text not null default 'BR',
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Associação de usuários a empresas e nível de permissão dentro da organização.
create table public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'recruiter' check (member_role in ('owner', 'recruiter', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (company_id, profile_id)
);

-- Catálogo normalizado de competências para evitar nomes incompatíveis entre vagas.
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category public.skill_category not null default 'hard'
);

-- Competências declaradas ou avaliadas no perfil de cada candidato.
create table public.candidate_skills (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  proficiency text check (proficiency is null or proficiency in ('beginner', 'intermediate', 'advanced', 'expert')),
  years_experience numeric(4,1) check (years_experience is null or years_experience >= 0),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (profile_id, skill_id)
);

-- Histórico profissional em registros estruturados, em vez de texto único.
create table public.candidate_experiences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  job_title text not null,
  company_name text not null,
  employment_type text,
  city text,
  started_on date,
  ended_on date,
  is_current boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  check (ended_on is null or started_on is null or ended_on >= started_on)
);

-- Formação acadêmica e cursos que compõem o perfil profissional.
create table public.candidate_educations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  institution text not null,
  degree text,
  field_of_study text,
  started_on date,
  ended_on date,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  check (ended_on is null or started_on is null or ended_on >= started_on)
);

-- Definição versionada das avaliações publicadas para uma competência e nível.
create table public.skill_assessments (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete restrict,
  title text not null,
  level text not null,
  version integer not null default 1,
  questions jsonb not null default '[]'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (skill_id, level, version)
);

-- Tentativas pessoais. A coluna is_proctored indica se houve supervisão verificável.
create table public.skill_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  assessment_id uuid not null references public.skill_assessments(id) on delete restrict,
  score numeric(5,2) check (score is null or score between 0 and 100),
  answers jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  is_proctored boolean not null default false,
  created_at timestamptz not null default now()
);

-- Registro histórico e não sobrescrito do consentimento por finalidade e versão.
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  purpose text not null,
  policy_version text not null,
  granted boolean not null,
  recorded_at timestamptz not null default now()
);

-- Vagas estruturadas. Uma faixa salarial explícita é obrigatória para publicar.
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  title text not null,
  description text not null,
  responsibilities text,
  requirements text,
  benefits text,
  salary_min integer not null check (salary_min >= 0),
  salary_max integer not null check (salary_max >= salary_min),
  salary_currency char(3) not null default 'BRL',
  employment_type text not null default 'full_time',
  experience_level text,
  workplace_mode public.workplace_mode not null,
  city text,
  state text,
  country text not null default 'BR',
  status public.job_status not null default 'draft',
  application_deadline timestamptz,
  response_time_days integer check (response_time_days is null or response_time_days > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  closed_at timestamptz,
  check (status <> 'published' or (salary_min is not null and salary_max is not null))
);

-- Relação de vagas guardadas pelo candidato para consulta posterior.
create table public.saved_jobs (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, job_id)
);

-- Competências exigidas ou desejáveis e seus pesos configuráveis para a vaga.
create table public.job_skills (
  job_id uuid not null references public.jobs(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete restrict,
  category public.skill_category not null default 'hard',
  required boolean not null default true,
  weight numeric(4,2) not null default 1 check (weight > 0 and weight <= 10),
  primary key (job_id, skill_id)
);

-- Uma candidatura por candidato e vaga; profile_shared registra consentimento.
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  status public.application_status not null default 'submitted',
  profile_shared boolean not null default false,
  cover_note text,
  resume_url text,
  match_score numeric(5,2) check (match_score is null or match_score between 0 and 100),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, candidate_id)
);

-- Linha do tempo imutável das transições de etapa do processo seletivo.
create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  status public.application_status not null,
  note text,
  created_at timestamptz not null default now()
);

-- Registra no histórico toda inscrição e toda mudança de etapa sem depender
-- de o navegador inserir manualmente o evento de auditoria.
create or replace function public.record_application_status_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.application_events (application_id, actor_id, status)
    values (new.id, (select auth.uid()), new.status);
  elsif new.status is distinct from old.status then
    insert into public.application_events (application_id, actor_id, status)
    values (new.id, (select auth.uid()), new.status);
  end if;
  return new;
end;
$$;
comment on function public.record_application_status_event() is 'Insere evento de auditoria quando a candidatura é criada ou muda de etapa.';

create trigger applications_status_timeline
  after insert or update of status on public.applications
  for each row execute procedure public.record_application_status_event();

-- Feedback separado da etapa, visível ao candidato só após aprovação explícita.
create table public.application_feedback (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  summary text not null,
  strengths text,
  development_areas text,
  visible_to_candidate boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_public_search_idx on public.jobs(status, workplace_mode, country, published_at desc);
create index jobs_company_idx on public.jobs(company_id, status, created_at desc);
create index applications_candidate_idx on public.applications(candidate_id, submitted_at desc);
create index applications_job_idx on public.applications(job_id, status, submitted_at desc);
create index applications_shared_candidate_idx on public.applications(candidate_id, profile_shared) where profile_shared;
create index application_events_application_idx on public.application_events(application_id, created_at);
create index candidate_skills_skill_idx on public.candidate_skills(skill_id);
create index job_skills_skill_idx on public.job_skills(skill_id);
create index candidate_experiences_profile_idx on public.candidate_experiences(profile_id, started_on desc);
create index candidate_educations_profile_idx on public.candidate_educations(profile_id, started_on desc);
create index saved_jobs_profile_idx on public.saved_jobs(profile_id, created_at desc);
create index assessment_attempts_profile_idx on public.skill_assessment_attempts(profile_id, created_at desc);
create index consent_records_profile_idx on public.consent_records(profile_id, recorded_at desc);

-- Metadados em português ficam disponíveis diretamente no catálogo PostgreSQL.
comment on table public.profiles is 'Dados profissionais e preferências do usuário autenticado.';
comment on column public.profiles.profile_visible is 'Consentimento de descoberta do perfil por equipes de recrutamento; começa desativado.';
comment on table public.companies is 'Perfil institucional público de uma empresa.';
comment on table public.company_members is 'Usuários vinculados à empresa e permissões de recrutamento.';
comment on table public.skills is 'Catálogo de competências técnicas, comportamentais e idiomas.';
comment on table public.candidate_skills is 'Competências e nível de proficiência declarado ou avaliado.';
comment on table public.candidate_experiences is 'Experiências profissionais estruturadas do candidato.';
comment on table public.candidate_educations is 'Formações acadêmicas e cursos do candidato.';
comment on table public.saved_jobs is 'Vagas guardadas por um candidato.';
comment on table public.skill_assessments is 'Avaliações versionadas de competências.';
comment on table public.skill_assessment_attempts is 'Resultados pessoais de tentativas de avaliação.';
comment on table public.consent_records is 'Histórico de consentimentos e revogações por finalidade.';
comment on table public.jobs is 'Oportunidades de emprego publicadas ou em elaboração.';
comment on table public.job_skills is 'Critérios de competência e pesos associados a cada vaga.';
comment on table public.applications is 'Inscrições de candidatos em vagas; cada perfil é compartilhado por consentimento explícito.';
comment on column public.applications.profile_shared is 'Consentimento para compartilhar o perfil com a empresa desta candidatura.';
comment on column public.applications.match_score is 'Pontuação calculada pelo servidor; não deve ser enviada pelo navegador.';
comment on table public.application_events is 'Histórico de alterações de etapa de uma candidatura.';
comment on table public.application_feedback is 'Devolutiva revisada da empresa para uma candidatura.';

-- Funções SECURITY DEFINER encapsulam verificações de associação sem criar
-- recursão nas políticas de RLS das próprias tabelas de associação.
create or replace function public.is_company_member(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_members cm
    where cm.company_id = target_company and cm.profile_id = (select auth.uid())
  );
$$;
comment on function public.is_company_member(uuid) is 'Verifica a associação do usuário autenticado à empresa informada.';

create or replace function public.is_company_owner(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_members cm
    where cm.company_id = target_company
      and cm.profile_id = (select auth.uid())
      and cm.member_role = 'owner'
  );
$$;
comment on function public.is_company_owner(uuid) is 'Verifica se o usuário autenticado é proprietário da empresa informada.';

create or replace function public.create_company(company_name text, company_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_company_id uuid;
  current_profile_id uuid := (select auth.uid());
begin
  if current_profile_id is null then
    raise exception 'Authentication required';
  end if;
  if length(trim(company_name)) < 2 or length(trim(company_slug)) < 2 then
    raise exception 'Company name and slug are required';
  end if;
  if lower(trim(company_slug)) !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Company slug must contain lowercase letters, numbers, and single hyphens';
  end if;
  insert into public.companies (name, slug)
  values (trim(company_name), lower(trim(company_slug)))
  returning id into new_company_id;
  insert into public.company_members (company_id, profile_id, member_role)
  values (new_company_id, current_profile_id, 'owner');
  return new_company_id;
end;
$$;
comment on function public.create_company(text, text) is 'Cria empresa e associa atomicamente o usuário atual como proprietário.';

create or replace function public.prevent_application_reassignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.job_id is distinct from old.job_id
    or new.candidate_id is distinct from old.candidate_id
    or new.submitted_at is distinct from old.submitted_at then
    raise exception 'Application identity and submission date cannot be changed';
  end if;
  return new;
end;
$$;
comment on function public.prevent_application_reassignment() is 'Impede que vaga, candidato ou data original da inscrição sejam alterados.';

create trigger applications_immutable_identity
  before update on public.applications
  for each row execute procedure public.prevent_application_reassignment();

create or replace function public.is_job_company_member(target_job uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.jobs j
    join public.company_members cm on cm.company_id = j.company_id
    where j.id = target_job and cm.profile_id = (select auth.uid())
  );
$$;
comment on function public.is_job_company_member(uuid) is 'Verifica se o usuário autenticado pertence à empresa responsável pela vaga.';

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
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'role' = 'recruiter' then 'recruiter'::public.account_role else 'candidate'::public.account_role end
  );
  return new;
end;
$$;
comment on function public.create_profile_for_new_user() is 'Cria perfil privado ao criar uma identidade no Supabase Auth.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

-- RLS precisa permanecer habilitado em toda tabela com dados pessoais ou seletivos.
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.skills enable row level security;
alter table public.candidate_skills enable row level security;
alter table public.candidate_experiences enable row level security;
alter table public.candidate_educations enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.skill_assessments enable row level security;
alter table public.skill_assessment_attempts enable row level security;
alter table public.consent_records enable row level security;
alter table public.jobs enable row level security;
alter table public.job_skills enable row level security;
alter table public.applications enable row level security;
alter table public.application_events enable row level security;
alter table public.application_feedback enable row level security;

-- Perfis ficam privados por padrão; recrutadores veem perfis públicos ou
-- candidatos que autorizaram compartilhar seus dados naquela candidatura.
create policy "Profiles visible to owner or opted-in recruiters"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (profile_visible and exists (
      select 1 from public.company_members cm
      where cm.profile_id = (select auth.uid()) and cm.member_role in ('owner', 'recruiter')
    ))
    or exists (
      select 1 from public.applications a
      where a.candidate_id = profiles.id and a.profile_shared and public.is_job_company_member(a.job_id)
    )
  );
create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Dados institucionais e vagas publicadas podem ser consultados sem login.
create policy "Companies are publicly readable"
  on public.companies for select to anon, authenticated using (true);
create policy "Company members manage their company"
  on public.companies for all to authenticated
  using (public.is_company_member(id)) with check (public.is_company_member(id));
create policy "Members can read company membership"
  on public.company_members for select to authenticated
  using (profile_id = (select auth.uid()) or public.is_company_member(company_id));
create policy "Company owners manage membership"
  on public.company_members for all to authenticated
  using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

-- O candidato controla seus próprios dados; a equipe só lê competências,
-- experiência e formação de quem compartilhou o perfil em uma candidatura.
create policy "Skills are publicly readable"
  on public.skills for select to anon, authenticated using (true);
create policy "Candidates manage own skills"
  on public.candidate_skills for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "Hiring teams read skills shared in applications"
  on public.candidate_skills for select to authenticated
  using (exists (select 1 from public.applications a where a.candidate_id = profile_id and a.profile_shared and public.is_job_company_member(a.job_id)));
create policy "Candidates manage own experience"
  on public.candidate_experiences for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "Hiring teams read shared experience"
  on public.candidate_experiences for select to authenticated
  using (exists (select 1 from public.applications a where a.candidate_id = profile_id and a.profile_shared and public.is_job_company_member(a.job_id)));
create policy "Candidates manage own education"
  on public.candidate_educations for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "Hiring teams read shared education"
  on public.candidate_educations for select to authenticated
  using (exists (select 1 from public.applications a where a.candidate_id = profile_id and a.profile_shared and public.is_job_company_member(a.job_id)));
create policy "Candidates manage own saved jobs"
  on public.saved_jobs for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "Published assessments are readable"
  on public.skill_assessments for select to anon, authenticated using (is_published);
create policy "Candidates read own assessment attempts"
  on public.skill_assessment_attempts for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "Candidates submit own assessment attempts"
  on public.skill_assessment_attempts for insert to authenticated
  with check (profile_id = (select auth.uid()));
create policy "Candidates read own consent history"
  on public.consent_records for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "Candidates record own consent changes"
  on public.consent_records for insert to authenticated
  with check (profile_id = (select auth.uid()));

-- Rascunhos de vaga são privados. Membros da empresa gerenciam suas vagas e critérios.
create policy "Published jobs are publicly readable"
  on public.jobs for select to anon, authenticated
  using (status = 'published' or public.is_company_member(company_id));
create policy "Company members manage jobs"
  on public.jobs for all to authenticated
  using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "Job skills are readable with the job"
  on public.job_skills for select to anon, authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and (j.status = 'published' or public.is_company_member(j.company_id))));
create policy "Company members manage job skills"
  on public.job_skills for all to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and public.is_company_member(j.company_id)))
  with check (exists (select 1 from public.jobs j where j.id = job_id and public.is_company_member(j.company_id)));

-- Cada candidatura é acessível ao candidato e à equipe da vaga; a inscrição
-- exige compartilhamento explícito do perfil e vaga publicada.
create policy "Candidates read own applications and recruiters read job applications"
  on public.applications for select to authenticated
  using (candidate_id = (select auth.uid()) or public.is_job_company_member(job_id));
create policy "Candidates apply to published jobs"
  on public.applications for insert to authenticated
  with check (
    candidate_id = (select auth.uid())
    and status = 'submitted'
    and profile_shared
    and match_score is null
    and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'published')
  );
create policy "Candidates or recruiters update application"
  on public.applications for update to authenticated
  using (candidate_id = (select auth.uid()) or public.is_job_company_member(job_id))
  with check (
    (candidate_id = (select auth.uid()) and status = 'withdrawn')
    or public.is_job_company_member(job_id)
  );

-- O candidato acompanha a linha do tempo; recrutadores da vaga registram mudanças.
create policy "Application participants read timeline"
  on public.application_events for select to authenticated
  using (exists (
    select 1 from public.applications a
    where a.id = application_id and (a.candidate_id = (select auth.uid()) or public.is_job_company_member(a.job_id))
  ));
create policy "Recruiters add timeline events"
  on public.application_events for insert to authenticated
  with check (actor_id = (select auth.uid()) and exists (
    select 1 from public.applications a where a.id = application_id and public.is_job_company_member(a.job_id)
  ));

-- O feedback só aparece ao candidato quando a empresa o marcou como aprovado.
create policy "Participants read approved feedback"
  on public.application_feedback for select to authenticated
  using (author_id = (select auth.uid()) or exists (
    select 1 from public.applications a
    where a.id = application_id and (
      public.is_job_company_member(a.job_id)
      or (a.candidate_id = (select auth.uid()) and visible_to_candidate and approved_at is not null)
    )
  ));
create policy "Recruiters manage feedback for their applications"
  on public.application_feedback for all to authenticated
  using (public.is_job_company_member((select a.job_id from public.applications a where a.id = application_id)))
  with check (author_id = (select auth.uid()) and public.is_job_company_member((select a.job_id from public.applications a where a.id = application_id)));

grant usage on schema public to anon, authenticated;
revoke all on function public.is_company_member(uuid) from public, anon;
revoke all on function public.is_company_owner(uuid) from public, anon;
revoke all on function public.is_job_company_member(uuid) from public, anon;
revoke all on function public.create_company(text, text) from public, anon;
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.is_company_owner(uuid) to authenticated;
grant execute on function public.is_job_company_member(uuid) to authenticated;
grant execute on function public.create_company(text, text) to authenticated;
grant select on public.companies, public.skills to anon, authenticated;
grant select on public.jobs, public.job_skills to anon, authenticated;
grant select on public.skill_assessments to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, headline, city, state, country, salary_min, salary_max, workplace_preferences, bio, profile_visible) on public.profiles to authenticated;
grant select, insert, update, delete on public.company_members, public.candidate_skills, public.candidate_experiences, public.candidate_educations, public.saved_jobs to authenticated;
grant select, insert on public.skill_assessment_attempts, public.consent_records to authenticated;
grant select, insert, update, delete on public.companies, public.jobs, public.job_skills to authenticated;
grant select, insert, update on public.applications to authenticated;
grant select, insert on public.application_events to authenticated;
grant select, insert, update, delete on public.application_feedback to authenticated;
