create table if not exists public.despesas_mensais (
  id uuid primary key default gen_random_uuid(),
  competencia text not null
    check (competencia ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  valor_empenhado numeric(18, 2) not null
    check (valor_empenhado >= 0),
  valor_liquidado numeric(18, 2) not null
    check (valor_liquidado >= 0),
  valor_pago numeric(18, 2) not null
    check (valor_pago >= 0),
  fonte_nome text not null,
  fonte_url text not null,
  metodologia text not null,
  escopo text not null,
  data_coleta timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint despesas_mensais_competencia_unique unique (competencia)
);

comment on table public.despesas_mensais is
  'Totais mensais oficiais das fases empenhada, liquidada e paga das despesas municipais.';
comment on column public.despesas_mensais.valor_empenhado is
  'Valor dos empenhos emitidos no mês selecionado.';
comment on column public.despesas_mensais.valor_liquidado is
  'Valor liquidado dos empenhos emitidos no mês selecionado, conforme a coleta.';
comment on column public.despesas_mensais.valor_pago is
  'Valor pago dos empenhos emitidos no mês selecionado, conforme a coleta.';

alter table public.despesas_mensais enable row level security;

drop policy if exists "Despesas mensais são públicas"
  on public.despesas_mensais;
create policy "Despesas mensais são públicas"
  on public.despesas_mensais
  for select
  using (true);

revoke insert, update, delete, truncate, references, trigger
  on public.despesas_mensais
  from anon, authenticated;
grant select on public.despesas_mensais to anon, authenticated;

drop trigger if exists update_despesas_mensais_updated_at
  on public.despesas_mensais;
create trigger update_despesas_mensais_updated_at
  before update on public.despesas_mensais
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
      'sync-despesas-mensais',
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
    where jobname = 'sync-despesas-mensais-monthly'
  ) then
    perform cron.unschedule('sync-despesas-mensais-monthly');
  end if;
end
$$;

select cron.schedule(
  'sync-despesas-mensais-monthly',
  '25 6 10 * *',
  $$select public.invoke_edge_function_secure('sync-despesas-mensais');$$
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
  'sync-despesas-mensais',
  'sync-despesas-mensais-monthly',
  '25 6 10 * *',
  'monthly',
  'Portal da Transparência de Piracanjuba - NucleoGov',
  'Totais mensais oficiais de despesas empenhadas, liquidadas e pagas.',
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
