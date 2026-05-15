DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-folha-camara-mensal') THEN
    PERFORM cron.unschedule('sync-folha-camara-mensal');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-licitacoes-camara-mensal') THEN
    PERFORM cron.unschedule('sync-licitacoes-camara-mensal');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-atos-camara-semanal') THEN
    PERFORM cron.unschedule('sync-atos-camara-semanal');
  END IF;
END $$;

SELECT cron.schedule('sync-folha-camara-mensal', '0 9 7 * *',
  $$SELECT public.invoke_edge_function('sync-folha-camara');$$);
SELECT cron.schedule('sync-licitacoes-camara-mensal', '30 8 7 * *',
  $$SELECT public.invoke_edge_function('sync-licitacoes-camara');$$);
SELECT cron.schedule('sync-atos-camara-semanal', '30 6 * * 1',
  $$SELECT public.invoke_edge_function('sync-atos-camara');$$);

INSERT INTO public.sync_job_registry (function_name, cron_name, cron_expression, frequency_tier, data_source, description_pt, max_stale_hours) VALUES
  ('sync-folha-camara', 'sync-folha-camara-mensal', '0 9 7 * *', 'monthly',
   'Centi/LAI Piracanjuba (/api)', 'Folha de Pagamento Camara (servidores + vereadores).', 744),
  ('sync-licitacoes-camara', 'sync-licitacoes-camara-mensal', '30 8 7 * *', 'monthly',
   'Centi/LAI Piracanjuba (/api)', 'Licitacoes da Camara orgao 3.', 744),
  ('sync-atos-camara', 'sync-atos-camara-semanal', '30 6 * * 1', 'weekly',
   'Centi/LAI Piracanjuba (/api)', 'Mocoes + Requerimentos.', 192)
ON CONFLICT (function_name) DO UPDATE SET
  cron_name = EXCLUDED.cron_name,
  cron_expression = EXCLUDED.cron_expression,
  description_pt = EXCLUDED.description_pt;
