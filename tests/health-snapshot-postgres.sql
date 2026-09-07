\set ON_ERROR_STOP on

create function public.fixture_assert(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'fixture: %', message; end if; end; $$;

create function public.fixture_mortality(summary_year integer default 2024, general_total integer default 2) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('categoria', c, 'indicador', i, 'ano', y, 'valor', v, 'fonte', 'SES-GO / Dados Abertos Goiás (SIM)', 'fonte_url', 'https://dadosabertos.go.gov.br/dataset/mortalidade'))
  from (values ('mortalidade_geral', 'obitos_anual', 2024, general_total), ('mortalidade_geral', 'total_obitos', summary_year, general_total), ('mortalidade_infantil', 'obitos_anual', 2024, 1), ('mortalidade_infantil', 'total_obitos', 2024, 1)) as x(c, i, y, v);
$$;
create function public.fixture_mortality_sources() returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('resource_id', id, 'source_total', 1, 'fetched', 1, 'complete', true))
  from (values ('0d520c63-7e6b-4a79-97c3-bf145d05a1c1'), ('d403c5a6-cf13-42a8-8eff-ca4d891d74f7')) x(id);
$$;
create function public.fixture_hiv() returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('categoria', 'hiv', 'indicador', i, 'ano', 2024, 'valor', v, 'fonte', 'SES-GO / Dados Abertos Goiás (' || case when i in ('obitos_anual', 'total_obitos') then 'SIM' else 'SINAN' end || ')', 'fonte_url', 'https://dadosabertos.go.gov.br/dataset/ist-aids'))
  from (values ('diagnosticos_ano', 1), ('total_diagnosticos', 1), ('obitos_anual', 1), ('total_obitos', 1), ('total_gestantes', 0)) as x(i, v);
$$;
create function public.fixture_hiv_sources() returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('resource_id', id, 'source_total', n, 'fetched', n, 'complete', true))
  from (values ('9cac6ec3-47f5-4e85-9a2f-ae7acbe94810', 1), ('8d563b7f-01b0-4d1e-9be9-eaa39082f204', 0), ('89737856-1272-40f9-8bb9-061a8bb933d9', 0), ('03cc41bf-4aa6-4f93-86d9-5cc375bf18a3', 0), ('6ed31d56-ffea-48ec-ba78-d6284cc973cc', 1)) x(id, n);
$$;

insert into public.saude_indicadores(categoria, indicador, ano, mes, valor, fonte, fonte_url, updated_at)
select categoria, indicador, case when categoria = 'mortalidade_geral' and indicador = 'total_obitos' then 2023 else ano end, 0, 1, fonte, fonte_url, '2020-01-01'::timestamptz
from jsonb_to_recordset(public.fixture_mortality()) as r(categoria text, indicador text, ano integer, valor numeric, fonte text, fonte_url text);
insert into public.saude_indicadores(categoria, indicador, ano, valor, fonte, fonte_url, updated_at) values
  ('mortalidade_infantil', 'taxa_mortalidade_infantil', 2007, 25, 'IBGE', 'https://servicodados.ibge.gov.br', '2020-01-01'),
  ('mortalidade_infantil', 'taxa_anual', 2024, 10, 'IBGE', 'https://sidra.ibge.gov.br', '2020-01-01'),
  ('hiv', 'casos_anual', 2024, 3, 'outra serie', 'https://example.test', '2020-01-01');
create temp table original as table public.saude_indicadores;

do $$
declare log_id uuid; result jsonb;
begin
  insert into public.sync_log(tipo, status) values ('sync-mortalidade', 'running') returning id into log_id;
  result := public.replace_saude_snapshot('mortalidade', log_id, public.fixture_mortality(), public.fixture_mortality_sources());
  perform public.fixture_assert(result @> '{"inserted":1,"updated":1,"unchanged":2,"removed":1,"total":4,"status":"success"}', 'contagens de insert, update, unchanged e prune');
  perform public.fixture_assert((select status = 'success' and finished_at is not null from public.sync_log where id = log_id), 'log concluido na mesma transacao');
  perform public.fixture_assert(not exists (select 1 from original o join public.saude_indicadores n using (categoria, indicador, ano) where o.id <> n.id), 'IDs existentes preservados com dimensao 0/null');
  perform public.fixture_assert(not exists (select 1 from original o join public.saude_indicadores n using (id) where o.categoria = 'mortalidade_infantil' and o.updated_at <> n.updated_at), 'updated_at de indicadores identicos preservado');
  perform public.fixture_assert((select valor = 25 and updated_at = '2020-01-01' from public.saude_indicadores where indicador = 'taxa_mortalidade_infantil'), 'taxa canonica do IBGE preservada');
  perform public.fixture_assert((select count(*) = 1 from public.saude_indicadores where indicador = 'taxa_anual'), 'outra taxa fora do escopo preservada');
  insert into public.sync_log(tipo, status) values ('sync-mortalidade', 'running') returning id into log_id;
  result := public.replace_saude_snapshot('mortalidade', log_id, public.fixture_mortality(), public.fixture_mortality_sources());
  perform public.fixture_assert(result @> '{"inserted":0,"updated":0,"unchanged":4,"removed":0}', 'reexecucao idempotente');
end; $$;

create function public.fixture_inject_failure() returns trigger language plpgsql as $$
begin
  if current_setting('fixture.failpoint', true) = TG_TABLE_NAME || ':' || TG_OP then raise exception 'falha injetada depois de %', TG_OP; end if;
  return coalesce(new, old);
end; $$;
create trigger fixture_indicator_failure after insert or delete or update on public.saude_indicadores for each row execute function public.fixture_inject_failure();
create trigger fixture_log_failure after update on public.sync_log for each row execute function public.fixture_inject_failure();
create function public.fixture_silent_failure() returns trigger language plpgsql as $$
begin
  if current_setting('fixture.failpoint', true) = 'silent' then return null; end if;
  return new;
end; $$;
create trigger fixture_silent_failure before insert on public.saude_indicadores for each row execute function public.fixture_silent_failure();
create temp table before_failures as table public.saude_indicadores;

do $$
declare point text; log_id uuid; failed boolean;
begin
  foreach point in array array['saude_indicadores:INSERT', 'saude_indicadores:UPDATE', 'saude_indicadores:DELETE', 'sync_log:UPDATE', 'silent'] loop
    insert into public.sync_log(tipo, status) values ('sync-mortalidade', 'running') returning id into log_id;
    perform set_config('fixture.failpoint', point, true);
    failed := false;
    begin perform public.replace_saude_snapshot('mortalidade', log_id, public.fixture_mortality(2025, 3), public.fixture_mortality_sources());
    exception when raise_exception then failed := true; end;
    perform set_config('fixture.failpoint', '', true);
    perform public.fixture_assert(failed, 'falha injetada deve abortar ' || point);
    perform public.fixture_assert(not exists ((table public.saude_indicadores except table before_failures) union all (table before_failures except table public.saude_indicadores)), 'rollback integral de dados e timestamps ' || point);
    perform public.fixture_assert((select status = 'running' and finished_at is null from public.sync_log where id = log_id), 'falha nao registra sucesso ' || point);
  end loop;
end; $$;

do $$
declare log_id uuid; bad jsonb; failed boolean;
begin
  insert into public.sync_log(tipo, status) values ('sync-mortalidade', 'running') returning id into log_id;
  for bad in select unnest(array[
    '[]'::jsonb,
    public.fixture_mortality() || (public.fixture_mortality()->0),
    jsonb_set(public.fixture_mortality(), '{0,categoria}', '"hiv"'),
    jsonb_set(public.fixture_mortality(), '{0,indicador}', '"taxa_mortalidade_infantil"'),
    jsonb_set(public.fixture_mortality(), '{0,valor}', 'null'),
    jsonb_set(public.fixture_mortality(), '{0,ano}', '2024.5'),
    jsonb_set(public.fixture_mortality(), '{0,id}', '"arbitrary"'),
    jsonb_set(public.fixture_mortality(), '{0,fonte_url}', '"https://example.test"')
  ]) loop
    failed := false;
    begin perform public.replace_saude_snapshot('mortalidade', log_id, bad, public.fixture_mortality_sources());
    exception when raise_exception then failed := true; end;
    perform public.fixture_assert(failed, 'payload invalido deve ser recusado');
  end loop;
  failed := false;
  begin perform public.replace_saude_snapshot('mortalidade', log_id, public.fixture_mortality(), jsonb_set(public.fixture_mortality_sources(), '{0,fetched}', '0'));
  exception when raise_exception then failed := true; end;
  perform public.fixture_assert(failed, 'cobertura parcial deve ser recusada');
  failed := false;
  begin perform public.replace_saude_snapshot('categoria-livre', log_id, public.fixture_mortality(), public.fixture_mortality_sources());
  exception when raise_exception then failed := true; end;
  perform public.fixture_assert(failed, 'bucket arbitrario deve ser recusado');
  perform public.fixture_assert(not exists ((table public.saude_indicadores except table before_failures) union all (table before_failures except table public.saude_indicadores)), 'validacao nao altera dados');
end; $$;

do $$
declare log_id uuid; result jsonb; failed boolean; foreign_url text;
begin
  insert into public.saude_indicadores(categoria, indicador, ano, valor, fonte, fonte_url, updated_at)
  values ('hiv', 'obitos_anual', 1996, 1, 'SES-GO / Dados Abertos Goiás (SIM)', 'https://dadosabertos.go.gov.br/dataset/ist-aids', '2020-01-01');
  insert into public.sync_log(tipo, status) values ('sync-saude-hiv-casos', 'running') returning id into log_id;
  result := public.replace_saude_snapshot('hiv_casos', log_id, public.fixture_hiv(), public.fixture_hiv_sources());
  perform public.fixture_assert(result @> '{"inserted":5,"updated":0,"unchanged":0,"removed":0,"preserved_missing":1}', 'HIV confirma cinco indicadores e reporta historico ausente preservado');
  perform public.fixture_assert((select valor = 1 and updated_at = '2020-01-01' from public.saude_indicadores where categoria = 'hiv' and indicador = 'obitos_anual' and ano = 1996), 'HIV preserva historico com o mesmo fonte_url fora da cobertura atual');
  perform public.fixture_assert((select valor = 3 from public.saude_indicadores where categoria = 'hiv' and indicador = 'casos_anual'), 'HIV nao apaga serie de outro coletor');
  foreach foreign_url in array array['https://example.test', null] loop
    update public.saude_indicadores set fonte_url = foreign_url where categoria = 'hiv' and indicador = 'obitos_anual' and ano = 2024;
    insert into public.sync_log(tipo, status) values ('sync-saude-hiv-casos', 'running') returning id into log_id;
    failed := false;
    begin perform public.replace_saude_snapshot('hiv_casos', log_id, public.fixture_hiv(), public.fixture_hiv_sources());
    exception when raise_exception then failed := true; end;
    perform public.fixture_assert(failed, 'colisao com fonte externa ou ausente deve abortar');
    perform public.fixture_assert((select fonte_url is not distinct from foreign_url from public.saude_indicadores where categoria = 'hiv' and indicador = 'obitos_anual' and ano = 2024), 'fonte externa ou NULL preservada');
  end loop;
end; $$;

select public.fixture_assert(not has_function_privilege('anon', 'public.replace_saude_snapshot(text,uuid,jsonb,jsonb)', 'EXECUTE'), 'anon nao executa RPC');
select public.fixture_assert(not has_function_privilege('authenticated', 'public.replace_saude_snapshot(text,uuid,jsonb,jsonb)', 'EXECUTE'), 'authenticated nao executa RPC');
select public.fixture_assert(has_function_privilege('service_role', 'public.replace_saude_snapshot(text,uuid,jsonb,jsonb)', 'EXECUTE'), 'somente service_role tem grant');
select 'PASS: atomicidade, cinco falhas injetadas, identidades, taxas IBGE, escopo, validacao e grants' as validation;
