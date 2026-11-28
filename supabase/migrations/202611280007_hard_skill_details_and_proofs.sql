-- Armazena nível (Júnior, Pleno, Sênior), tempo de experiência, instituição emissora
-- e documento comprobatório privado para cada hard skill declarada pelo candidato.

create table public.candidate_hard_skills (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  skill_name text not null check (length(trim(skill_name)) between 1 and 120),
  proficiency text not null check (proficiency in ('junior', 'pleno', 'senior')),
  experience_months integer not null check (experience_months > 0 and experience_months <= 600),
  proof_institution text,
  proof_path text,
  proof_file_name text,
  proof_mime_type text,
  proof_size_bytes integer check (proof_size_bytes is null or (proof_size_bytes > 0 and proof_size_bytes <= 10485760)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, skill_name)
);

create index candidate_hard_skills_profile_idx on public.candidate_hard_skills(profile_id, created_at desc);

create trigger candidate_hard_skills_set_updated_at
  before update on public.candidate_hard_skills
  for each row execute procedure public.set_updated_at();

alter table public.candidate_hard_skills enable row level security;

create policy "Candidates manage own hard skill details"
  on public.candidate_hard_skills for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "Hiring teams read hard skill details with current consent"
  on public.candidate_hard_skills for select to authenticated
  using (exists (
    select 1 from public.applications a
    where a.candidate_id = profile_id
      and a.profile_shared
      and public.is_job_company_recruiter(a.job_id)
      and public.has_current_privacy_consent(profile_id, 'application_profile_sharing')
  ));

create policy "Administradores: acesso total"
  on public.candidate_hard_skills for all to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

grant select, insert, update, delete on public.candidate_hard_skills to authenticated;

-- Bucket privado para documentos comprobatórios de hard skills (PDF e imagens até 10 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'skill-proofs',
  'skill-proofs',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Candidates read own skill proofs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'skill-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Candidates upload own skill proofs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'skill-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Candidates update own skill proofs"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'skill-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'skill-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Candidates delete own skill proofs"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'skill-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Hiring teams read shared candidate skill proofs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'skill-proofs'
    and exists (
      select 1 from public.applications a
      where a.candidate_id::text = (storage.foldername(name))[1]
        and a.profile_shared
        and public.is_job_company_recruiter(a.job_id)
        and public.has_current_privacy_consent(a.candidate_id, 'application_profile_sharing')
    )
  );

create policy "Admins manage skill proofs"
  on storage.objects for all to authenticated
  using (bucket_id = 'skill-proofs' and public.is_admin((select auth.uid())))
  with check (bucket_id = 'skill-proofs' and public.is_admin((select auth.uid())));

-- Atualiza o snapshot da candidatura para incluir nível, tempo, instituição e comprovante das hard skills.
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

comment on table public.candidate_hard_skills is 'Hard skills do candidato com nível (Júnior, Pleno, Sênior), tempo de experiência, instituição e comprovante privado.';
