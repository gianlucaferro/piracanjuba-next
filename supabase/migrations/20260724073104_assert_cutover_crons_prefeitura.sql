-- Cobre tambem o nome adotado por uma migration intermediaria da folha.
do $$
declare
  legacy_job text;
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'sync-prefeitura-mensal-3e6';

  select jobname into legacy_job
  from cron.job
  where jobname = any(array[
    'sync-prefeitura-diaria-daily',
    'sync-contratos-aditivos-daily',
    'sync-decretos-weekly',
    'sync-portarias-weekly',
    'sync-despesas-monthly',
    'sync-diarias-monthly',
    'sync-prefeitura-mensal-dia1',
    'sync-prefeitura-mensal-dia5',
    'sync-prefeitura-mensal-3e6'
  ])
  limit 1;

  if legacy_job is not null then
    raise exception 'cron legado da Prefeitura ainda ativo: %', legacy_job;
  end if;
end
$$;
