-- Console administrativa protegida: nenhuma conta pode se promover pelo cliente.
create or replace function public.is_admin(target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = target_user and p.role = 'admin'::public.account_role
  );
$$;
revoke all on function public.is_admin(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated;

-- Criação de empresa também é a única forma pública de habilitar papel recruiter.
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
  if current_profile_id is null then raise exception 'Authentication required'; end if;
  if length(trim(company_name)) < 2 or length(trim(company_slug)) < 2 then
    raise exception 'Company name and slug are required';
  end if;
  if lower(trim(company_slug)) !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Company slug must contain lowercase letters, numbers, and single hyphens';
  end if;
  select c.id into new_company_id
    from public.companies c
    join public.company_members cm on cm.company_id = c.id
    where c.slug = lower(trim(company_slug))
      and cm.profile_id = current_profile_id and cm.member_role = 'owner';
  if new_company_id is not null then return new_company_id; end if;
  insert into public.companies (name, slug)
  values (left(trim(company_name), 200), lower(trim(company_slug)))
  on conflict (slug) do nothing
  returning id into new_company_id;
  if new_company_id is null then
    select c.id into new_company_id from public.companies c
      join public.company_members cm on cm.company_id = c.id
      where c.slug = lower(trim(company_slug))
        and cm.profile_id = current_profile_id and cm.member_role = 'owner';
    if new_company_id is null then raise exception 'Company slug is already in use'; end if;
    return new_company_id;
  end if;
  insert into public.company_members (company_id, profile_id, member_role)
  values (new_company_id, current_profile_id, 'owner');
  update public.profiles set role = 'recruiter'::public.account_role
    where id = current_profile_id and role = 'candidate'::public.account_role;
  return new_company_id;
end;
$$;

-- A empresa sem validação pode configurar seu perfil, mas não consultar perfis
-- visíveis à descoberta geral antes de ser validada pela administração.
create or replace function public.is_company_recruiter_for_any_company(target_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_members cm
    join public.companies c on c.id = cm.company_id
    where cm.profile_id = target_profile
      and cm.profile_id = (select auth.uid())
      and cm.member_role in ('owner', 'recruiter')
      and c.verified_at is not null
  );
$$;
revoke all on function public.is_company_recruiter_for_any_company(uuid) from public, anon;
grant execute on function public.is_company_recruiter_for_any_company(uuid) to authenticated;

-- Política administrativa por tabela. Os privilégios SQL continuam sendo
-- concedidos apenas pelas funções abaixo, que verificam o papel no banco.
do $$
declare t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())))',
      'Administradores: acesso total', t.tablename
    );
  end loop;
end;
$$;

create or replace function public.admin_list_records(table_name text, row_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if not public.is_admin((select auth.uid())) then raise exception 'Admin access required'; end if;
  if table_name = 'auth_users' then
    execute 'select coalesce(jsonb_agg(to_jsonb(r)), ''[]''::jsonb) from (select id, email, created_at, email_confirmed_at, last_sign_in_at from auth.users where deleted_at is null limit $1) r'
      into result using greatest(1, least(coalesce(row_limit, 100), 500));
    return result;
  end if;
  if not exists (select 1 from pg_tables where schemaname = 'public' and tablename = table_name) then
    raise exception 'Table is not available';
  end if;
  execute format(
    'select coalesce(jsonb_agg(to_jsonb(r)), ''[]''::jsonb) from (select * from public.%I limit $1) r',
    table_name
  ) into result using greatest(1, least(coalesce(row_limit, 100), 500));
  return result;
end;
$$;

create or replace function public.admin_update_record(table_name text, key_values jsonb, new_values jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  relation_id oid;
  table_type text;
  target_table text := table_name;
  primary_columns text[];
  supplied_keys text[];
  set_clause text;
  where_clause text;
  changed integer;
begin
  if not public.is_admin((select auth.uid())) then raise exception 'Admin access required'; end if;
  select c.oid, c.relkind::text into relation_id, table_type
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = table_name and c.relkind = 'r';
  if relation_id is null then raise exception 'Table is not available'; end if;
  select array_agg(a.attname::text order by a.attname::text) into primary_columns
    from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
    where i.indrelid = relation_id and i.indisprimary;
  select array_agg(k order by k) into supplied_keys from jsonb_object_keys(key_values) k;
  if primary_columns is null or supplied_keys is distinct from primary_columns then
    raise exception 'Primary key values are required';
  end if;
  select string_agg(format('%I = (jsonb_populate_record(null::public.%I, $1)).%I', c.column_name, target_table, c.column_name), ', ' order by c.ordinal_position)
    into set_clause
    from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = target_table
      and new_values ? c.column_name and not (c.column_name = any(primary_columns))
      and c.is_generated = 'NEVER' and c.is_identity = 'NO';
  if set_clause is null then raise exception 'No editable columns supplied'; end if;
  select string_agg(format('t.%I is not distinct from (jsonb_populate_record(null::public.%I, $2)).%I', k, table_name, k), ' and ' order by k)
    into where_clause from unnest(primary_columns) k;
  execute format('update public.%I t set %s where %s', table_name, set_clause, where_clause)
    using new_values, key_values;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

create or replace function public.admin_delete_record(table_name text, key_values jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  relation_id oid;
  primary_columns text[];
  supplied_keys text[];
  where_clause text;
  removed integer;
begin
  if not public.is_admin((select auth.uid())) then raise exception 'Admin access required'; end if;
  if table_name in ('profiles', 'auth_users') then
    delete from auth.users where id = (key_values ->> 'id')::uuid;
    get diagnostics removed = row_count;
    return removed = 1;
  end if;
  select c.oid into relation_id from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = table_name and c.relkind = 'r';
  if relation_id is null then raise exception 'Table is not available'; end if;
  select array_agg(a.attname::text order by a.attname::text) into primary_columns
    from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
    where i.indrelid = relation_id and i.indisprimary;
  select array_agg(k order by k) into supplied_keys from jsonb_object_keys(key_values) k;
  if primary_columns is null or supplied_keys is distinct from primary_columns then
    raise exception 'Primary key values are required';
  end if;
  select string_agg(format('%I is not distinct from (jsonb_populate_record(null::public.%I, $1)).%I', k, table_name, k), ' and ' order by k)
    into where_clause from unnest(primary_columns) k;
  execute format('delete from public.%I where %s', table_name, where_clause) using key_values;
  get diagnostics removed = row_count;
  return removed = 1;
end;
$$;

revoke all on function public.admin_list_records(text, integer) from public, anon;
revoke all on function public.admin_update_record(text, jsonb, jsonb) from public, anon;
revoke all on function public.admin_delete_record(text, jsonb) from public, anon;
grant execute on function public.admin_list_records(text, integer) to authenticated;
grant execute on function public.admin_update_record(text, jsonb, jsonb) to authenticated;
grant execute on function public.admin_delete_record(text, jsonb) to authenticated;

comment on function public.admin_list_records(text, integer) is 'Lista até 500 registros para a console; exige papel admin no perfil.';
comment on function public.admin_update_record(text, jsonb, jsonb) is 'Atualiza uma linha pela chave primária; exige papel admin no perfil.';
comment on function public.admin_delete_record(text, jsonb) is 'Exclui uma linha pela chave primária; exclusão de perfil também remove a identidade Supabase e seus dados em cascata.';
