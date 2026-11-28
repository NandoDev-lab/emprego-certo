-- Adiciona critérios objetivos de match 100% entre perfil do candidato e vaga da empresa:
-- hard/soft skills, horário, formato de contratação, formato de escala e distância
-- para vagas presenciais em local fixo.

alter table public.profiles
  add column declared_soft_skills text[] not null default '{}'::text[],
  add column work_schedules text[] not null default '{}'::text[],
  add column contract_types text[] not null default '{}'::text[],
  add column work_shifts text[] not null default '{}'::text[],
  add column max_distance_km integer,
  add column latitude double precision,
  add column longitude double precision,
  add constraint profiles_declared_soft_skills_limit check (cardinality(declared_soft_skills) <= 50),
  add constraint profiles_max_distance_km_valid check (max_distance_km is null or (max_distance_km > 0 and max_distance_km <= 500)),
  add constraint profiles_latitude_valid check (latitude is null or (latitude >= -90 and latitude <= 90)),
  add constraint profiles_longitude_valid check (longitude is null or (longitude >= -180 and longitude <= 180));

alter table public.jobs
  add column soft_skills text[] not null default '{}'::text[],
  add column work_schedule text not null default 'Comercial',
  add column work_shift text not null default '5x2',
  add column is_fixed_location boolean not null default true,
  add column latitude double precision,
  add column longitude double precision,
  add constraint jobs_soft_skills_limit check (cardinality(soft_skills) <= 50),
  add constraint jobs_latitude_valid check (latitude is null or (latitude >= -90 and latitude <= 90)),
  add constraint jobs_longitude_valid check (longitude is null or (longitude >= -180 and longitude <= 180));

grant update (
  declared_soft_skills, work_schedules, contract_types, work_shifts,
  max_distance_km, latitude, longitude
) on public.profiles to authenticated;

grant insert (
  soft_skills, work_schedule, work_shift, is_fixed_location, latitude, longitude
) on public.jobs to authenticated;

grant update (
  soft_skills, work_schedule, work_shift, is_fixed_location, latitude, longitude
) on public.jobs to authenticated;

-- Inclui soft skills declaradas na cópia instantânea (snapshot) enviada na candidatura.
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

comment on column public.profiles.declared_soft_skills is 'Soft skills declaradas pelo candidato para comparação exata no match.';
comment on column public.profiles.work_schedules is 'Horários de trabalho aceitos pelo candidato.';
comment on column public.profiles.contract_types is 'Formatos de contratação aceitos pelo candidato (CLT, PJ, Estágio etc.).';
comment on column public.profiles.work_shifts is 'Formatos de escala aceitos pelo candidato (5x2, 6x1, 12x36 etc.).';
comment on column public.profiles.max_distance_km is 'Distância máxima em km aceita para vagas presenciais em local fixo.';
comment on column public.jobs.soft_skills is 'Soft skills exigidas pela vaga para match 100%.';
comment on column public.jobs.work_schedule is 'Horário de trabalho definido para a vaga.';
comment on column public.jobs.work_shift is 'Escala de trabalho definida para a vaga.';
comment on column public.jobs.is_fixed_location is 'Indica se a vaga presencial ocorre em local fixo sujeito a verificação de distância.';
