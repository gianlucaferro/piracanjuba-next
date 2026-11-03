-- Aplicar somente após publicar e validar a Edge Function sync-grupos-economicos.
do $migration$
declare
  definition text;
  corrected text;
begin
  select pg_get_functiondef('public.invoke_edge_function_secure(text,jsonb)'::regprocedure) into definition;
  if md5(definition)='b2ddb4b841f9fb5654a759a014e1a98f' then
    corrected := replace(definition,'''sync-leis-municipais'',','''sync-grupos-economicos'', ''sync-leis-municipais'',');
    if md5(corrected)<>'410ebab859eae0e3d1e6f70752779fe6' then raise exception 'Allowlist divergiu do patch revisado'; end if;
    execute corrected;
  elsif md5(definition)<>'410ebab859eae0e3d1e6f70752779fe6' then
    raise exception 'Dispatcher mudou desde a revisão; revisar integração antes de aplicar';
  end if;
  perform cron.schedule('sync-grupos-economicos-daily','0 22 * * *',
    'SELECT public.invoke_edge_function_secure(''sync-grupos-economicos'');');
  insert into public.sync_job_registry(function_name,cron_name,cron_expression,frequency_tier,data_source,description_pt,max_stale_hours,is_active)
  values('sync-grupos-economicos','sync-grupos-economicos-daily','0 22 * * *','daily',
    'Contratos municipais e QSA já coletados','Recalcula grupos após a coleta diária de contratos, sem IA',36,true)
  on conflict(function_name) do update set cron_name=excluded.cron_name,cron_expression=excluded.cron_expression,
    frequency_tier=excluded.frequency_tier,data_source=excluded.data_source,description_pt=excluded.description_pt,
    max_stale_hours=excluded.max_stale_hours,is_active=excluded.is_active;
end;
$migration$;
