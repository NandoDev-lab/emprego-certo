-- Substitui faixas ambíguas por um único valor mensal bruto em reais.
-- Se houver faixas legadas diferentes, a migração falha e exige decisão humana.

alter table public.profiles
  add column salary_monthly integer;

alter table public.jobs
  add column salary_monthly integer;

do $$
begin
  if exists (
    select 1 from public.profiles
    where salary_min is distinct from salary_max
  ) then
    raise exception 'Perfis com pretensão em faixa precisam de um valor mensal exato antes desta migração.';
  end if;

  if exists (
    select 1 from public.jobs
    where salary_min is distinct from salary_max
  ) then
    raise exception 'Vagas com salário em faixa precisam de um valor mensal exato antes desta migração.';
  end if;
end;
$$;

update public.profiles
set salary_monthly = salary_min
where salary_min is not null;

update public.jobs
set salary_monthly = salary_min;

alter table public.profiles
  drop column salary_min,
  drop column salary_max,
  add constraint profiles_salary_monthly_positive
    check (salary_monthly is null or salary_monthly > 0);

alter table public.jobs
  drop constraint if exists jobs_check,
  drop column salary_min,
  drop column salary_max,
  alter column salary_monthly set not null,
  add constraint jobs_salary_monthly_positive check (salary_monthly > 0),
  add constraint jobs_salary_currency_brl check (salary_currency = 'BRL');

revoke update on public.profiles from authenticated;
grant update (
  full_name, headline, city, state, country, salary_monthly,
  workplace_preferences, bio, profile_visible
) on public.profiles to authenticated;

revoke insert, update on public.jobs from authenticated;
grant insert (
  company_id, created_by, title, description, responsibilities, requirements, benefits,
  salary_monthly, salary_currency, employment_type, experience_level,
  workplace_mode, city, state, country, status, application_deadline, response_time_days
) on public.jobs to authenticated;
grant update (
  title, description, responsibilities, requirements, benefits, salary_monthly,
  salary_currency, employment_type, experience_level, workplace_mode, city, state,
  country, status, application_deadline, response_time_days
) on public.jobs to authenticated;

comment on column public.profiles.salary_monthly is
  'Pretensão bruta mensal única em reais; nulo significa que a pessoa não informou o valor.';
comment on column public.jobs.salary_monthly is
  'Salário bruto mensal único em reais, definido para a vaga.';
comment on column public.jobs.salary_currency is
  'Moeda fixa BRL neste produto, validada por restrição de tabela.';
