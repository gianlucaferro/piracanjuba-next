-- As rotinas abaixo dependem do portal Centi antigo e foram substituidas por
-- jobs NucleoGov com escrita canonica e compatibilidade para as telas atuais.
do $$
declare
  old_job text;
begin
  foreach old_job in array array[
    'sync-prefeitura-diaria-daily',
    'sync-contratos-aditivos-daily',
    'sync-decretos-weekly',
    'sync-portarias-weekly',
    'sync-despesas-monthly',
    'sync-diarias-monthly',
    'sync-prefeitura-mensal-dia1',
    'sync-prefeitura-mensal-dia5',
    'sync-prefeitura-mensal-3e6'
  ]
  loop
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = old_job;
  end loop;
end
$$;

update public.sync_job_registry
set is_active = false
where function_name in (
  'sync-prefeitura-diaria',
  'sync-contratos-aditivos',
  'sync-decretos',
  'sync-portarias',
  'sync-despesas',
  'sync-diarias',
  'sync-prefeitura-mensal'
);
