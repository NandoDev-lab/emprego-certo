begin;

select plan(8);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'admin-console-test@example.invalid', '{"full_name":"Admin de teste","role":"admin"}'::jsonb),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'candidate-console-test@example.invalid', '{"full_name":"Candidato de teste"}'::jsonb);

select is((select role::text from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'), 'candidate', 'metadados públicos não criam conta admin');
update public.profiles set role='admin' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',true);
set local role authenticated;
select is(public.is_admin(auth.uid()), false, 'conta comum não tem papel administrativo');
select throws_ok($$select public.admin_list_records('profiles',10)$$, 'P0001', 'Admin access required', 'conta comum não lista dados administrativos');
reset role;

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',true);
set local role authenticated;
select is((select count(*)::integer from public.profiles), 2, 'admin consulta perfis sob RLS administrativo');
select is(jsonb_array_length(public.admin_list_records('auth_users',20)), 2, 'admin consulta a lista segura de identidades sem hashes ou tokens');
select is(public.admin_update_record('profiles','{"id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2"}'::jsonb,'{"full_name":"Nome atualizado"}'::jsonb),true,'admin altera registro usando chave primária validada');
select is((select full_name from public.profiles where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'),'Nome atualizado','alteração foi persistida');
select is(public.admin_delete_record('profiles','{"id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2"}'::jsonb),true,'admin exclui registro usando chave primária validada');
reset role;

select * from finish();
rollback;
