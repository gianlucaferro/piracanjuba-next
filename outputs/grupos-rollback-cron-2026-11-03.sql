-- Rollback restrito do agendamento. Restaurar dados com o arquivo privado após este bloco.
begin;
do $rollback$
declare
  definition text;
  restored text;
  job record;
begin
  for job in select jobid,command from cron.job where jobname='sync-grupos-economicos-daily' loop
    if job.command <> 'SELECT public.invoke_edge_function_secure(''sync-grupos-economicos'');' then
      raise exception 'Cron mudou; revisar antes de remover';
    end if;
    perform cron.unschedule(job.jobid);
  end loop;
  select pg_get_functiondef('public.invoke_edge_function_secure(text,jsonb)'::regprocedure) into definition;
  if md5(definition)='410ebab859eae0e3d1e6f70752779fe6' then
    restored := replace(definition,'''sync-grupos-economicos'', ''sync-leis-municipais'',','''sync-leis-municipais'',');
    if md5(restored)<>'b2ddb4b841f9fb5654a759a014e1a98f' then raise exception 'Rollback da allowlist divergiu'; end if;
    execute restored;
  elsif md5(definition)<>'b2ddb4b841f9fb5654a759a014e1a98f' then
    raise exception 'Dispatcher mudou; preservar alterações alheias e revisar rollback';
  end if;
  delete from public.sync_job_registry where function_name='sync-grupos-economicos' and cron_name='sync-grupos-economicos-daily';
  delete from public.grupo_economico_atualizacao;
end;
$rollback$;
commit;
