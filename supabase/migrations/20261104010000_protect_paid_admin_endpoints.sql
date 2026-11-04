-- Preserva as quotas existentes, sem alterar cadência nem dados de negócio.
CREATE OR REPLACE FUNCTION public.ai_guard(p_ip_hash text, p_fn text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_dia date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_now timestamptz := now();
  c_daily int := 4000;
  c_min int := 15;
  c_hora int := 80;
  v_min int; v_hora int; v_daily int;
BEGIN
  IF p_ip_hash IS NULL OR btrim(p_ip_hash) = '' OR length(p_ip_hash) > 128 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unavailable');
  END IF;
  IF random() < 0.02 THEN
    DELETE FROM ai_rate_limit WHERE janela_inicio < v_now - interval '2 hours';
  END IF;

  INSERT INTO ai_rate_limit(ip_hash, scope, janela_inicio, total) VALUES (p_ip_hash, 'min', v_now, 1)
  ON CONFLICT (ip_hash, scope) DO UPDATE SET
    total = CASE WHEN ai_rate_limit.janela_inicio < v_now - interval '1 minute' THEN 1 ELSE least(ai_rate_limit.total + 1, c_min + 1) END,
    janela_inicio = CASE WHEN ai_rate_limit.janela_inicio < v_now - interval '1 minute' THEN v_now ELSE ai_rate_limit.janela_inicio END
  RETURNING total INTO v_min;
  IF v_min > c_min THEN RETURN jsonb_build_object('allowed', false, 'reason', 'rate', 'scope', 'minuto'); END IF;

  INSERT INTO ai_rate_limit(ip_hash, scope, janela_inicio, total) VALUES (p_ip_hash, 'hora', v_now, 1)
  ON CONFLICT (ip_hash, scope) DO UPDATE SET
    total = CASE WHEN ai_rate_limit.janela_inicio < v_now - interval '1 hour' THEN 1 ELSE least(ai_rate_limit.total + 1, c_hora + 1) END,
    janela_inicio = CASE WHEN ai_rate_limit.janela_inicio < v_now - interval '1 hour' THEN v_now ELSE ai_rate_limit.janela_inicio END
  RETURNING total INTO v_hora;
  IF v_hora > c_hora THEN RETURN jsonb_build_object('allowed', false, 'reason', 'rate', 'scope', 'hora'); END IF;

  INSERT INTO ai_usage_daily(dia, total) VALUES (v_dia, 0) ON CONFLICT (dia) DO NOTHING;
  -- UPDATE condicional reavalia o saldo sob lock da linha, inclusive com concorrência.
  UPDATE ai_usage_daily SET total = total + 1, updated_at = now()
  WHERE dia = v_dia AND total < c_daily
  RETURNING total INTO v_daily;
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed', false, 'reason', 'budget'); END IF;
  RETURN jsonb_build_object('allowed', true, 'daily', v_daily);
END;
$function$;
REVOKE ALL ON FUNCTION public.ai_guard(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_guard(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.invoke_backfill_servidor_resumos()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_secret text; request_id bigint;
BEGIN
  SELECT value INTO v_secret FROM public.app_settings WHERE key = 'cron_secret';
  IF v_secret IS NULL OR btrim(v_secret) = '' THEN RAISE EXCEPTION 'cron_secret não configurado'; END IF;
  SELECT net.http_post(
    url := 'https://oinweocqcptwxqsztlcl.supabase.co/functions/v1/backfill-servidor-resumos',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',v_secret,'apikey',v_secret),
    body := jsonb_build_object('batch_size',10,'delay_ms',3000),
    timeout_milliseconds := 150000
  ) INTO request_id;
  RETURN request_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.invoke_analyze_risco_catchup()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_secret text; request_id bigint;
BEGIN
  SELECT value INTO v_secret FROM public.app_settings WHERE key = 'cron_secret';
  IF v_secret IS NULL OR btrim(v_secret) = '' THEN RAISE EXCEPTION 'cron_secret não configurado'; END IF;
  SELECT net.http_post(
    url := 'https://oinweocqcptwxqsztlcl.supabase.co/functions/v1/analyze-contrato-risco',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',v_secret,'apikey',v_secret),
    body := jsonb_build_object('desde','2025-01-01','batch_size',12),
    timeout_milliseconds := 120000
  ) INTO request_id;
  RETURN request_id;
END;
$function$;

-- Mantém versionada a contenção autorizada e aplicada em 2026-11-03.
REVOKE EXECUTE ON FUNCTION public.invoke_analyze_risco_catchup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.invoke_backfill_servidor_resumos() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.invoke_enrich_cnpj(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_analyze_risco_catchup() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.invoke_backfill_servidor_resumos() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.invoke_enrich_cnpj(text, integer) TO postgres, service_role;
