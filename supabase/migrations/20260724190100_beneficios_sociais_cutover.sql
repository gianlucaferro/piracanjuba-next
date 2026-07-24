-- Corte operacional aplicado somente depois da criacao e validacao da camada
-- canonica e do deploy das Edge Functions correspondentes.

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
declare
  cron_name text;
begin
  foreach cron_name in array array[
    'sync-beneficios-sociais-biweekly',
    'sync-beneficios-sociais-bw',
    'sync-transferencias-monthly',
    'sync-pe-de-meia-monthly'
  ]
  loop
    if exists (
      select 1
      from cron.job
      where jobname = cron_name
    ) then
      perform cron.unschedule(cron_name);
    end if;
  end loop;
end
$$;

select cron.schedule(
  'sync-beneficios-sociais-bw',
  '0 3 5,20 * *',
  $$select public.invoke_edge_function_secure('sync-beneficios-sociais');$$
);

select cron.schedule(
  'sync-transferencias-monthly',
  '15 3 15 * *',
  $$select public.invoke_edge_function_secure('sync-transferencias-federais');$$
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
values
  (
    'sync-beneficios-sociais',
    'sync-beneficios-sociais-bw',
    '0 3 5,20 * *',
    'biweekly',
    'Portal da Transparencia do Governo Federal',
    'Beneficios federais municipais em camada canonica, com validacao de HTTP e schema.',
    384,
    null,
    true
  ),
  (
    'sync-transferencias-federais',
    'sync-transferencias-monthly',
    '15 3 15 * *',
    'monthly',
    'Portal da Transparencia do Governo Federal',
    'Convenios federais. Nao grava beneficios sociais.',
    768,
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

update public.sync_job_registry
set
  is_active = false,
  description_pt =
    'Fonte municipal do Pe-de-Meia indisponivel na API atual. Historico preservado, sincronizacao suspensa.'
where function_name = 'sync-pe-de-meia';

update public.sync_job_registry
set
  is_active = false,
  description_pt =
    'Sincronizador legado substituido pela camada canonica de beneficios sociais.'
where function_name = 'sync-bolsa-familia';
