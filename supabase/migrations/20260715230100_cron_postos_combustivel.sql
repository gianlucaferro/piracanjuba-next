-- Sync mensal dos postos de combustível de Piracanjuba via API oficial da ANP.
-- Dia 8 às 05:30 UTC. Usa o helper seguro (envia x-cron-secret; a função exige auth).
select cron.unschedule('sync-postos-combustivel-monthly')
where exists (select 1 from cron.job where jobname = 'sync-postos-combustivel-monthly');

select cron.schedule(
  'sync-postos-combustivel-monthly',
  '30 5 8 * *',
  $$select public.invoke_edge_function_secure('sync-postos-combustivel');$$
);
