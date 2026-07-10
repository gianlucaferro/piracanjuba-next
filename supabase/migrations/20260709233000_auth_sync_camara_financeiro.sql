-- sync-camara-financeiro passou a exigir autenticacao.
--
-- Antes: verify_jwt=false E nenhuma checagem interna. A funcao era publicamente
-- invocavel por qualquer um (confirmado: um POST sem header nenhum disparava o sync
-- completo, martelando o portal Centi, escrevendo no banco e poluindo sync_log).
--
-- Agora ela valida x-cron-secret / x-centi-ingest-secret / service_role, no mesmo
-- padrao do sync-contratos-camara.
--
-- Consequencia: o helper invoke_edge_function envia apenas `Bearer <anon>`, que agora
-- resulta em 401. O cron precisa usar invoke_edge_function_secure, que envia
-- x-cron-secret (e tem timeout de 290s, adequado a esse sync longo).

select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'sync-camara-financeiro-weekly'),
  command := $$SELECT public.invoke_edge_function_secure('sync-camara-financeiro');$$
);
