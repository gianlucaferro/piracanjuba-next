-- Somente leitura. Guardar resultado antes de aplicar a migration aprovada.
select jsonb_build_object(
  'captured_at', now(),
  'policies', (select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname)
    from pg_policies p where (schemaname='public' and tablename in ('farmacia_fotos','sync_job_registry'))
      or (schemaname='storage' and tablename='objects')),
  'grants', (select jsonb_agg(to_jsonb(g) order by table_name,grantee,privilege_type)
    from information_schema.role_table_grants g where table_schema='public' and table_name in ('farmacia_fotos','sync_job_registry')),
  'table_acl', (select jsonb_agg(jsonb_build_object('table',c.relname,'grantee',case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end,
    'privilege',x.privilege_type,'grantable',x.is_grantable))
    from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x
    where c.oid in ('public.farmacia_fotos'::regclass,'public.sync_job_registry'::regclass)),
  'column_acl', (select jsonb_agg(jsonb_build_object('table',a.attrelid::regclass::text,'column',a.attname,'acl',a.attacl))
    from pg_attribute a where a.attrelid in ('public.farmacia_fotos'::regclass,'public.sync_job_registry'::regclass)
      and a.attnum>0 and not a.attisdropped and a.attacl is not null),
  'bucket', (select jsonb_build_object('id',id,'public',public,'file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types)
    from storage.buckets where id='farmacia-fotos'),
  'rls', (select jsonb_agg(jsonb_build_object('table',relname,'rls',relrowsecurity)) from pg_class
    where oid in ('public.farmacia_fotos'::regclass,'public.sync_job_registry'::regclass,'storage.objects'::regclass))
) as metadata_backup;
