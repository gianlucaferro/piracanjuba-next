-- Wrapper que chama analyze-contrato-risco passando o recorte (desde 2021) e um
-- batch pequeno (cabe no timeout com o delay anti-rate-limit). O cron roda a cada
-- 15min e vai preenchendo o Radar sozinho ate cobrir os 1.788 contratos de 2021+;
-- depois mantem novos contratos (que entram pelo sync diario, sempre >= 2021).
CREATE OR REPLACE FUNCTION public.invoke_analyze_risco_catchup()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbndlb2NxY3B0d3hxc3p0bGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MDA2NTUsImV4cCI6MjA5MzM3NjY1NX0.TFstJJgPZDauChUdhuBAcL8KX5FtGONaVNao7FU5lMQ';
  request_id BIGINT;
BEGIN
  SELECT net.http_post(
    url := 'https://oinweocqcptwxqsztlcl.supabase.co/functions/v1/analyze-contrato-risco',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_key),
    body := jsonb_build_object('desde', '2021-01-01', 'batch_size', 12),
    timeout_milliseconds := 120000
  ) INTO request_id;
  RETURN request_id;
END;
$func$;

SELECT cron.schedule('analyze-risco-catchup-2021', '*/15 * * * *',
  $cron$SELECT public.invoke_analyze_risco_catchup();$cron$);
