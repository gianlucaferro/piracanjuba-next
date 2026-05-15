-- Cron pra syncs Centi (Caminho J validado mai/2026)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-diarias-camara-mensal') THEN
    PERFORM cron.unschedule('sync-diarias-camara-mensal');
  END IF;
END $$;
SELECT cron.schedule('sync-diarias-camara-mensal', '0 7 7 * *',
  $$SELECT public.invoke_edge_function('sync-diarias-camara');$$);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-indicacoes-camara-semanal') THEN
    PERFORM cron.unschedule('sync-indicacoes-camara-semanal');
  END IF;
END $$;
SELECT cron.schedule('sync-indicacoes-camara-semanal', '0 6 * * 1',
  $$SELECT public.invoke_edge_function('sync-indicacoes-camara');$$);

INSERT INTO public.sync_job_registry (
  function_name, cron_name, cron_expression, frequency_tier, data_source, description_pt, max_stale_hours
) VALUES
  ('sync-diarias-camara', 'sync-diarias-camara-mensal', '0 7 7 * *', 'monthly',
   'Centi/LAI Piracanjuba (/api)',
   'Diarias da Camara via portal LAI Centi (Caminho J validado mai/26). Roda dia 7 de cada mes 04:00 BRT.',
   744),
  ('sync-indicacoes-camara', 'sync-indicacoes-camara-semanal', '0 6 * * 1', 'weekly',
   'Centi/LAI Piracanjuba (/api)',
   'Indicacoes parlamentares via portal LAI Centi. 135+ registros 2026. Roda segundas 03:00 BRT.',
   192)
ON CONFLICT (function_name) DO UPDATE SET
  cron_name = EXCLUDED.cron_name,
  cron_expression = EXCLUDED.cron_expression,
  frequency_tier = EXCLUDED.frequency_tier,
  data_source = EXCLUDED.data_source,
  description_pt = EXCLUDED.description_pt,
  max_stale_hours = EXCLUDED.max_stale_hours;
