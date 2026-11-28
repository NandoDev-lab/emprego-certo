-- Amplia o perfil do candidato com graduações/cursos/certificações especiais (com PDF opcional),
-- idiomas, intercâmbios e vivências no exterior, disponibilidade para viagens, informações opcionais
-- sobre família, habilitação (CNH e outras) e deficiências (PCD) / necessidades de adaptação (LGPD).

-- 1) Enriquecimento de public.candidate_educations para graduações, cursos e certificações especiais.
alter table public.candidate_educations
  add column if not exists category text not null default 'graduacao',
  add column if not exists workload_hours integer,
  add column if not exists credential_code text,
  add column if not exists expires_on date,
  add column if not exists description text,
  add column if not exists proof_path text,
  add column if not exists proof_file_name text,
  add column if not exists proof_mime_type text,
  add column if not exists proof_size_bytes integer;

alter table public.candidate_educations
  drop constraint if exists candidate_educations_category_valid,
  drop constraint if exists candidate_educations_workload_valid,
  drop constraint if exists candidate_educations_proof_size_valid,
  drop constraint if exists candidate_educations_proof_pdf_only;

alter table public.candidate_educations
  add constraint candidate_educations_category_valid
    check (category in ('graduacao', 'pos_graduacao', 'tecnico', 'curso', 'certificacao_especial')),
  add constraint candidate_educations_workload_valid
    check (workload_hours is null or (workload_hours > 0 and workload_hours <= 20000)),
  add constraint candidate_educations_proof_size_valid
    check (proof_size_bytes is null or (proof_size_bytes > 0 and proof_size_bytes <= 10485760)),
  add constraint candidate_educations_proof_pdf_only
    check (
      (proof_mime_type is null or proof_mime_type = 'application/pdf')
      and (proof_file_name is null or lower(proof_file_name) like '%.pdf')
      and (proof_path is null or lower(proof_path) like '%.pdf')
    );

-- 2) Tabela de idiomas do candidato.
create table if not exists public.candidate_languages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  language text not null check (length(trim(language)) between 1 and 80),
  proficiency text not null check (proficiency in ('basico', 'intermediario', 'avancado', 'fluente', 'nativo')),
  certification text,
  proof_path text,
  proof_file_name text,
  proof_mime_type text,
  proof_size_bytes integer check (proof_size_bytes is null or (proof_size_bytes > 0 and proof_size_bytes <= 10485760)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, language),
  constraint candidate_languages_proof_pdf_only check (
    (proof_mime_type is null or proof_mime_type = 'application/pdf')
    and (proof_file_name is null or lower(proof_file_name) like '%.pdf')
    and (proof_path is null or lower(proof_path) like '%.pdf')
  )
);

create index if not exists candidate_languages_profile_idx on public.candidate_languages(profile_id, created_at desc);

drop trigger if exists candidate_languages_set_updated_at on public.candidate_languages;
create trigger candidate_languages_set_updated_at
  before update on public.candidate_languages
  for each row execute procedure public.set_updated_at();

alter table public.candidate_languages enable row level security;

drop policy if exists "Candidates manage own languages" on public.candidate_languages;
create policy "Candidates manage own languages"
  on public.candidate_languages for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "Hiring teams read languages with current consent" on public.candidate_languages;
create policy "Hiring teams read languages with current consent"
  on public.candidate_languages for select to authenticated
  using (exists (
    select 1 from public.applications a
    where a.candidate_id = profile_id
      and a.profile_shared
      and public.is_job_company_recruiter(a.job_id)
      and public.has_current_privacy_consent(profile_id, 'application_profile_sharing')
  ));

drop policy if exists "Administradores: acesso total" on public.candidate_languages;
create policy "Administradores: acesso total"
  on public.candidate_languages for all to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

grant select, insert, update, delete on public.candidate_languages to authenticated;

-- 3) Tabela de intercâmbios e vivências no exterior.
create table if not exists public.candidate_international_experiences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  experience_type text not null check (experience_type in ('intercambio_academico', 'intercambio_idiomas', 'trabalho_exterior', 'voluntariado', 'residencia_exterior', 'outro')),
  country text not null check (length(trim(country)) between 2 and 100),
  city text,
  institution_or_company text,
  started_on date,
  ended_on date,
  is_current boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_on is null or started_on is null or ended_on >= started_on)
);

create index if not exists candidate_international_profile_idx
  on public.candidate_international_experiences(profile_id, started_on desc);

drop trigger if exists candidate_international_set_updated_at on public.candidate_international_experiences;
create trigger candidate_international_set_updated_at
  before update on public.candidate_international_experiences
  for each row execute procedure public.set_updated_at();

alter table public.candidate_international_experiences enable row level security;

drop policy if exists "Candidates manage own international experiences" on public.candidate_international_experiences;
create policy "Candidates manage own international experiences"
  on public.candidate_international_experiences for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "Hiring teams read international experiences with current consent" on public.candidate_international_experiences;
create policy "Hiring teams read international experiences with current consent"
  on public.candidate_international_experiences for select to authenticated
  using (exists (
    select 1 from public.applications a
    where a.candidate_id = profile_id
      and a.profile_shared
      and public.is_job_company_recruiter(a.job_id)
      and public.has_current_privacy_consent(profile_id, 'application_profile_sharing')
  ));

drop policy if exists "Administradores: acesso total" on public.candidate_international_experiences;
create policy "Administradores: acesso total"
  on public.candidate_international_experiences for all to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

grant select, insert, update, delete on public.candidate_international_experiences to authenticated;

-- 4) Colunas adicionais em public.profiles: viagens, família (opcional), habilitação e PCD/adaptação (LGPD).
alter table public.profiles
  add column if not exists travel_availability text,
  add column if not exists relocation_availability boolean not null default false,
  add column if not exists travel_notes text,
  add column if not exists marital_status text,
  add column if not exists has_children boolean,
  add column if not exists children_count integer,
  add column if not exists family_notes text,
  add column if not exists cnh_categories text[] not null default '{}'::text[],
  add column if not exists cnh_ear boolean not null default false,
  add column if not exists has_own_vehicle boolean not null default false,
  add column if not exists other_licenses text[] not null default '{}'::text[],
  add column if not exists is_pcd boolean,
  add column if not exists pcd_types text[] not null default '{}'::text[],
  add column if not exists pcd_cid text,
  add column if not exists accessibility_needs text,
  add column if not exists pcd_proof_path text,
  add column if not exists pcd_proof_file_name text,
  add column if not exists pcd_proof_mime_type text,
  add column if not exists pcd_proof_size_bytes integer,
  add column if not exists share_sensitive_in_applications boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_travel_availability_valid,
  drop constraint if exists profiles_marital_status_valid,
  drop constraint if exists profiles_children_count_valid,
  drop constraint if exists profiles_cnh_categories_limit,
  drop constraint if exists profiles_other_licenses_limit,
  drop constraint if exists profiles_pcd_types_limit,
  drop constraint if exists profiles_pcd_proof_size_valid,
  drop constraint if exists profiles_pcd_proof_pdf_only;

alter table public.profiles
  add constraint profiles_travel_availability_valid
    check (travel_availability is null or travel_availability in ('nao_disponivel', 'eventual', 'frequente', 'total')),
  add constraint profiles_marital_status_valid
    check (marital_status is null or marital_status in ('nao_informar', 'solteiro', 'casado', 'uniao_estavel', 'divorciado', 'viuvo')),
  add constraint profiles_children_count_valid
    check (children_count is null or (children_count >= 0 and children_count <= 20)),
  add constraint profiles_cnh_categories_limit
    check (cardinality(cnh_categories) <= 10),
  add constraint profiles_other_licenses_limit
    check (cardinality(other_licenses) <= 30),
  add constraint profiles_pcd_types_limit
    check (cardinality(pcd_types) <= 10),
  add constraint profiles_pcd_proof_size_valid
    check (pcd_proof_size_bytes is null or (pcd_proof_size_bytes > 0 and pcd_proof_size_bytes <= 10485760)),
  add constraint profiles_pcd_proof_pdf_only
    check (
      (pcd_proof_mime_type is null or pcd_proof_mime_type = 'application/pdf')
      and (pcd_proof_file_name is null or lower(pcd_proof_file_name) like '%.pdf')
      and (pcd_proof_path is null or lower(pcd_proof_path) like '%.pdf')
    );

grant update (
  travel_availability, relocation_availability, travel_notes,
  marital_status, has_children, children_count, family_notes,
  cnh_categories, cnh_ear, has_own_vehicle, other_licenses,
  is_pcd, pcd_types, pcd_cid, accessibility_needs,
  pcd_proof_path, pcd_proof_file_name, pcd_proof_mime_type, pcd_proof_size_bytes,
  share_sensitive_in_applications
) on public.profiles to authenticated;

-- 5) Atualiza snapshot da candidatura para incluir as novas informações profissionais
--    e compartilhar dados sensíveis de PCD/adaptação apenas quando explicitamente autorizado.
create or replace function public.capture_application_candidate_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.profile_shared then
      if not public.has_current_privacy_consent(new.candidate_id, 'application_profile_sharing') then
        raise exception 'Current application profile sharing consent is required';
      end if;
      select jsonb_build_object(
        'name', p.full_name,
        'role', p.headline,
        'city', p.city,
        'state', p.state,
        'salaryMonthly', p.salary_monthly,
        'bio', p.bio,
        'skills', p.declared_skills,
        'softSkills', p.declared_soft_skills,
        'hardSkillDetails', coalesce((
          select jsonb_agg(jsonb_build_object(
            'skillName', hs.skill_name,
            'proficiency', hs.proficiency,
            'experienceMonths', hs.experience_months,
            'proofInstitution', hs.proof_institution,
            'proofFileName', hs.proof_file_name,
            'proofPath', hs.proof_path
          ) order by hs.created_at desc)
          from public.candidate_hard_skills hs
          where hs.profile_id = p.id
        ), '[]'::jsonb),
        'educations', coalesce((
          select jsonb_agg(jsonb_build_object(
            'category', e.category,
            'institution', e.institution,
            'degree', e.degree,
            'fieldOfStudy', e.field_of_study,
            'startedOn', e.started_on,
            'endedOn', e.ended_on,
            'isCurrent', e.is_current,
            'workloadHours', e.workload_hours,
            'credentialCode', e.credential_code,
            'expiresOn', e.expires_on,
            'proofFileName', e.proof_file_name,
            'proofPath', e.proof_path
          ) order by e.is_current desc, e.started_on desc nulls last)
          from public.candidate_educations e
          where e.profile_id = p.id
        ), '[]'::jsonb),
        'languages', coalesce((
          select jsonb_agg(jsonb_build_object(
            'language', l.language,
            'proficiency', l.proficiency,
            'certification', l.certification,
            'proofFileName', l.proof_file_name,
            'proofPath', l.proof_path
          ) order by l.created_at desc)
          from public.candidate_languages l
          where l.profile_id = p.id
        ), '[]'::jsonb),
        'internationalExperiences', coalesce((
          select jsonb_agg(jsonb_build_object(
            'experienceType', ie.experience_type,
            'country', ie.country,
            'city', ie.city,
            'institutionOrCompany', ie.institution_or_company,
            'startedOn', ie.started_on,
            'endedOn', ie.ended_on,
            'isCurrent', ie.is_current,
            'description', ie.description
          ) order by ie.is_current desc, ie.started_on desc nulls last)
          from public.candidate_international_experiences ie
          where ie.profile_id = p.id
        ), '[]'::jsonb),
        'travelAvailability', p.travel_availability,
        'relocationAvailability', p.relocation_availability,
        'travelNotes', p.travel_notes,
        'cnhCategories', p.cnh_categories,
        'cnhEar', p.cnh_ear,
        'hasOwnVehicle', p.has_own_vehicle,
        'otherLicenses', p.other_licenses,
        'maritalStatus', case when p.marital_status is not null and p.marital_status <> 'nao_informar' then p.marital_status else null end,
        'hasChildren', p.has_children,
        'childrenCount', p.children_count,
        'familyNotes', p.family_notes,
        'shareSensitiveInApplications', p.share_sensitive_in_applications,
        'isPcd', case when p.share_sensitive_in_applications then p.is_pcd else null end,
        'pcdTypes', case when p.share_sensitive_in_applications then p.pcd_types else '{}'::text[] end,
        'pcdCid', case when p.share_sensitive_in_applications then p.pcd_cid else null end,
        'accessibilityNeeds', case when p.share_sensitive_in_applications then p.accessibility_needs else null end,
        'pcdProofFileName', case when p.share_sensitive_in_applications then p.pcd_proof_file_name else null end,
        'pcdProofPath', case when p.share_sensitive_in_applications then p.pcd_proof_path else null end,
        'visible', p.profile_visible
      ) into new.candidate_snapshot
      from public.profiles p where p.id = new.candidate_id;
    else
      new.candidate_snapshot := null;
    end if;
  elsif new.candidate_snapshot is distinct from old.candidate_snapshot then
    raise exception 'Application profile snapshot cannot be changed';
  end if;
  return new;
end;
$$;

revoke all on function public.capture_application_candidate_snapshot() from public, anon, authenticated;

comment on table public.candidate_languages is 'Idiomas declarados pelo candidato com nível, certificação e comprovante opcional apenas em PDF.';
comment on table public.candidate_international_experiences is 'Intercâmbios e vivências internacionais do candidato.';
comment on column public.profiles.is_pcd is 'Dado sensível opcional (LGPD): indica se o candidato se declara pessoa com deficiência.';
comment on column public.profiles.accessibility_needs is 'Dado sensível opcional (LGPD): necessidades de adaptação ou acessibilidade para entrevistas e ambiente de trabalho.';
comment on column public.profiles.share_sensitive_in_applications is 'Controle granular do candidato para incluir ou omitir dados sensíveis de PCD/adaptação no snapshot de candidaturas.';
