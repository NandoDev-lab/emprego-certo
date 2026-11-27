-- Testes comportamentais das políticas RLS usando identidades descartáveis.
-- Os dados são revertidos ao final e nunca representam pessoas reais.
begin;

select plan(13);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111101', 'lgpd-candidato@example.invalid', '{"full_name":"Candidato teste","role":"recruiter"}'::jsonb),
  ('11111111-1111-4111-8111-111111111102', 'lgpd-recrutador@example.invalid', '{"full_name":"Recrutador teste"}'::jsonb),
  ('11111111-1111-4111-8111-111111111103', 'lgpd-leitor@example.invalid', '{"full_name":"Leitor teste"}'::jsonb);

select is(
  (select role::text from public.profiles where id = '11111111-1111-4111-8111-111111111101'),
  'candidate',
  'metadados de cadastro não promovem candidato a recrutador'
);

update public.profiles set profile_visible = true
where id = '11111111-1111-4111-8111-111111111101';

insert into public.companies (id, name, slug, verified_at)
values
  ('22222222-2222-4222-8222-222222222201', 'Empresa verificada de teste', 'empresa-verificada-teste', now()),
  ('22222222-2222-4222-8222-222222222202', 'Empresa não verificada de teste', 'empresa-pendente-teste', null);

insert into public.company_members (company_id, profile_id, member_role)
values
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111102', 'recruiter'),
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111103', 'viewer');

insert into public.jobs (id, company_id, created_by, title, description, salary_monthly, workplace_mode, status)
values
  ('33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111102', 'Vaga de teste', 'Descrição de teste', 1500, 'remote', 'published'),
  ('33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111102', 'Vaga pendente de teste', 'Descrição de teste', 1750, 'remote', 'published');

insert into public.consent_records (profile_id, purpose, policy_version, granted, recorded_at)
values
  ('11111111-1111-4111-8111-111111111101', 'profile_discovery', 'teste-v1', true, now() - interval '2 minutes'),
  ('11111111-1111-4111-8111-111111111101', 'profile_discovery', 'teste-v1', false, now() - interval '1 minute'),
  ('11111111-1111-4111-8111-111111111101', 'application_profile_sharing', 'teste-v1', true, now() - interval '2 minutes');

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111101', true);
insert into public.applications (id, job_id, candidate_id, status, profile_shared)
values ('44444444-4444-4444-8444-444444444401', '33333333-3333-4333-8333-333333333301', '11111111-1111-4111-8111-111111111101', 'submitted', true);
select is((select candidate_snapshot ->> 'name' from public.applications where id='44444444-4444-4444-8444-444444444401'),'Candidato teste','cópia do perfil é capturada no envio com consentimento vigente');
select is(jsonb_typeof((select candidate_snapshot -> 'skills' from public.applications where id='44444444-4444-4444-8444-444444444401')),'array','snapshot não perde lista declarada de competências');

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111101', true);
set local role authenticated;
select is((select count(*)::integer from public.profiles), 1, 'candidato autenticado lê apenas o próprio perfil após revogação');
select is((select count(*)::integer from public.applications), 1, 'candidato continua lendo a própria candidatura');
reset role;

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111102', true);
set local role authenticated;
select is((select count(*)::integer from public.profiles where id = '11111111-1111-4111-8111-111111111101'), 1, 'compartilhamento específico da candidatura é independente da descoberta geral');
select is((select count(*)::integer from public.applications), 1, 'consentimento vigente permite à equipe consultar a candidatura');
reset role;

insert into public.consent_records (profile_id, purpose, policy_version, granted, recorded_at)
values ('11111111-1111-4111-8111-111111111101', 'application_profile_sharing', 'teste-v1', false, now());
set local role authenticated;
select is((select count(*)::integer from public.applications), 0, 'revogação do compartilhamento oculta a candidatura da equipe');
select is((select count(*)::integer from public.profiles where id = '11111111-1111-4111-8111-111111111101'), 0, 'revogação da candidatura também oculta o perfil da equipe');
reset role;

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111103', true);
set local role authenticated;
select is((select count(*)::integer from public.jobs where id = '33333333-3333-4333-8333-333333333301'), 1, 'membro leitor consulta vaga publicada verificada');
select throws_ok(
  $$insert into public.jobs (company_id, created_by, title, description, salary_monthly, workplace_mode)
    values ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111103', 'Vaga indevida', 'Teste', 1000, 'remote')$$,
  '42501', null, 'membro leitor não publica nem cria vaga'
);
reset role;

set local role anon;
select is((select count(*)::integer from public.companies where id = '22222222-2222-4222-8222-222222222202'), 0, 'empresa pendente não aparece para visitante anônimo');
select is((select count(*)::integer from public.jobs where id = '33333333-3333-4333-8333-333333333302'), 0, 'vaga de empresa pendente não aparece publicamente');
reset role;

select * from finish();
rollback;
