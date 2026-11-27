begin;

select plan(6);

insert into auth.users (id, email, raw_user_meta_data)
values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3','employer-onboarding@example.invalid','{"full_name":"Empregador","role":"recruiter","company_name":"Empresa Exata"}'::jsonb);
select is((select role::text from public.profiles where id='cccccccc-cccc-4ccc-8ccc-ccccccccccc3'),'candidate','metadado de cadastro não concede permissão de recrutador');
select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-ccccccccccc3',true);
set local role authenticated;
select isnt(public.create_company('Empresa Exata','empresa-exata-teste'),null::uuid,'onboarding cria empresa pela identidade autenticada');
select is(public.create_company('Empresa Exata','empresa-exata-teste'),(select id from public.companies where slug='empresa-exata-teste'),'tentativas repetidas retornam a mesma empresa proprietária');
reset role;
select is((select role::text from public.profiles where id='cccccccc-cccc-4ccc-8ccc-ccccccccccc3'),'recruiter','RPC de empresa habilita recrutador após criar vínculo proprietário');
select is((select member_role from public.company_members where profile_id='cccccccc-cccc-4ccc-8ccc-ccccccccccc3'),'owner','criador torna-se proprietário da própria organização');
select is(public.is_company_recruiter_for_any_company('cccccccc-cccc-4ccc-8ccc-ccccccccccc3'),false,'empresa não verificada não pode descobrir perfis candidatos');

select * from finish();
rollback;
