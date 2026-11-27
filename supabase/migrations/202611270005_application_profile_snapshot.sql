alter table public.profiles add column declared_skills text[] not null default '{}'::text[];
alter table public.profiles add constraint profiles_declared_skills_limit check (cardinality(declared_skills) <= 50);
grant update (declared_skills) on public.profiles to authenticated;

alter table public.applications add column candidate_snapshot jsonb;

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
        'salaryMonthly', p.salary_monthly,
        'bio', p.bio,
        'skills', p.declared_skills,
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

create trigger applications_candidate_snapshot
  before insert or update on public.applications
  for each row execute procedure public.capture_application_candidate_snapshot();

revoke all on function public.capture_application_candidate_snapshot() from public, anon, authenticated;
grant insert (application_id, author_id, summary, strengths, development_areas, visible_to_candidate)
  on public.application_feedback to authenticated;
comment on column public.applications.candidate_snapshot is 'Cópia imutável dos campos básicos compartilhados no momento da candidatura; acesso condicionado a RLS e consentimento vigente.';
