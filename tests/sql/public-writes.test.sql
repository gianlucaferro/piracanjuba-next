\set ON_ERROR_STOP on
-- Somente PostgreSQL 17 descartavel. Nao executar contra Supabase remoto.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema storage;
grant usage on schema public, storage to anon, authenticated, service_role;
create table public.farmacia_fotos(id uuid default gen_random_uuid(), nome text unique not null, foto_url text not null, telefone text, tipo_telefone text default 'fixo', updated_at timestamptz default now());
create table public.sync_job_registry(id uuid default gen_random_uuid(), function_name text not null);
create table storage.buckets(id text primary key, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id int primary key, bucket_id text, name text);
insert into public.farmacia_fotos(nome,foto_url,telefone) values ('Drogaria São José','original.webp','(64) 3405-0000');
insert into public.sync_job_registry(function_name) values ('sync-test');
insert into storage.buckets values ('farmacia-fotos',true,null,null),('outro',true,null,null);
insert into storage.objects values (1,'farmacia-fotos','original.webp'),(2,'outro','other.webp');
alter table public.farmacia_fotos enable row level security;
alter table public.sync_job_registry enable row level security;
alter table storage.objects enable row level security;
grant all on public.farmacia_fotos, public.sync_job_registry, storage.objects to anon, authenticated, service_role;
create policy "farmacia_fotos_select" on public.farmacia_fotos for select using(true);
create policy "farmacia_fotos_insert" on public.farmacia_fotos for insert with check(true);
create policy "farmacia_fotos_update" on public.farmacia_fotos for update using(true);
create policy "farmacia_fotos_delete" on public.farmacia_fotos for delete using(true);
create policy "Service role full access" on public.sync_job_registry for all using(true);
create policy "Public read farmacia storage" on storage.objects for select using(bucket_id='farmacia-fotos');
create policy "Auth upload farmacia storage" on storage.objects for insert with check(bucket_id='farmacia-fotos');
create policy "Auth update farmacia storage" on storage.objects for update using(bucket_id='farmacia-fotos');
-- Simula futura policy generica: a restritiva deve proteger farmacia e liberar outro.
create policy "generic" on storage.objects for all using(true) with check(true);
create view public.test_admin_monitor with(security_invoker=true) as select * from public.sync_job_registry;
grant select on public.test_admin_monitor to service_role;

create temp table original_policies as select * from pg_policies where schemaname in ('public','storage');
create temp table original_grants as select * from information_schema.role_table_grants where table_schema in ('public','storage');
create temp table original_buckets as select * from storage.buckets;

\ir ../../supabase/migrations/20261104030000_restringe_escritas_publicas.sql
-- Reaplicacao nao muda dados nem duplica policies.
\ir ../../supabase/migrations/20261104030000_restringe_escritas_publicas.sql

create function public.assert_public_denied() returns void language plpgsql as $test$
declare affected int;
begin
  if (select count(*) from public.farmacia_fotos) <> 1 or (select count(*) from public.sync_job_registry) <> 1 then
    raise exception 'SELECT publico alterado';
  end if;
  if has_table_privilege(current_user,'public.farmacia_fotos','MAINTAIN') or has_table_privilege(current_user,'public.sync_job_registry','MAINTAIN') then
    raise exception 'MAINTAIN publico permitido';
  end if;
  begin
    insert into public.farmacia_fotos(nome,foto_url) values ('intruso','bad');
    raise exception 'INSERT publico de farmacia permitido';
  exception when insufficient_privilege then null; end;
  begin
    update public.farmacia_fotos set telefone='bad';
    raise exception 'UPDATE publico de farmacia permitido';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.farmacia_fotos;
    raise exception 'DELETE publico de farmacia permitido';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.sync_job_registry(function_name) values ('bad');
    raise exception 'INSERT publico de registry permitido';
  exception when insufficient_privilege then null; end;
  begin
    update public.sync_job_registry set function_name='bad';
    raise exception 'UPDATE publico de registry permitido';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.sync_job_registry;
    raise exception 'DELETE publico de registry permitido';
  exception when insufficient_privilege then null; end;
  begin
    truncate public.sync_job_registry;
    raise exception 'TRUNCATE publico permitido';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects values (99,'farmacia-fotos','bad');
    raise exception 'INSERT publico Storage permitido';
  exception when insufficient_privilege then null; end;
  update storage.objects set name='bad' where bucket_id='farmacia-fotos';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'UPDATE publico Storage permitido'; end if;
  delete from storage.objects where bucket_id='farmacia-fotos';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'DELETE publico Storage permitido'; end if;
  begin
    update storage.objects set bucket_id='farmacia-fotos' where id=2;
    raise exception 'Troca de bucket permitida';
  exception when insufficient_privilege then null; end;
  if (select count(*) from storage.objects where bucket_id='farmacia-fotos') <> 1 then
    raise exception 'SELECT Storage alterado';
  end if;
  update storage.objects set name='other-updated.webp' where id=2;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Outro bucket bloqueado'; end if;
end;
$test$;
set role anon;
select public.assert_public_denied();
reset role;
set role authenticated;
select public.assert_public_denied();
reset role;

set role service_role;
do $test$
begin
  update public.farmacia_fotos set foto_url='admin.webp';
  update public.sync_job_registry set function_name='sync-admin';
  update storage.objects set name='admin.webp' where id=1;
  if (select function_name from public.test_admin_monitor) <> 'sync-admin' then
    raise exception 'Monitor service_role bloqueado';
  end if;
  if (select telefone from public.farmacia_fotos) <> '(64) 3405-0000' then
    raise exception 'Telefone alterado';
  end if;
end;
$test$;
reset role;
drop function public.assert_public_denied();
do $test$
begin
  if (select file_size_limit from storage.buckets where id='farmacia-fotos') <> 524288 or
    (select allowed_mime_types from storage.buckets where id='farmacia-fotos') <> array['image/webp'] then
    raise exception 'Limites Storage incorretos';
  end if;
end;
$test$;

\ir ../../supabase/rollbacks/20261104030000_restringe_escritas_publicas.sql
do $test$
begin
  if exists ((select * from original_policies except select * from pg_policies where schemaname in ('public','storage'))
    union all (select * from pg_policies where schemaname in ('public','storage') except select * from original_policies)) then
    raise exception 'Rollback policies diverge';
  end if;
  if exists ((select * from original_grants except select * from information_schema.role_table_grants where table_schema in ('public','storage'))
    union all (select * from information_schema.role_table_grants where table_schema in ('public','storage') except select * from original_grants)) then
    raise exception 'Rollback grants diverge';
  end if;
  if exists ((select * from original_buckets except select * from storage.buckets) union all
    (select * from storage.buckets except select * from original_buckets)) then
    raise exception 'Rollback bucket diverge';
  end if;
end;
$test$;
\echo 'PASS: anon/auth denied, public read, admin, other bucket, reapply, rollback'
