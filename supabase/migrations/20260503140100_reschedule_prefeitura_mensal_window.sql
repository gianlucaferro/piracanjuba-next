-- Reagendar sync-prefeitura-mensal de "dias 5 e 20" para "janela diária dia 5-25"
-- O Centi pode publicar em qualquer dia útil após fechamento; idempotente via upsert

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-prefeitura-mensal-bw') THEN
    PERFORM cron.unschedule('sync-prefeitura-mensal-bw');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-prefeitura-mensal-window') THEN
    PERFORM cron.unschedule('sync-prefeitura-mensal-window');
  END IF;
END $$;

SELECT cron.schedule(
  'sync-prefeitura-mensal-window',
  '30 6 5-25 * *',
  $$SELECT public.invoke_edge_function('sync-prefeitura-mensal');$$
);

UPDATE public.sync_job_registry
SET
  cron_name = 'sync-prefeitura-mensal-window',
  cron_expression = '30 6 5-25 * *',
  frequency_tier = 'monthly',
  max_stale_hours = 744,
  description_pt = 'Servidores e folha da Prefeitura; janela diária entre os dias 5 e 25 para capturar a competência mais recente publicada no Centi'
WHERE function_name = 'sync-prefeitura-mensal';
