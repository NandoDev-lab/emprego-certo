begin;

select plan(20);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS permanece ativo em perfis'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.applications'::regclass),
  'RLS permanece ativo em candidaturas'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.consent_records'::regclass),
  'RLS permanece ativo no histórico de consentimento'
);
select ok(
  not has_table_privilege('authenticated', 'public.companies', 'INSERT'),
  'usuários não criam empresa fora da função de onboarding'
);
select ok(
  has_column_privilege('authenticated', 'public.jobs', 'company_id', 'INSERT'),
  'recrutador pode criar vaga na sua organização'
);
select ok(
  not has_column_privilege('authenticated', 'public.jobs', 'company_id', 'UPDATE'),
  'vaga não pode ser transferida para outra organização'
);
select ok(
  not has_column_privilege('authenticated', 'public.jobs', 'created_by', 'UPDATE'),
  'autor original da vaga não pode ser alterado'
);
select ok(
  not has_column_privilege('authenticated', 'public.companies', 'verified_at', 'UPDATE'),
  'usuário comum não pode validar a própria empresa'
);
select ok(
  has_column_privilege('authenticated', 'public.applications', 'status', 'UPDATE'),
  'candidato e equipe autorizada podem avançar o status conforme RLS'
);
select ok(
  not has_column_privilege('authenticated', 'public.applications', 'profile_shared', 'UPDATE'),
  'consentimento da candidatura não pode ser forjado por atualização direta'
);
select ok(
  not has_column_privilege('authenticated', 'public.applications', 'match_score', 'INSERT'),
  'pontuação de compatibilidade não pode ser enviada pelo cliente'
);
select ok(
  not has_column_privilege('authenticated', 'public.applications', 'resume_url', 'INSERT'),
  'URL de currículo não pode ser gravada antes da integração com armazenamento privado'
);
select ok(
  not has_table_privilege('authenticated', 'public.application_events', 'INSERT'),
  'linha do tempo só é escrita pelo gatilho de status'
);
select ok(
  not has_table_privilege('authenticated', 'public.consent_records', 'INSERT'),
  'consentimento só é registrado pela função controlada'
);
select ok(
  has_function_privilege('authenticated', 'public.record_privacy_consent(text,boolean)', 'EXECUTE'),
  'pessoa autenticada consegue registrar a própria decisão de consentimento'
);
select ok(
  not has_function_privilege('anon', 'public.record_privacy_consent(text,boolean)', 'EXECUTE'),
  'pessoa anônima não consegue registrar consentimento'
);
select ok(
  not has_table_privilege('authenticated', 'public.skill_assessment_attempts', 'INSERT'),
  'tentativa não aceita nota ou supervisão declarada pelo navegador'
);
select ok(
  not has_column_privilege('anon', 'public.skill_assessments', 'questions', 'SELECT'),
  'gabarito de avaliação não fica exposto na API pública'
);
select ok(
  has_table_privilege('anon', 'public.published_skill_assessments', 'SELECT'),
  'metadados públicos das avaliações permanecem disponíveis'
);
select ok(
  not public.is_company_recruiter_for_any_company(gen_random_uuid()),
  'sem identidade autenticada, a verificação de recrutador nega acesso'
);

select * from finish();
rollback;
