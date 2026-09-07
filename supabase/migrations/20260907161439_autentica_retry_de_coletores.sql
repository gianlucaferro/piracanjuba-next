-- Corrige apenas a RPC manual de retry. Nao cria cron nem amplia a allowlist.
-- Dependencia final: 20260907155303_saude_snapshot_atomico.sql.
-- Fecha EXECUTE publico antes de permitir que a RPC encaminhe ao dispatcher seguro.
do $retry_cutover$
declare definition text;
begin
  if (select count(*) from supabase_migrations.schema_migrations where version in ('20260907144856', '20260907150306', '20260907150325', '20260907151848', '20260907152651', '20260907153151', '20260907153655', '20260907155045', '20260907155303')) <> 9 then
    raise exception 'Dependencias do pacote de 2026-09-07 ausentes';
  end if;
  if md5(pg_get_functiondef('public.invoke_edge_function_secure(text,jsonb)'::regprocedure)) <> 'b2ddb4b841f9fb5654a759a014e1a98f' then
    raise exception 'Dispatcher seguro divergiu da allowlist revisada';
  end if;
  if md5(pg_get_viewdef('public.v_sync_dashboard'::regclass,true)) <> '467c87c80012683948bfa42d310ad14e' then
    raise exception 'View de elegibilidade divergiu da revisao';
  end if;
  if to_regprocedure('public.invoke_edge_function(text)') is null then
    raise exception 'Dispatcher legado ausente';
  end if;
  if has_function_privilege('anon','public.invoke_edge_function_secure(text,jsonb)','EXECUTE')
     or has_function_privilege('authenticated','public.invoke_edge_function_secure(text,jsonb)','EXECUTE') then
    raise exception 'Permissoes do dispatcher seguro divergiram da revisao';
  end if;
  select pg_get_functiondef('public.retry_failed_syncs(integer)'::regprocedure) into definition;
  if md5(definition) not in ('1cb64cdc1b840cd2319fc37934870d5f', 'f968e430c4478c08840c362867a09736') then
    raise exception 'RPC de retry divergiu da definicao revisada';
  end if;
  revoke execute on function public.retry_failed_syncs(integer) from public, anon, authenticated;
grant execute on function public.retry_failed_syncs(integer) to service_role;
  execute $new_definition$CREATE OR REPLACE FUNCTION public.retry_failed_syncs(max_retries integer DEFAULT 3)
 RETURNS TABLE(function_name text, retry_triggered boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  rec record;
  request_id bigint;
begin
  for rec in
    select d.function_name
    from public.v_sync_dashboard d
    where d.health_status in ('failing', 'stuck', 'stale')
      and d.is_active and d.retry_eligible
      and coalesce(d.errors_7d, 0) < max_retries
  loop
    if rec.function_name = any(array[
        'sync-health-check',
        'sync-saude-indicadores',
        'sync-tcm-go-piracanjuba',
        'sync-leis-municipais',
        'sync-mortalidade',
        'sync-saude-hiv-casos',
        'sync-presenca-centi',
        'sync-aditivos-prefeitura-nucleogov',
        'sync-atos-prefeitura-nucleogov',
        'sync-beneficios-sociais',
        'sync-camara-financeiro',
        'sync-camara-servidores',
        'sync-contratos-camara',
        'sync-contratos-prefeitura-nucleogov',
        'sync-despesas-mensais',
        'sync-diarias-camara',
        'sync-diarias-prefeitura-nucleogov',
        'sync-empenhos-prefeitura-nucleogov',
        'sync-empresa-sancionada',
        'sync-fiscais-prefeitura-nucleogov',
        'sync-folha-camara',
        'sync-folha-prefeitura-nucleogov',
        'sync-fornecedores-cnpj',
        'sync-licitacoes-camara',
        'sync-licitacoes-prefeitura',
        'sync-pagamentos-prefeitura-nucleogov',
        'sync-postos-combustivel',
        'sync-receitas-mensais',
        'sync-transferencias-federais'
      ]::text[]) then
      request_id := public.invoke_edge_function_secure(rec.function_name);
    else
      request_id := public.invoke_edge_function(rec.function_name);
    end if;
    function_name := rec.function_name;
    retry_triggered := coalesce(request_id > 0, false);
    return next;
  end loop;
end;
$function$
$new_definition$;
end;
$retry_cutover$;
