-- Snapshot validado e atomico, limitado aos dois coletores SES-GO.
create or replace function public.replace_saude_snapshot(
  p_bucket text, p_log_id uuid, p_rows jsonb, p_sources jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $snapshot$
declare
  expected_function text;
  expected_url text;
  expected_resources text[];
  allowed_categories text[];
  allowed_metrics text[];
  replaceable_summaries text[];
  source_sim constant text := 'SES-GO / Dados Abertos Goiás (SIM)';
  source_sinan constant text := 'SES-GO / Dados Abertos Goiás (SINAN)';
  entry jsonb;
  category text;
  metric text;
  expected_source text;
  inserted_count integer;
  updated_count integer;
  removed_count integer;
  preserved_count integer;
  row_count integer;
  result jsonb;
begin
  if p_bucket = 'mortalidade' then
    expected_function := 'sync-mortalidade';
    expected_url := 'https://dadosabertos.go.gov.br/dataset/mortalidade';
    allowed_categories := array['mortalidade_geral', 'mortalidade_infantil'];
    allowed_metrics := array['obitos_anual', 'obitos_sexo', 'obitos_causa_capitulo', 'obitos_faixa_etaria', 'total_obitos'];
    replaceable_summaries := array['obitos_causa_capitulo', 'obitos_faixa_etaria', 'total_obitos'];
    expected_resources := array['0d520c63-7e6b-4a79-97c3-bf145d05a1c1', 'd403c5a6-cf13-42a8-8eff-ca4d891d74f7'];
  elsif p_bucket = 'hiv_casos' then
    expected_function := 'sync-saude-hiv-casos';
    expected_url := 'https://dadosabertos.go.gov.br/dataset/ist-aids';
    allowed_categories := array['hiv'];
    allowed_metrics := array['diagnosticos_ano', 'obitos_anual', 'diagnosticos_sexo', 'diagnosticos_faixa_etaria', 'gestantes_ano', 'gestantes_taxa_deteccao', 'total_diagnosticos', 'total_obitos', 'total_gestantes'];
    replaceable_summaries := array['total_diagnosticos', 'total_obitos', 'total_gestantes'];
    expected_resources := array['9cac6ec3-47f5-4e85-9a2f-ae7acbe94810', '8d563b7f-01b0-4d1e-9be9-eaa39082f204', '89737856-1272-40f9-8bb9-061a8bb933d9', '03cc41bf-4aa6-4f93-86d9-5cc375bf18a3', '6ed31d56-ffea-48ec-ba78-d6284cc973cc'];
  else
    raise exception 'bucket de saude nao autorizado';
  end if;

  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_typeof(p_sources) is distinct from 'array' then
    raise exception 'payload de saude deve conter arrays';
  end if;
  row_count := jsonb_array_length(p_rows);
  if row_count < 1 or row_count > 5000 or jsonb_array_length(p_sources) <> cardinality(expected_resources) then
    raise exception 'cobertura de saude vazia, excessiva ou incompleta';
  end if;
  for entry in select value from jsonb_array_elements(p_sources) loop
    if jsonb_typeof(entry) <> 'object'
      or (entry - array['resource_id', 'source_total', 'fetched', 'complete']) <> '{}'::jsonb
      or not coalesce((entry->>'resource_id') = any(expected_resources), false)
      or entry->'complete' is distinct from 'true'::jsonb
      or jsonb_typeof(entry->'source_total') is distinct from 'number'
      or jsonb_typeof(entry->'fetched') is distinct from 'number' then
      raise exception 'comprovante CKAN invalido';
    end if;
    if (entry->>'source_total')::numeric not between 0 and 20000
      or (entry->>'source_total')::numeric <> trunc((entry->>'source_total')::numeric)
      or (entry->>'fetched')::numeric <> (entry->>'source_total')::numeric then
      raise exception 'paginacao CKAN nao foi concluida';
    end if;
  end loop;
  if (select count(distinct value->>'resource_id') from jsonb_array_elements(p_sources)) <> cardinality(expected_resources) then
    raise exception 'recurso CKAN repetido';
  end if;

  for entry in select value from jsonb_array_elements(p_rows) loop
    if jsonb_typeof(entry) <> 'object'
      or (entry - array['categoria', 'indicador', 'ano', 'mes', 'semana_epidemiologica', 'valor', 'valor_texto', 'fonte', 'fonte_url']) <> '{}'::jsonb then
      raise exception 'campos do indicador nao autorizados';
    end if;
    category := entry->>'categoria';
    metric := entry->>'indicador';
    expected_source := case when p_bucket = 'mortalidade' or metric in ('obitos_anual', 'total_obitos') then source_sim else source_sinan end;
    if not coalesce(category = any(allowed_categories) and metric = any(allowed_metrics), false)
      or entry->>'fonte_url' is distinct from expected_url
      or entry->>'fonte' is distinct from expected_source
      or jsonb_typeof(entry->'ano') is distinct from 'number'
      or jsonb_typeof(entry->'valor') is distinct from 'number'
      or coalesce(jsonb_typeof(entry->'mes'), 'null') not in ('number', 'null')
      or coalesce(jsonb_typeof(entry->'semana_epidemiologica'), 'null') <> 'null'
      or coalesce(jsonb_typeof(entry->'valor_texto'), 'null') not in ('string', 'null')
      or length(coalesce(entry->>'valor_texto', '')) > 500 then
      raise exception 'indicador fora do escopo ou malformado';
    end if;
    if (entry->>'ano')::numeric not between 1900 and extract(year from current_date)
      or (entry->>'ano')::numeric <> trunc((entry->>'ano')::numeric)
      or (entry->>'valor')::numeric not between 0 and 1000000000
      or (metric <> 'gestantes_taxa_deteccao' and (entry->>'valor')::numeric <> trunc((entry->>'valor')::numeric)) then
      raise exception 'ano ou valor de saude invalido';
    end if;
    if metric in ('obitos_sexo', 'obitos_causa_capitulo', 'obitos_faixa_etaria', 'diagnosticos_sexo', 'diagnosticos_faixa_etaria') then
      if entry->>'mes' is null or (entry->>'mes')::numeric not between 1 and 99
        or (entry->>'mes')::numeric <> trunc((entry->>'mes')::numeric) then
        raise exception 'dimensao do indicador invalida';
      end if;
    elsif entry->>'mes' is not null then
      raise exception 'indicador anual nao admite dimensao mensal';
    end if;
  end loop;
  if exists (
    select 1 from jsonb_to_recordset(p_rows) as r(categoria text, indicador text, ano integer, mes integer, semana_epidemiologica integer)
    group by categoria, indicador, ano, coalesce(mes, 0), coalesce(semana_epidemiologica, 0) having count(*) > 1
  ) then
    raise exception 'identidade de indicador repetida';
  end if;

  -- Totais obrigatorios impedem substituir um historico por fragmentos.
  foreach category in array allowed_categories loop
    if p_bucket = 'mortalidade' then
      if not exists (select 1 from jsonb_array_elements(p_rows) r where r->>'categoria' = category and r->>'indicador' = 'obitos_anual')
        or (select count(*) from jsonb_array_elements(p_rows) r where r->>'categoria' = category and r->>'indicador' = 'total_obitos') <> 1
        or (select sum((r->>'valor')::numeric) from jsonb_array_elements(p_rows) r where r->>'categoria' = category and r->>'indicador' = 'obitos_anual') is distinct from
          (select (r->>'valor')::numeric from jsonb_array_elements(p_rows) r where r->>'categoria' = category and r->>'indicador' = 'total_obitos') then
        raise exception 'serie de mortalidade incompleta';
      end if;
    else
      if not exists (select 1 from jsonb_array_elements(p_rows) r where r->>'indicador' = 'diagnosticos_ano') then
        raise exception 'serie principal de HIV vazia';
      end if;
      foreach metric in array array['diagnosticos', 'obitos', 'gestantes'] loop
        if (select count(*) from jsonb_array_elements(p_rows) r where r->>'indicador' = 'total_' || metric) <> 1
          or (select coalesce(sum((r->>'valor')::numeric), 0) from jsonb_array_elements(p_rows) r where r->>'indicador' = case metric when 'diagnosticos' then 'diagnosticos_ano' when 'obitos' then 'obitos_anual' else 'gestantes_ano' end) is distinct from
            (select (r->>'valor')::numeric from jsonb_array_elements(p_rows) r where r->>'indicador' = 'total_' || metric) then
          raise exception 'serie de HIV incompleta';
        end if;
      end loop;
      if (select (r->>'valor')::numeric from jsonb_array_elements(p_rows) r where r->>'indicador' = 'total_diagnosticos') <>
        (select sum((s->>'fetched')::numeric) from jsonb_array_elements(p_sources) s where s->>'resource_id' = any(expected_resources[1:3]))
        or (select (r->>'valor')::numeric from jsonb_array_elements(p_rows) r where r->>'indicador' = 'total_obitos') <>
          (select (s->>'fetched')::numeric from jsonb_array_elements(p_sources) s where s->>'resource_id' = expected_resources[5])
        or (select (r->>'valor')::numeric from jsonb_array_elements(p_rows) r where r->>'indicador' = 'total_gestantes') <>
          (select (s->>'fetched')::numeric from jsonb_array_elements(p_sources) s where s->>'resource_id' = expected_resources[3])
        or (select count(*) from jsonb_array_elements(p_rows) r where r->>'indicador' = 'gestantes_taxa_deteccao') <>
          (select (s->>'fetched')::numeric from jsonb_array_elements(p_sources) s where s->>'resource_id' = expected_resources[4]) then
        raise exception 'indicadores de HIV nao cobrem todos os registros lidos';
      end if;
    end if;
  end loop;
  if p_bucket = 'mortalidade' and exists (select 1 from jsonb_array_elements(p_sources) s where (s->>'fetched')::integer = 0) then
    raise exception 'fonte de mortalidade vazia';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('saude_snapshot:' || p_bucket, 0));
  perform 1 from public.sync_log where id = p_log_id and tipo = expected_function and status = 'running' for update;
  if not found then raise exception 'log ativo do coletor nao encontrado'; end if;
  if exists (
    select 1 from public.sync_log newer join public.sync_log current_run on current_run.id = p_log_id
    where newer.tipo = expected_function and newer.status = 'success' and newer.started_at > current_run.started_at
  ) then raise exception 'snapshot mais recente ja foi confirmado'; end if;
  -- Outros coletores nao usam o advisory lock. A trava evita colisao entre
  -- a verificacao da fonte proprietaria e o upsert, sem bloquear consultas.
  lock table public.saude_indicadores in share row exclusive mode;
  if exists (
    select 1 from public.saude_indicadores old
    join jsonb_to_recordset(p_rows) as r(categoria text, indicador text, ano integer, mes integer, semana_epidemiologica integer)
      on old.categoria = r.categoria and old.indicador = r.indicador and old.ano = r.ano
      and coalesce(old.mes, 0) = coalesce(r.mes, 0) and coalesce(old.semana_epidemiologica, 0) = coalesce(r.semana_epidemiologica, 0)
    where old.fonte_url is distinct from expected_url
  ) then raise exception 'identidade de indicador pertence a outra fonte'; end if;

  -- URL igual nao comprova exclusividade de um historico. A serie SIM antiga
  -- de HIV coexiste com o recurso atual, cujo intervalo e mais curto.
  -- Preservar identidades ausentes; substituir somente resumos reapresentados.
  select count(*) into preserved_count from public.saude_indicadores old
  where old.categoria = any(allowed_categories) and old.indicador = any(allowed_metrics) and old.fonte_url = expected_url
    and not exists (select 1 from jsonb_to_recordset(p_rows) as r(categoria text, indicador text, ano integer, mes integer, semana_epidemiologica integer)
      where old.categoria = r.categoria and old.indicador = r.indicador and old.ano = r.ano and coalesce(old.mes, 0) = coalesce(r.mes, 0) and coalesce(old.semana_epidemiologica, 0) = coalesce(r.semana_epidemiologica, 0))
    and not (old.indicador = any(replaceable_summaries) and exists (select 1 from jsonb_array_elements(p_rows) r where r->>'categoria' = old.categoria and r->>'indicador' = old.indicador));

  with changed as (
    insert into public.saude_indicadores as old (categoria, indicador, ano, mes, semana_epidemiologica, valor, valor_texto, fonte, fonte_url)
    select categoria, indicador, ano, mes, semana_epidemiologica, valor, valor_texto, fonte, fonte_url
    from jsonb_to_recordset(p_rows) as r(categoria text, indicador text, ano integer, mes integer, semana_epidemiologica integer, valor numeric, valor_texto text, fonte text, fonte_url text)
    on conflict (categoria, indicador, ano, (coalesce(mes, 0)), (coalesce(semana_epidemiologica, 0))) do update
      set valor = excluded.valor, valor_texto = excluded.valor_texto, fonte = excluded.fonte, fonte_url = excluded.fonte_url, updated_at = now()
      where (old.valor, old.valor_texto, old.fonte, old.fonte_url) is distinct from (excluded.valor, excluded.valor_texto, excluded.fonte, excluded.fonte_url)
    returning xmax = 0 as inserted
  ) select count(*) filter (where inserted), count(*) filter (where not inserted) into inserted_count, updated_count from changed;

  -- Remover apenas resumos antigos que o payload comprovadamente substitui.
  -- Series historicas ausentes e taxas IBGE/SIDRA ficam preservadas.
  delete from public.saude_indicadores old
  where old.categoria = any(allowed_categories) and old.indicador = any(replaceable_summaries) and old.fonte_url = expected_url
    and exists (select 1 from jsonb_array_elements(p_rows) r where r->>'categoria' = old.categoria and r->>'indicador' = old.indicador)
    and not exists (
      select 1 from jsonb_to_recordset(p_rows) as r(categoria text, indicador text, ano integer, mes integer, semana_epidemiologica integer)
      where old.categoria = r.categoria and old.indicador = r.indicador and old.ano = r.ano
        and coalesce(old.mes, 0) = coalesce(r.mes, 0) and coalesce(old.semana_epidemiologica, 0) = coalesce(r.semana_epidemiologica, 0)
    );
  get diagnostics removed_count = row_count;
  if (select count(*) from public.saude_indicadores old where old.categoria = any(allowed_categories) and old.indicador = any(allowed_metrics) and old.fonte_url = expected_url) <> row_count + preserved_count
    or (select count(*) from public.saude_indicadores old
      join jsonb_to_recordset(p_rows) as r(categoria text, indicador text, ano integer, mes integer, semana_epidemiologica integer, valor numeric, valor_texto text, fonte text, fonte_url text)
        on old.categoria = r.categoria and old.indicador = r.indicador and old.ano = r.ano
        and coalesce(old.mes, 0) = coalesce(r.mes, 0) and coalesce(old.semana_epidemiologica, 0) = coalesce(r.semana_epidemiologica, 0)
      where (old.valor, old.valor_texto, old.fonte, old.fonte_url) is not distinct from (r.valor, r.valor_texto, r.fonte, r.fonte_url)) <> row_count then
    raise exception 'estado gravado nao confirma o snapshot integral';
  end if;
  result := jsonb_build_object('status', 'success', 'total', row_count, 'inserted', inserted_count, 'updated', updated_count, 'unchanged', row_count - inserted_count - updated_count, 'removed', removed_count, 'preserved_missing', preserved_count, 'sources', p_sources);
  update public.sync_log set status = 'success', finished_at = now(), detalhes = result || jsonb_build_object('mode', 'upsert_atomico_com_historico_preservado') where id = p_log_id;
  return result;
end;
$snapshot$;

revoke all on function public.replace_saude_snapshot(text, uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.replace_saude_snapshot(text, uuid, jsonb, jsonb) to service_role;

-- HEALTH_SNAPSHOT_CRON_CUTOVER
-- Dependencia: 20260907153655_observabilidade_leis_cron_seguro.sql.
-- Base confirmada apos aplicacao, sem alterar agenda ou estado dos jobs.
do $cutover$
declare
  definition text;
  corrected text;
  job record;
  id_job bigint;
  digest text;
  expected_secure text;
begin
  select pg_get_functiondef('public.invoke_edge_function_secure(text,jsonb)'::regprocedure) into definition;
  if md5(definition) = '5ae5e30de13f3b2dff3071a66164df54' then
    corrected := replace(definition,
      $anchor$      'sync-presenca-centi',$anchor$,
      $addition$      'sync-mortalidade',
      'sync-saude-hiv-casos',
      'sync-presenca-centi',$addition$);
    if md5(corrected) <> 'b2ddb4b841f9fb5654a759a014e1a98f' then
      raise exception 'allowlist de saude diverge da revisao';
    end if;
    execute corrected;
  elsif md5(definition) <> 'b2ddb4b841f9fb5654a759a014e1a98f' then
    raise exception 'wrapper seguro mudou depois da base 70300; revisar antes do cutover';
  end if;
  for job in select * from (values
    ('sync-mortalidade-quarterly', 'sync-mortalidade', 'f883a449f43115800174824c38243f08'),
    ('sync-saude-hiv-casos-quarterly', 'sync-saude-hiv-casos', 'f87fa8864b76f948e3418d645bafa01c')
  ) as jobs(job_name, function_name, old_digest) loop
    expected_secure := format('SELECT public.invoke_edge_function_secure(%L);', job.function_name);
    if (select count(*) from cron.job where jobname = job.job_name) <> 1 then
      raise exception 'cron de saude ausente ou ambiguo';
    end if;
    select j.jobid, md5(j.command) into id_job, digest from cron.job j where j.jobname = job.job_name;
    if id_job is null or digest not in (job.old_digest, md5(expected_secure)) then
      raise exception 'comando de cron de saude mudou desde o backup';
    end if;
    perform cron.alter_job(id_job, command := expected_secure);
  end loop;
end;
$cutover$;
