-- Sync diário das dispensas/inexigibilidades da Prefeitura (mesma edge function,
-- flag dispensas=1 no body). São ~5.781 no total e a API do portal é lenta
-- (500 registros ~50s), então o cron puxa só as 500 mais recentes, que é o que
-- mantém o dado corrente. Backfill histórico, se desejado, é tarefa à parte.
-- 05:50 UTC: 10 min depois do sync de licitações, sem sobreposição.
select cron.unschedule('sync-dispensas-prefeitura-daily')
where exists (select 1 from cron.job where jobname = 'sync-dispensas-prefeitura-daily');

select cron.schedule(
  'sync-dispensas-prefeitura-daily',
  '50 5 * * *',
  $$select public.invoke_edge_function_secure(
      'sync-licitacoes-prefeitura',
      '{"dispensas":1,"pageSize":250,"maxPages":2}'::jsonb
    );$$
);
