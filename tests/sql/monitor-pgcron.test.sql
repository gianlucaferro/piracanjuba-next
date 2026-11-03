\set ON_ERROR_STOP on
-- Executar exclusivamente em um banco descartavel PostgreSQL 17.
begin;
create role anon;
create role authenticated;
create role service_role bypassrls;
grant usage on schema public to anon, authenticated, service_role;
create schema cron;
create table cron.job(jobid bigint primary key, jobname text, active boolean);
create table cron.job_run_details(jobid bigint, start_time timestamptz);
create table public.sync_job_registry(
  function_name text, frequency_tier text, data_source text, description_pt text,
  cron_expression text, max_stale_hours integer, is_active boolean, cron_name text
);
create table public.sync_log(id uuid primary key, tipo text, status text, started_at timestamptz, finished_at timestamptz);
grant select on public.sync_job_registry, public.sync_log to service_role;
insert into cron.job values (1,'folha-test',true),(2,'agro-test',false);
insert into cron.job_run_details values (1,now()-interval '10 minutes'),(1,now()-interval '1 day');
insert into public.sync_job_registry values
  ('sync-folha-prefeitura-nucleogov','daily','test','Folha','0 7 * * *',36,true,'folha-test'),
  ('sync-agro','quarterly','test','Agro','0 8 1 * *',2232,true,'agro-test'),
  ('sync-educacao','semiannual','test','Educacao','0 8 1 1,7 *',4464,true,'missing-test');
insert into public.sync_log values ('00000000-0000-0000-0000-000000000001','sync-folha-prefeitura-nucleogov','success',now()-interval '10 minutes',now()-interval '9 minutes');
\ir ../../supabase/migrations/20260907153151_corrige_estados_monitoramento.sql
grant all on public.v_sync_dashboard to anon, authenticated, service_role;
create temp table expected_dashboard as select * from public.v_sync_dashboard;
\ir ../../supabase/migrations/20261103221500_desacopla_monitor_pg_cron.sql

do $test$
begin
  if exists ((select * from expected_dashboard except select * from public.v_sync_dashboard)
      union all (select * from public.v_sync_dashboard except select * from expected_dashboard)) then
    raise exception 'Resultado do painel alterado pela migration';
  end if;
  if has_table_privilege('anon','public.v_sync_dashboard','select')
      or has_table_privilege('authenticated','public.v_sync_dashboard','select')
      or has_function_privilege('anon','public.sync_cron_snapshot()','execute')
      or has_function_privilege('authenticated','public.sync_cron_snapshot()','execute') then
    raise exception 'Dados operacionais expostos a papel publico';
  end if;
end;
$test$;
set local role service_role;
do $test$
begin
  if (select count(*) from public.v_sync_dashboard) <> 3 then
    raise exception 'service_role nao le todas as linhas do painel';
  end if;
end;
$test$;
reset role;

-- Prova de independencia: remocao sem CASCADE e recriacao das tabelas da extensao.
drop table cron.job_run_details;
drop table cron.job;
do $test$
begin
  if exists (select 1 from public.v_sync_dashboard where cron_status <> 'missing' or retry_eligible) then
    raise exception 'Cron ausente deve suspender elegibilidade de retry';
  end if;
end;
$test$;
create table cron.job(jobid bigint primary key, jobname text, active boolean);
create table cron.job_run_details(jobid bigint, start_time timestamptz);
insert into cron.job values (1,'folha-test',true),(2,'agro-test',false);
insert into cron.job_run_details values (1,now()-interval '10 minutes'),(1,now()-interval '1 day');
do $test$
begin
  if exists ((select * from expected_dashboard except select * from public.v_sync_dashboard)
      union all (select * from public.v_sync_dashboard except select * from expected_dashboard)) then
    raise exception 'Painel nao recuperou dados apos recriacao do cron';
  end if;
end;
$test$;
\ir ../../supabase/rollbacks/20261103221500_desacopla_monitor_pg_cron.sql
do $test$
begin
  if md5(pg_get_viewdef('public.v_sync_dashboard'::regclass,true)) <> '467c87c80012683948bfa42d310ad14e' then
    raise exception 'Rollback nao restaurou definicao original';
  end if;
  if to_regprocedure('public.sync_cron_snapshot()') is not null then
    raise exception 'Rollback deixou helper novo';
  end if;
end;
$test$;
rollback;
\echo 'PASS: resultados, permissoes, drop/recreate sem CASCADE e rollback'
