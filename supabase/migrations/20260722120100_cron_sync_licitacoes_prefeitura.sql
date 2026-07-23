-- Agenda o sync diário das licitações da Prefeitura (portal NucleoGov).
-- Usa invoke_edge_function_secure (envia o cron secret) porque a edge function
-- sync-licitacoes-prefeitura exige checkCentiAuth.
-- 05:40 UTC escolhido por não colidir com os jobs já existentes.
select cron.unschedule('sync-licitacoes-prefeitura-daily')
where exists (select 1 from cron.job where jobname = 'sync-licitacoes-prefeitura-daily');

select cron.schedule(
  'sync-licitacoes-prefeitura-daily',
  '40 5 * * *',
  $$select public.invoke_edge_function_secure('sync-licitacoes-prefeitura');$$
);
