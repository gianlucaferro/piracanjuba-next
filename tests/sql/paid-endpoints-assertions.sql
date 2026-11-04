SELECT public.fixture_assert(NOT has_function_privilege('anon','public.ai_guard(text,text)','EXECUTE'),'anon não executa quota');
SELECT public.fixture_assert(NOT has_function_privilege('authenticated','public.invoke_backfill_servidor_resumos()','EXECUTE'),'visitante não executa wrapper');
SELECT public.fixture_assert(has_function_privilege('service_role','public.invoke_analyze_risco_catchup()','EXECUTE'),'cron preservado');
SELECT public.fixture_assert(NOT has_function_privilege('anon','public.invoke_enrich_cnpj(text,integer)','EXECUTE'),'anon não executa enriquecimento');
SELECT public.fixture_assert(NOT has_function_privilege('authenticated','public.invoke_enrich_cnpj(text,integer)','EXECUTE'),'usuário não executa enriquecimento');
SELECT public.fixture_assert(has_function_privilege('service_role','public.invoke_enrich_cnpj(text,integer)','EXECUTE'),'enriquecimento interno preservado');
SELECT public.invoke_backfill_servidor_resumos();
SELECT public.invoke_analyze_risco_catchup();
SELECT public.fixture_assert(count(*)=2,'dois wrappers') FROM public.fixture_requests;
SELECT public.fixture_assert(bool_and(headers->>'x-cron-secret'='fixture-internal'),'autorização privada') FROM public.fixture_requests;
SELECT public.fixture_assert(body='{"batch_size":10,"delay_ms":3000}'::jsonb AND timeout_ms=150000,'contrato backfill preservado') FROM public.fixture_requests WHERE url LIKE '%backfill-servidor-resumos';
SELECT public.fixture_assert(body='{"batch_size":12,"desde":"2025-01-01"}'::jsonb AND timeout_ms=120000,'contrato risco preservado') FROM public.fixture_requests WHERE url LIKE '%analyze-contrato-risco';

DO $$
DECLARE i int; result jsonb;
BEGIN
 FOR i IN 1..15 LOOP
  result:=public.ai_guard('fixture-client','chatbot');
  PERFORM public.fixture_assert((result->>'allowed')::boolean,'primeiras 15 chamadas permitidas');
 END LOOP;
 result:=public.ai_guard('fixture-client','chatbot');
 PERFORM public.fixture_assert(result->>'reason'='rate','limite por minuto');
 PERFORM public.fixture_assert((SELECT total=15 FROM ai_usage_daily WHERE dia=(now() AT TIME ZONE 'America/Sao_Paulo')::date),'negação não consome quota diária');
 FOR i IN 1..5 LOOP
  UPDATE ai_rate_limit SET janela_inicio=now()-interval '2 minutes' WHERE scope='min';
  FOR j IN 1..13 LOOP PERFORM public.ai_guard('fixture-client','chatbot'); END LOOP;
 END LOOP;
 PERFORM public.fixture_assert((SELECT total=80 FROM ai_usage_daily WHERE dia=(now() AT TIME ZONE 'America/Sao_Paulo')::date),'80 chamadas por hora');
 result:=public.ai_guard('fixture-client','chatbot');
 PERFORM public.fixture_assert(result->>'reason'='rate','limite por hora');
 result:=public.ai_guard(NULL,'chatbot');
 PERFORM public.fixture_assert(result->>'allowed'='false','identificador inválido bloqueado');
END $$;
TRUNCATE public.ai_rate_limit;
UPDATE public.ai_usage_daily SET total=3999 WHERE dia=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
