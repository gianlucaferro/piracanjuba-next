-- Somente leitura. Nao testa escrita real nem altera dados de negocio.
select r.role_name, t.table_name,
  has_table_privilege(r.role_name,t.table_name,'SELECT') as can_read,
  has_table_privilege(r.role_name,t.table_name,'INSERT') as can_insert,
  has_table_privilege(r.role_name,t.table_name,'UPDATE') as can_update,
  has_table_privilege(r.role_name,t.table_name,'DELETE') as can_delete,
  has_table_privilege(r.role_name,t.table_name,'TRUNCATE') as can_truncate,
  has_table_privilege(r.role_name,t.table_name,'MAINTAIN') as can_maintain
from (values ('anon'),('authenticated'),('service_role')) r(role_name)
cross join (values ('public.farmacia_fotos'),('public.sync_job_registry')) t(table_name);
select policyname,permissive,roles,cmd,qual,with_check from pg_policies
where schemaname='storage' and tablename='objects' and
  (coalesce(qual,'') like '%farmacia-fotos%' or coalesce(with_check,'') like '%farmacia-fotos%')
order by policyname;
select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='farmacia-fotos';
