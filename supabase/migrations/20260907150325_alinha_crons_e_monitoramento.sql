-- Alinha o monitoramento aos crons ja existentes, sem criar agendas.
-- O corte de Bolsa Familia foi comprovado pela migration de 2026-07-24,
-- pelo job substituto ativo e pela camada canonica utilizada pelos consumidores.

do $$
declare
  antigo bigint;
begin
  if exists (
    select 1 from cron.job
    where jobname = 'sync-bolsa-familia-mensal' and active
      and md5(command) <> '94fbee1d6abdb4166263b08f4d0c10ec'
  ) then
    raise exception 'cron legado Bolsa Familia mudou desde o backup';
  end if;
  select jobid into antigo from cron.job
  where jobname = 'sync-bolsa-familia-mensal' and active;
  if antigo is not null then
    if not exists (
      select 1 from cron.job
      where jobname = 'sync-beneficios-sociais-bw' and active
        and md5(command) = '332dc248ba002a62faeec621a90d5798'
    ) or not exists (
      select 1 from public.sync_job_registry
      where function_name = 'sync-beneficios-sociais' and is_active
        and cron_name = 'sync-beneficios-sociais-bw'
    ) or not exists (
      select 1 from public.beneficios_sociais_v2
      where municipio_ibge = '5217104' and programa_codigo = 'bolsa_familia'
    ) then
      raise exception 'substituicao do cron legado Bolsa Familia nao comprovada';
    end if;
    perform cron.alter_job(antigo, active := false);
  end if;
end;
$$;

update public.sync_job_registry
set is_active = false
where function_name = 'sync-votacoes'
  and exists (
    select 1 from cron.job
    where jobname = 'sync-votacoes-weekly' and not active
  );

with expected(function_name, cron_name, cron_expression, frequency_tier, max_stale_hours) as (
values
  ('sync-vereadores', 'sync-vereadores-weekly', '5 3 * * *', 'daily', 36),
  ('sync-projetos', 'sync-projetos-weekly', '10 3 * * *', 'daily', 36),
  ('sync-atuacao', 'sync-atuacao-weekly', '20 3 * * *', 'daily', 36),
  ('sync-presenca-centi', 'sync-presenca-centi-weekly', '0 4 * * *', 'daily', 36),
  ('sync-camara-atos', 'sync-camara-atos-weekly', '10 4 * * *', 'daily', 36),
  ('sync-camara-financeiro', 'sync-camara-financeiro-weekly', '20 4 * * *', 'daily', 36),
  ('sync-leis-municipais', 'sync-leis-municipais-weekly', '50 4 * * *', 'daily', 36),
  ('sync-lei-organica', 'sync-lei-organica-weekly', '40 5 * * *', 'daily', 36),
  ('sync-frota-veiculos', 'sync-frota-veiculos-weekly', '20 5 * * *', 'daily', 36),
  ('sync-obras', 'sync-obras-monthly', '25 3 * * *', 'daily', 36),
  ('sync-tcm-go-piracanjuba', 'sync-tcm-go-piracanjuba-weekly', '0 5 * * 0', 'weekly', 168),
  ('sync-diarias-camara', 'sync-diarias-camara-mensal', '0 7 * * *', 'daily', 36),
  ('sync-indicacoes-camara', 'sync-indicacoes-camara-semanal', '0 6 * * *', 'daily', 36),
  ('sync-atividades-legislativas', 'sync-atividades-legislativas-semanal', '15 6 * * *', 'daily', 36),
  ('sync-contratos-camara', 'sync-contratos-camara-daily', '10 21 * * *', 'daily', 36),
  ('sync-licitacoes-camara', 'sync-licitacoes-camara-daily', '15 21 * * *', 'daily', 36),
  ('sync-atos-camara', 'sync-atos-camara-semanal', '30 6 * * *', 'daily', 36)
)
update public.sync_job_registry r
set cron_name = e.cron_name,
    cron_expression = e.cron_expression,
    frequency_tier = e.frequency_tier,
    max_stale_hours = e.max_stale_hours
from expected e
join cron.job j on j.jobname = e.cron_name
  and j.schedule = e.cron_expression and j.active
where r.function_name = e.function_name and r.is_active;

-- Preserva colunas existentes e acrescenta evidencias de agendamento ao final.
create or replace view public.v_sync_dashboard as
with source_log_types(function_name, tipo) as (
  values
    ('sync-agro', 'agro'),
    ('sync-arrecadacao', 'arrecadacao'),
    ('sync-atividades-legislativas', 'atividades_legislativas'),
    ('sync-atuacao', 'atuacao'),
    ('sync-beneficios-sociais', 'beneficios_sociais'),
    ('sync-camara-atas-pdf', 'camara_atas_pdf'),
    ('sync-camara-financeiro', 'camara-financeiro'),
    ('sync-camara-servidores', 'camara_servidores'),
    ('sync-cde-subsidios', 'cde_subsidios'),
    ('sync-clima-historico', 'clima_historico'),
    ('sync-cnj-datajud', 'cnj_datajud'),
    ('sync-conab-precos', 'conab_precos'),
    ('sync-despesas', 'despesas'),
    ('sync-despesas-mensais', 'despesas_mensais'),
    ('sync-detran-go', 'detran_go'),
    ('sync-diarias', 'diarias'),
    ('sync-economia-mensal', 'economia_mensal'),
    ('sync-educacao', 'educacao'),
    ('sync-emendas', 'emendas'),
    ('sync-executivo-secretarias', 'executivo_secretarias'),
    ('sync-frota-veiculos', 'frota_veiculos'),
    ('sync-indicacoes-camara', 'indicacoes_camara'),
    ('sync-indicadores-home', 'indicadores_home'),
    ('sync-inep-escolas', 'inep_escolas'),
    ('sync-infraestrutura-mensal', 'infraestrutura_mensal'),
    ('sync-inmet-clima', 'inmet_clima'),
    ('sync-lei-organica', 'lei_organica'),
    ('sync-mpgo-atuacao', 'mpgo_atuacao'),
    ('sync-obras', 'obras'),
    ('sync-pe-de-meia', 'pe_de_meia'),
    ('sync-pncp-licitacoes', 'pncp_licitacoes'),
    ('sync-prefeitura-diaria', 'prefeitura_diaria'),
    ('sync-prefeitura-mensal', 'prefeitura_mensal'),
    ('sync-presenca-centi', 'presenca-centi'),
    ('sync-presenca-sessoes', 'presenca-sessoes'),
    ('sync-projetos', 'projetos'),
    ('sync-receitas-mensais', 'receitas_mensais'),
    ('sync-remuneracao-vereadores', 'remuneracao_vereadores'),
    ('sync-saude-estabelecimentos', 'saude_estabelecimentos'),
    ('sync-saude-hiv', 'saude_hiv'),
    ('sync-saude-indicadores', 'saude_indicadores'),
    ('sync-saude-sesgo', 'saude_sesgo'),
    ('sync-saude-srag', 'saude_srag'),
    ('sync-tcm-go-piracanjuba', 'tcm_go'),
    ('sync-tjgo-processos', 'tjgo_processos'),
    ('sync-transferencias-federais', 'transferencias_federais'),
    ('sync-tse-eleicoes', 'tse_eleicoes'),
    ('sync-vereadores', 'vereadores'),
    ('sync-votacoes', 'votacoes')
),
aliases as (
  select r.function_name, r.function_name as tipo
  from public.sync_job_registry r
  union
  select r.function_name, m.tipo
  from public.sync_job_registry r
  join source_log_types m using (function_name)
),
mapped_logs as (
  select a.function_name, l.id, l.status, l.started_at, l.finished_at
  from aliases a
  join public.sync_log l on l.tipo = a.tipo
),
latest_runs as (
  select distinct on (function_name)
    function_name,
    status as last_status,
    started_at as last_started_at,
    finished_at as last_finished_at,
    extract(epoch from (coalesce(finished_at, now()) - started_at)) as duration_seconds
  from mapped_logs
  order by function_name, started_at desc, id desc
),
recent_stats as (
  select function_name,
    count(*) filter (where status = 'error') as errors_7d,
    count(*) filter (where status = 'partial') as partials_7d,
    count(*) as runs_7d
  from mapped_logs
  where started_at >= now() - interval '7 days'
  group by function_name
),
cron_runs as (
  select jobid, max(start_time) as last_dispatch_at
  from cron.job_run_details
  group by jobid
),
dashboard as (
  select r.function_name,
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
    coalesce(rs.errors_7d, 0::bigint) as errors_7d,
    coalesce(rs.partials_7d, 0::bigint) as partials_7d,
    coalesce(rs.runs_7d, 0::bigint) as runs_7d,
    case
      when lr.last_started_at is null and cr.last_dispatch_at is not null then 'unobserved'
      when lr.last_started_at is null then 'never_run'
      when lr.last_status = 'running' and lr.last_started_at < now() - interval '30 minutes' then 'stuck'
      when lr.last_status = 'error' then 'failing'
      when extract(epoch from (now() - lr.last_started_at)) / 3600 > r.max_stale_hours then 'stale'
      when lr.last_status = 'partial' then 'degraded'
      else 'healthy'
    end as health_status,
    r.cron_name,
    case when cj.jobid is null then 'missing'
      when not cj.active then 'disabled'
      else 'scheduled'
    end as cron_status,
    cr.last_dispatch_at
  from public.sync_job_registry r
  left join latest_runs lr using (function_name)
  left join recent_stats rs using (function_name)
  left join cron.job cj on cj.jobname = r.cron_name
  left join cron_runs cr on cr.jobid = cj.jobid
  where r.is_active
)
select dashboard.*,
  (cron_status = 'scheduled'
    and function_name <> 'sync-health-check'
    and health_status in ('failing', 'stuck', 'stale', 'degraded')) as retry_eligible
from dashboard
order by
  case health_status
    when 'failing' then 0
    when 'stuck' then 1
    when 'stale' then 2
    when 'degraded' then 3
    when 'never_run' then 4
    when 'unobserved' then 5
    else 6
  end,
  function_name
;

-- Mantem assinatura e politica de erros, mas exige cron ativo comprovado.
create or replace function public.retry_failed_syncs(max_retries integer default 3)
returns table(function_name text, retry_triggered boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  for rec in
    select d.function_name
    from public.v_sync_dashboard d
    where d.health_status in ('failing', 'stuck', 'stale')
      and d.is_active and d.retry_eligible
      and coalesce(d.errors_7d, 0) < max_retries
  loop
    perform public.invoke_edge_function(rec.function_name);
    function_name := rec.function_name;
    retry_triggered := true;
    return next;
  end loop;
end;
$$;
