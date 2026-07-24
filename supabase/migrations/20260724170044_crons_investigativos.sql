-- Amplia a allowlist segura e agenda as camadas derivadas.
-- Versao aplicada em producao: 20260724170044.

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
      'sync-bolsa-familia',
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
      'sync-postos-combustivel'
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
    select 1
    from cron.job
    where jobname = 'sync-fornecedores-cnpj-monthly'
  ) then
    perform cron.unschedule('sync-fornecedores-cnpj-monthly');
  end if;

  if exists (
    select 1
    from cron.job
    where jobname = 'sync-fornecedores-cnpj-investigativo'
  ) then
    perform cron.unschedule('sync-fornecedores-cnpj-investigativo');
  end if;

  if exists (
    select 1
    from cron.job
    where jobname = 'refresh-investigacao-piracanjuba'
  ) then
    perform cron.unschedule('refresh-investigacao-piracanjuba');
  end if;
end
$$;

-- Enquanto houver CNPJs pendentes, cada execucao processa ate 50. Quando a
-- cobertura estiver completa, a funcao retorna sem consultar APIs externas.
select cron.schedule(
  'sync-fornecedores-cnpj-investigativo',
  '*/5 * * * *',
  $$select public.invoke_edge_function_secure(
    'sync-fornecedores-cnpj',
    '{"batch_size":50}'::jsonb
  );$$
);

-- Recalcula entidades e indicios depois dos syncs de origem e durante o
-- backfill historico.
select cron.schedule(
  'refresh-investigacao-piracanjuba',
  '17 * * * *',
  $$select public.refresh_investigacao_piracanjuba();$$
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
  'sync-fornecedores-cnpj',
  'sync-fornecedores-cnpj-investigativo',
  '*/5 * * * *',
  'daily',
  'BrasilAPI e OpenCNPJ',
  'CNPJ e QSA dos fornecedores presentes nas fontes canonicas.',
  24,
  array[
    'sync-contratos-prefeitura-nucleogov',
    'sync-empenhos-prefeitura-nucleogov'
  ],
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
  is_active = true;

select public.dispatch_next_empenhos_backfill();
select public.refresh_investigacao_piracanjuba();
