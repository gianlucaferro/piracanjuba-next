-- ULTIMO RECURSO: reabre as escritas anonimas originais. Preferir corrigir endpoint.
-- Snapshot de policies, grants e limites conferido em 2026-11-03.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
grant insert, update, delete, truncate, references, trigger, maintain
  on public.farmacia_fotos, public.sync_job_registry to anon, authenticated;
drop policy if exists "farmacia_fotos_insert" on public.farmacia_fotos;
drop policy if exists "farmacia_fotos_update" on public.farmacia_fotos;
drop policy if exists "farmacia_fotos_delete" on public.farmacia_fotos;
create policy "farmacia_fotos_insert" on public.farmacia_fotos for insert with check (true);
create policy "farmacia_fotos_update" on public.farmacia_fotos for update using (true);
create policy "farmacia_fotos_delete" on public.farmacia_fotos for delete using (true);
drop policy if exists "sync_job_registry_select" on public.sync_job_registry;
drop policy if exists "Service role full access" on public.sync_job_registry;
create policy "Service role full access" on public.sync_job_registry for all using (true);
drop policy if exists "farmacia_storage_no_public_insert" on storage.objects;
drop policy if exists "farmacia_storage_no_public_update" on storage.objects;
drop policy if exists "farmacia_storage_no_public_delete" on storage.objects;
drop policy if exists "Auth upload farmacia storage" on storage.objects;
drop policy if exists "Auth update farmacia storage" on storage.objects;
create policy "Auth upload farmacia storage" on storage.objects for insert with check (bucket_id = 'farmacia-fotos');
create policy "Auth update farmacia storage" on storage.objects for update using (bucket_id = 'farmacia-fotos');
update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'farmacia-fotos';
commit;
