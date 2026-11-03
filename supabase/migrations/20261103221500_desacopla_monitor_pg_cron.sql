-- Remove dependencias de objetos do pg_cron sem interromper o painel.
-- A extensao e recriada pelo upgrade gerenciado da Supabase.
do $guard$
begin
  if pg_catalog.to_regprocedure('public.sync_cron_snapshot()') is not null then
    raise exception 'sync_cron_snapshot ja existe; revisar antes de substituir';
  end if;
  if md5(pg_get_viewdef('public.v_sync_dashboard'::regclass, true))
     <> '467c87c80012683948bfa42d310ad14e' then
    raise exception 'v_sync_dashboard divergiu do backup revisado de 2026-11-03';
  end if;
end;
$guard$;

create or replace function public.sync_cron_snapshot()
returns table(jobid bigint, jobname text, active boolean, last_dispatch_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if pg_catalog.to_regclass('cron.job') is null
     or pg_catalog.to_regclass('cron.job_run_details') is null then
    return;
  end if;
  return query execute
    'select j.jobid, j.jobname::text, j.active, max(d.start_time)
       from cron.job j
       left join cron.job_run_details d on d.jobid = j.jobid
      group by j.jobid, j.jobname, j.active';
end;
$function$;

revoke all on function public.sync_cron_snapshot() from public, anon, authenticated;
grant execute on function public.sync_cron_snapshot() to service_role;

create or replace view public.v_sync_dashboard
with (security_invoker = true) as
 WITH source_log_types(function_name, tipo) AS (
         VALUES ('sync-agro'::text,'agro'::text), ('sync-arrecadacao'::text,'arrecadacao'::text), ('sync-atividades-legislativas'::text,'atividades_legislativas'::text), ('sync-atuacao'::text,'atuacao'::text), ('sync-beneficios-sociais'::text,'beneficios_sociais'::text), ('sync-camara-atas-pdf'::text,'camara_atas_pdf'::text), ('sync-camara-financeiro'::text,'camara-financeiro'::text), ('sync-camara-servidores'::text,'camara_servidores'::text), ('sync-cde-subsidios'::text,'cde_subsidios'::text), ('sync-clima-historico'::text,'clima_historico'::text), ('sync-cnj-datajud'::text,'cnj_datajud'::text), ('sync-conab-precos'::text,'conab_precos'::text), ('sync-despesas'::text,'despesas'::text), ('sync-despesas-mensais'::text,'despesas_mensais'::text), ('sync-detran-go'::text,'detran_go'::text), ('sync-diarias'::text,'diarias'::text), ('sync-economia-mensal'::text,'economia_mensal'::text), ('sync-educacao'::text,'educacao'::text), ('sync-emendas'::text,'emendas'::text), ('sync-executivo-secretarias'::text,'executivo_secretarias'::text), ('sync-frota-veiculos'::text,'frota_veiculos'::text), ('sync-indicacoes-camara'::text,'indicacoes_camara'::text), ('sync-indicadores-home'::text,'indicadores_home'::text), ('sync-inep-escolas'::text,'inep_escolas'::text), ('sync-infraestrutura-mensal'::text,'infraestrutura_mensal'::text), ('sync-inmet-clima'::text,'inmet_clima'::text), ('sync-lei-organica'::text,'lei_organica'::text), ('sync-mpgo-atuacao'::text,'mpgo_atuacao'::text), ('sync-obras'::text,'obras'::text), ('sync-pe-de-meia'::text,'pe_de_meia'::text), ('sync-pncp-licitacoes'::text,'pncp_licitacoes'::text), ('sync-prefeitura-diaria'::text,'prefeitura_diaria'::text), ('sync-prefeitura-mensal'::text,'prefeitura_mensal'::text), ('sync-presenca-centi'::text,'presenca-centi'::text), ('sync-presenca-sessoes'::text,'presenca-sessoes'::text), ('sync-projetos'::text,'projetos'::text), ('sync-receitas-mensais'::text,'receitas_mensais'::text), ('sync-remuneracao-vereadores'::text,'remuneracao_vereadores'::text), ('sync-saude-estabelecimentos'::text,'saude_estabelecimentos'::text), ('sync-saude-hiv'::text,'saude_hiv'::text), ('sync-saude-indicadores'::text,'saude_indicadores'::text), ('sync-saude-sesgo'::text,'saude_sesgo'::text), ('sync-saude-srag'::text,'saude_srag'::text), ('sync-tcm-go-piracanjuba'::text,'tcm_go'::text), ('sync-tjgo-processos'::text,'tjgo_processos'::text), ('sync-transferencias-federais'::text,'transferencias_federais'::text), ('sync-tse-eleicoes'::text,'tse_eleicoes'::text), ('sync-vereadores'::text,'vereadores'::text), ('sync-votacoes'::text,'votacoes'::text)
        ), aliases AS (
         SELECT r.function_name,
            r.function_name AS tipo
           FROM public.sync_job_registry r
        UNION
         SELECT r.function_name,
            m.tipo
           FROM public.sync_job_registry r
             JOIN source_log_types m USING (function_name)
        ), mapped_logs AS (
         SELECT a.function_name,
            l.id,
            l.status,
            l.started_at,
            l.finished_at
           FROM aliases a
             JOIN public.sync_log l ON l.tipo = a.tipo
        ), latest_runs AS (
         SELECT DISTINCT ON (mapped_logs.function_name) mapped_logs.function_name,
            mapped_logs.status AS last_status,
            mapped_logs.started_at AS last_started_at,
            mapped_logs.finished_at AS last_finished_at,
            EXTRACT(epoch FROM COALESCE(mapped_logs.finished_at, now()) - mapped_logs.started_at) AS duration_seconds
           FROM mapped_logs
          ORDER BY mapped_logs.function_name, mapped_logs.started_at DESC, mapped_logs.id DESC
        ), recent_stats AS (
         SELECT mapped_logs.function_name,
            count(*) FILTER (WHERE mapped_logs.status = 'error'::text) AS errors_7d,
            count(*) FILTER (WHERE mapped_logs.status = 'partial'::text) AS partials_7d,
            count(*) AS runs_7d
           FROM mapped_logs
          WHERE mapped_logs.started_at >= (now() - '7 days'::interval)
          GROUP BY mapped_logs.function_name
        ), cron_snapshot AS (
         SELECT * FROM public.sync_cron_snapshot()
        ), dashboard AS (
         SELECT r.function_name,
            r.frequency_tier,
            r.data_source,
            r.description_pt,
            r.cron_expression,
            r.max_stale_hours,
            r.is_active,
            lr.last_status,
            lr.last_started_at,
            lr.last_finished_at,
            lr.duration_seconds,
            COALESCE(rs.errors_7d, 0::bigint) AS errors_7d,
            COALESCE(rs.partials_7d, 0::bigint) AS partials_7d,
            COALESCE(rs.runs_7d, 0::bigint) AS runs_7d,
                CASE
                    WHEN lr.last_started_at IS NULL AND cj.last_dispatch_at IS NOT NULL THEN 'unobserved'::text
                    WHEN lr.last_started_at IS NULL THEN 'never_run'::text
                    WHEN lr.last_status = 'running'::text AND lr.last_started_at < (now() - '00:30:00'::interval) THEN 'stuck'::text
                    WHEN lr.last_status = 'running'::text THEN 'running'::text
                    WHEN lr.last_status = 'error'::text THEN 'failing'::text
                    WHEN lr.last_status IS NULL OR (lr.last_status <> ALL (ARRAY['success'::text, 'partial'::text])) THEN 'unknown'::text
                    WHEN lr.last_finished_at IS NULL THEN 'incomplete'::text
                    WHEN (EXTRACT(epoch FROM now() - lr.last_started_at) / 3600::numeric) > r.max_stale_hours::numeric THEN 'stale'::text
                    WHEN lr.last_status = 'partial'::text THEN 'degraded'::text
                    WHEN lr.last_status = 'success'::text AND lr.last_finished_at IS NOT NULL THEN 'healthy'::text
                    ELSE 'unknown'::text
                END AS health_status,
            r.cron_name,
                CASE
                    WHEN cj.jobid IS NULL THEN 'missing'::text
                    WHEN NOT cj.active THEN 'disabled'::text
                    ELSE 'scheduled'::text
                END AS cron_status,
            cj.last_dispatch_at
           FROM public.sync_job_registry r
             LEFT JOIN latest_runs lr USING (function_name)
             LEFT JOIN recent_stats rs USING (function_name)
             LEFT JOIN cron_snapshot cj ON cj.jobname = r.cron_name
          WHERE r.is_active
        )
 SELECT function_name,
    frequency_tier,
    data_source,
    description_pt,
    cron_expression,
    max_stale_hours,
    is_active,
    last_status,
    last_started_at,
    last_finished_at,
    duration_seconds,
    errors_7d,
    partials_7d,
    runs_7d,
    health_status,
    cron_name,
    cron_status,
    last_dispatch_at,
    cron_status = 'scheduled'::text AND function_name <> 'sync-health-check'::text AND (health_status = ANY (ARRAY['failing'::text, 'stuck'::text, 'stale'::text, 'degraded'::text])) AS retry_eligible
   FROM dashboard
  ORDER BY (
        CASE health_status
            WHEN 'failing'::text THEN 0
            WHEN 'stuck'::text THEN 1
            WHEN 'stale'::text THEN 2
            WHEN 'degraded'::text THEN 3
            WHEN 'never_run'::text THEN 4
            WHEN 'unobserved'::text THEN 5
            ELSE 6
        END), function_name;

-- A view e operacional. O navegador acessa um resumo por sessao admin validada.
revoke all on public.v_sync_dashboard from public, anon, authenticated;
grant select on public.v_sync_dashboard to service_role;

do $verify$
begin
  if exists (
    select 1 from pg_catalog.pg_depend d
    join pg_catalog.pg_rewrite r on r.oid = d.objid
    where d.classid = 'pg_catalog.pg_rewrite'::regclass
      and r.ev_class = 'public.v_sync_dashboard'::regclass
      and d.refobjid in (
        pg_catalog.to_regclass('cron.job'),
        pg_catalog.to_regclass('cron.job_run_details')
      )
  ) then
    raise exception 'Dependencia direta de pg_cron permanece';
  end if;
end;
$verify$;
