-- Consolida apenas as competencias cobertas pela tabela canonica NucleoGov.
-- Versao aplicada em producao: 20260724170040.
-- O historico fora desse recorte permanece intacto. Todas as linhas removidas
-- ficam arquivadas e existe uma funcao de restauracao restrita ao postgres.

create table if not exists public.remuneracao_servidores_backup_20260724
as
select
  remuneracao.*,
  now()::timestamptz as archived_at,
  ''::text as archive_reason
from public.remuneracao_servidores remuneracao
with no data;

create unique index if not exists
  remuneracao_servidores_backup_20260724_id_uidx
  on public.remuneracao_servidores_backup_20260724 (id);

alter table public.remuneracao_servidores_backup_20260724
  enable row level security;
revoke all on public.remuneracao_servidores_backup_20260724
  from public, anon, authenticated;

insert into public.remuneracao_servidores_backup_20260724
select
  remuneracao.*,
  now(),
  'Reconstrucao pela folha canonica NucleoGov'
from public.remuneracao_servidores remuneracao
join public.servidores servidor on servidor.id = remuneracao.servidor_id
where servidor.origem_chave like 'prefeitura:nucleogov:%'
  and exists (
    select 1
    from public.prefeitura_folha_nucleogov folha
    where folha.portal_id = servidor.nucleogov_portal_id
      and remuneracao.competencia =
        folha.ano::text || '-' || lpad(folha.mes::text, 2, '0')
  )
on conflict (id) do nothing;

delete from public.remuneracao_servidores remuneracao
using public.servidores servidor
where servidor.id = remuneracao.servidor_id
  and servidor.origem_chave like 'prefeitura:nucleogov:%'
  and exists (
    select 1
    from public.prefeitura_folha_nucleogov folha
    where folha.portal_id = servidor.nucleogov_portal_id
      and remuneracao.competencia =
        folha.ano::text || '-' || lpad(folha.mes::text, 2, '0')
  );

insert into public.remuneracao_servidores (
  servidor_id,
  competencia,
  bruto,
  liquido,
  fonte_url,
  updated_at,
  tipo_folha
)
select
  servidor.id,
  folha.ano::text || '-' || lpad(folha.mes::text, 2, '0'),
  folha.total_proventos,
  folha.total_liquido,
  folha.fonte_url,
  folha.updated_at,
  coalesce(nullif(btrim(folha.tipo_folha), ''), 'NORMAL')
from public.prefeitura_folha_nucleogov folha
join public.servidores servidor
  on servidor.origem_chave =
    'prefeitura:nucleogov:' || folha.portal_id::text
on conflict (servidor_id, competencia, tipo_folha) do update
set
  bruto = excluded.bruto,
  liquido = excluded.liquido,
  fonte_url = excluded.fonte_url,
  updated_at = excluded.updated_at;

do $$
declare
  esperado integer;
  encontrado integer;
  mapeamentos_ausentes integer;
  divergencias integer;
begin
  select count(*) into esperado
  from public.prefeitura_folha_nucleogov;

  select count(*) into mapeamentos_ausentes
  from public.prefeitura_folha_nucleogov folha
  left join public.servidores servidor
    on servidor.origem_chave =
      'prefeitura:nucleogov:' || folha.portal_id::text
  where servidor.id is null;

  if mapeamentos_ausentes <> 0 then
    raise exception
      'Consolidacao de remuneracao abortada: % identidades sem mapeamento',
      mapeamentos_ausentes;
  end if;

  select count(*) into encontrado
  from public.remuneracao_servidores remuneracao
  join public.servidores servidor on servidor.id = remuneracao.servidor_id
  join public.prefeitura_folha_nucleogov folha
    on servidor.origem_chave =
      'prefeitura:nucleogov:' || folha.portal_id::text
    and remuneracao.competencia =
      folha.ano::text || '-' || lpad(folha.mes::text, 2, '0')
    and remuneracao.tipo_folha =
      coalesce(nullif(btrim(folha.tipo_folha), ''), 'NORMAL');

  if encontrado <> esperado then
    raise exception
      'Consolidacao de remuneracao abortada: esperado %, encontrado %',
      esperado,
      encontrado;
  end if;

  select count(*) into divergencias
  from public.prefeitura_folha_nucleogov folha
  join public.servidores servidor
    on servidor.origem_chave =
      'prefeitura:nucleogov:' || folha.portal_id::text
  left join public.remuneracao_servidores remuneracao
    on remuneracao.servidor_id = servidor.id
    and remuneracao.competencia =
      folha.ano::text || '-' || lpad(folha.mes::text, 2, '0')
    and remuneracao.tipo_folha =
      coalesce(nullif(btrim(folha.tipo_folha), ''), 'NORMAL')
    and remuneracao.bruto is not distinct from folha.total_proventos
    and remuneracao.liquido is not distinct from folha.total_liquido
  where remuneracao.id is null;

  if divergencias <> 0 then
    raise exception
      'Consolidacao de remuneracao abortada: % valores divergentes',
      divergencias;
  end if;
end
$$;

create or replace function
  public.restore_remuneracao_servidores_backup_20260724()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  restauradas integer;
begin
  delete from public.remuneracao_servidores remuneracao
  where exists (
    select 1
    from public.remuneracao_servidores_backup_20260724 backup
    where backup.servidor_id = remuneracao.servidor_id
      and backup.competencia = remuneracao.competencia
  );

  insert into public.remuneracao_servidores (
    id,
    servidor_id,
    competencia,
    bruto,
    liquido,
    fonte_url,
    updated_at,
    tipo_folha
  )
  select
    backup.id,
    backup.servidor_id,
    backup.competencia,
    backup.bruto,
    backup.liquido,
    backup.fonte_url,
    backup.updated_at,
    backup.tipo_folha
  from public.remuneracao_servidores_backup_20260724 backup
  on conflict (id) do update
  set
    servidor_id = excluded.servidor_id,
    competencia = excluded.competencia,
    bruto = excluded.bruto,
    liquido = excluded.liquido,
    fonte_url = excluded.fonte_url,
    updated_at = excluded.updated_at,
    tipo_folha = excluded.tipo_folha;

  get diagnostics restauradas = row_count;

  return jsonb_build_object(
    'restauradas', restauradas,
    'executado_em', now()
  );
end;
$$;

revoke execute on function
  public.restore_remuneracao_servidores_backup_20260724()
  from public, anon, authenticated, service_role;
grant execute on function
  public.restore_remuneracao_servidores_backup_20260724()
  to postgres;
