-- O writer da Camara tambem usa service role. O cron passa pelo mesmo helper
-- protegido e pela mesma allowlist das sincronizacoes da Prefeitura.
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
    select 1 from cron.job where jobname = 'sync-camara-servidores-bw'
  ) then
    perform cron.unschedule('sync-camara-servidores-bw');
  end if;
end
$$;

select cron.schedule(
  'sync-camara-servidores-bw',
  '0 6 5,20 * *',
  $$select public.invoke_edge_function_secure('sync-camara-servidores');$$
);
