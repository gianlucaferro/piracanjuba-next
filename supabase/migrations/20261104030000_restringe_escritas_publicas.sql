-- Publicar admin-farmacia-update e o frontend antes deste corte de permissoes.
-- Nao altera linhas de negocio, crons, vistas ou politicas de outros buckets.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $guard$
begin
  -- O backup live nao tem grants por coluna nem grants de escrita a PUBLIC.
  -- Divergencia exige novo backup/rollback em vez de deixar um caminho alternativo.
  if exists (select 1 from pg_attribute a cross join lateral aclexplode(a.attacl) x
    where a.attrelid in ('public.farmacia_fotos'::regclass,'public.sync_job_registry'::regclass)
      and x.grantee in (0, 'anon'::regrole::oid, 'authenticated'::regrole::oid)
      and x.privilege_type in ('INSERT','UPDATE','REFERENCES'))
    or exists (select 1 from pg_class c cross join lateral aclexplode(c.relacl) x
      where c.oid in ('public.farmacia_fotos'::regclass,'public.sync_job_registry'::regclass)
        and x.grantee=0 and x.privilege_type <> 'SELECT') then
    raise exception 'ACL divergiu do backup revisado; revisar grants e rollback';
  end if;
end;
$guard$;

alter table public.farmacia_fotos enable row level security;
alter table public.sync_job_registry enable row level security;
revoke insert, update, delete, truncate, references, trigger, maintain
  on public.farmacia_fotos, public.sync_job_registry from public, anon, authenticated;
grant select on public.farmacia_fotos, public.sync_job_registry to anon, authenticated;

drop policy if exists "farmacia_fotos_insert" on public.farmacia_fotos;
drop policy if exists "farmacia_fotos_update" on public.farmacia_fotos;
drop policy if exists "farmacia_fotos_delete" on public.farmacia_fotos;
-- Esta policy tinha nome de service_role, mas concedia ALL a PUBLIC.
drop policy if exists "Service role full access" on public.sync_job_registry;
drop policy if exists "sync_job_registry_select" on public.sync_job_registry;
create policy "sync_job_registry_select" on public.sync_job_registry
  for select to anon, authenticated using (true);

drop policy if exists "Auth upload farmacia storage" on storage.objects;
drop policy if exists "Auth update farmacia storage" on storage.objects;
-- Restritivas protegem tambem contra futuras policies genericas em outros buckets.
drop policy if exists "farmacia_storage_no_public_insert" on storage.objects;
drop policy if exists "farmacia_storage_no_public_update" on storage.objects;
drop policy if exists "farmacia_storage_no_public_delete" on storage.objects;
create policy "farmacia_storage_no_public_insert" on storage.objects as restrictive
  for insert to anon, authenticated with check (bucket_id <> 'farmacia-fotos');
create policy "farmacia_storage_no_public_update" on storage.objects as restrictive
  for update to anon, authenticated using (bucket_id <> 'farmacia-fotos') with check (bucket_id <> 'farmacia-fotos');
create policy "farmacia_storage_no_public_delete" on storage.objects as restrictive
  for delete to anon, authenticated using (bucket_id <> 'farmacia-fotos');

update storage.buckets set file_size_limit = 524288, allowed_mime_types = array['image/webp']
  where id = 'farmacia-fotos';
commit;
