-- Procura o mes corrente diariamente e conserva o fallback de fonte nao publicada.
-- Backup v29 e agenda anterior preservados em work/folha-camara/.
do $$
declare target bigint;
begin
  select jobid into target from cron.job
  where jobname='sync-camara-servidores-bw' and active
    and schedule in ('0 6 5,20 * *','0 6 * * *')
    and md5(command)='5eb57c1ef4c9a526922ee45d443577bd';
  if target is null then raise exception 'cron salarial da Camara mudou desde a revisao'; end if;
  perform cron.alter_job(target,schedule := '0 6 * * *');
  update public.sync_job_registry
  set cron_expression='0 6 * * *',frequency_tier='daily',max_stale_hours=36
  where function_name='sync-camara-servidores'
    and cron_name='sync-camara-servidores-bw' and is_active;
end;
$$;
