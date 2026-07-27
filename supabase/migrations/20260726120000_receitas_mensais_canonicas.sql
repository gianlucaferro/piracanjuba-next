create table if not exists public.receitas_mensais (
  id uuid primary key default gen_random_uuid(),
  competencia text not null
    check (competencia ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  esfera text not null
    check (esfera in ('federal', 'estadual', 'municipal')),
  categoria text not null,
  categoria_ordem integer not null default 0,
  valor_bruto numeric(18, 2) not null default 0,
  deducoes numeric(18, 2) not null default 0
    check (deducoes <= 0),
  valor_liquido numeric(18, 2) not null default 0,
  fonte_nome text not null,
  fonte_url text not null,
  metodologia text not null,
  registros_fonte integer not null default 0
    check (registros_fonte >= 0),
  data_coleta timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receitas_mensais_categoria_unique
    unique (competencia, esfera, categoria),
  constraint receitas_mensais_valor_liquido_check
    check (abs(valor_liquido - (valor_bruto + deducoes)) < 0.01)
);

comment on table public.receitas_mensais is
  'Receitas mensais canônicas do Executivo, separadas em repasses federais, estaduais e arrecadação própria.';
comment on column public.receitas_mensais.valor_bruto is
  'Valor arrecadado no mês antes das deduções contábeis informadas pelo portal.';
comment on column public.receitas_mensais.deducoes is
  'Deduções contábeis do mês, armazenadas como valor negativo.';
comment on column public.receitas_mensais.valor_liquido is
  'Valor bruto somado às deduções. É a medida exibida nos gráficos.';

create index if not exists idx_receitas_mensais_esfera_competencia
  on public.receitas_mensais (esfera, competencia desc);

alter table public.receitas_mensais enable row level security;

drop policy if exists "Receitas mensais são públicas"
  on public.receitas_mensais;
create policy "Receitas mensais são públicas"
  on public.receitas_mensais
  for select
  using (true);

revoke insert, update, delete, truncate, references, trigger
  on public.receitas_mensais
  from anon, authenticated;
grant select on public.receitas_mensais to anon, authenticated;

drop trigger if exists update_receitas_mensais_updated_at
  on public.receitas_mensais;
create trigger update_receitas_mensais_updated_at
  before update on public.receitas_mensais
  for each row
  execute function public.update_updated_at_column();

create or replace function public.invoke_edge_function_secure(
  function_name text,
  body_json jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  proj_url text := 'https://oinweocqcptwxqsztlcl.supabase.co';
  cron_secret text;
  request_id bigint;
begin
  if function_name is null or not (
    function_name = any(array[
      'sync-aditivos-prefeitura-nucleogov',
      'sync-atos-prefeitura-nucleogov',
      'sync-beneficios-sociais',
      'sync-camara-financeiro',
      'sync-camara-servidores',
      'sync-contratos-camara',
      'sync-contratos-prefeitura-nucleogov',
      'sync-diarias-camara',
      'sync-diarias-prefeitura-nucleogov',
      'sync-empenhos-prefeitura-nucleogov',
      'sync-empresa-sancionada',
      'sync-fiscais-prefeitura-nucleogov',
      'sync-folha-camara',
      'sync-folha-prefeitura-nucleogov',
      'sync-fornecedores-cnpj',
      'sync-licitacoes-camara',
      'sync-licitacoes-prefeitura',
      'sync-pagamentos-prefeitura-nucleogov',
      'sync-postos-combustivel',
      'sync-receitas-mensais',
      'sync-transferencias-federais'
    ]::text[])
  ) then
    raise exception 'edge function nao permitida: %', function_name;
  end if;

  if octet_length(body_json::text) > 10000 then
    raise exception 'payload do cron excede o limite';
  end if;

  select value into cron_secret
  from public.app_settings
  where key = 'cron_secret';

  if cron_secret is null or cron_secret = '' then
    raise exception 'cron_secret nao encontrado em app_settings';
  end if;

  select net.http_post(
    url := proj_url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', cron_secret,
      'x-centi-ingest-secret', cron_secret
    ),
    body := body_json,
    timeout_milliseconds := 290000
  ) into request_id;

  return request_id;
end;
$$;

revoke execute on function public.invoke_edge_function_secure(text, jsonb)
  from public, anon, authenticated;
grant execute on function public.invoke_edge_function_secure(text, jsonb)
  to postgres;

do $$
begin
  if exists (
    select 1 from cron.job
    where jobname = 'sync-receitas-mensais-monthly'
  ) then
    perform cron.unschedule('sync-receitas-mensais-monthly');
  end if;
end
$$;

select cron.schedule(
  'sync-receitas-mensais-monthly',
  '10 6 10 * *',
  $$select public.invoke_edge_function_secure('sync-receitas-mensais');$$
);

insert into public.sync_job_registry (
  function_name,
  cron_name,
  cron_expression,
  frequency_tier,
  data_source,
  description_pt,
  max_stale_hours,
  depends_on,
  is_active
)
values (
  'sync-receitas-mensais',
  'sync-receitas-mensais-monthly',
  '10 6 10 * *',
  'monthly',
  'Portal da Transparência de Piracanjuba - NucleoGov',
  'Repasses federais, estaduais e arrecadação própria, por competência mensal e líquidos das deduções contábeis.',
  840,
  null,
  true
)
on conflict (function_name) do update
set
  cron_name = excluded.cron_name,
  cron_expression = excluded.cron_expression,
  frequency_tier = excluded.frequency_tier,
  data_source = excluded.data_source,
  description_pt = excluded.description_pt,
  max_stale_hours = excluded.max_stale_hours,
  depends_on = excluded.depends_on,
  is_active = excluded.is_active;
