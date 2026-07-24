-- Consolida beneficios federais sem apagar a tabela historica.
-- O corte e reversivel: beneficios_sociais permanece intacta e todas as
-- linhas anteriores ficam registradas tambem no snapshot de auditoria.

create table if not exists public.beneficios_sociais_legacy_snapshot (
  legacy_id uuid primary key,
  payload jsonb not null,
  capturado_em timestamptz not null default now()
);

alter table public.beneficios_sociais_legacy_snapshot enable row level security;
revoke all on table public.beneficios_sociais_legacy_snapshot
  from public, anon, authenticated;

insert into public.beneficios_sociais_legacy_snapshot (legacy_id, payload)
select id, to_jsonb(beneficios_sociais)
from public.beneficios_sociais
on conflict (legacy_id) do nothing;

create table if not exists public.beneficios_sociais_v2 (
  id uuid primary key default gen_random_uuid(),
  municipio text not null default 'Piracanjuba-GO',
  municipio_ibge text not null default '5217104'
    check (municipio_ibge ~ '^[0-9]{7}$'),
  programa_codigo text not null
    check (
      programa_codigo = any(array[
        'bolsa_familia',
        'bpc',
        'garantia_safra',
        'peti',
        'seguro_defeso',
        'tarifa_social'
      ]::text[])
    ),
  competencia text not null check (competencia ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  beneficiarios integer check (beneficiarios is null or beneficiarios >= 0),
  valor_pago numeric(18, 2) check (valor_pago is null or valor_pago >= 0),
  unidade_medida text,
  fonte_codigo text not null,
  fonte_nome text not null,
  fonte_url text,
  natureza_dado text not null
    check (
      natureza_dado = any(array[
        'oficial',
        'estimado',
        'referencia_regional'
      ]::text[])
    ),
  raw_payload jsonb,
  source_hash text,
  data_coleta timestamptz not null default now(),
  observacoes text,
  origem_legacy_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (
    municipio_ibge,
    programa_codigo,
    competencia,
    fonte_codigo,
    natureza_dado
  )
);

create index if not exists idx_beneficios_sociais_v2_competencia
  on public.beneficios_sociais_v2 (competencia desc);
create index if not exists idx_beneficios_sociais_v2_programa_competencia
  on public.beneficios_sociais_v2 (programa_codigo, competencia desc);

alter table public.beneficios_sociais_v2 enable row level security;

drop policy if exists "Beneficios sociais canonicos sao publicos"
  on public.beneficios_sociais_v2;
create policy "Beneficios sociais canonicos sao publicos"
  on public.beneficios_sociais_v2
  for select
  using (true);

revoke all on table public.beneficios_sociais_v2
  from public, anon, authenticated;
grant select (
  id,
  municipio,
  municipio_ibge,
  programa_codigo,
  competencia,
  beneficiarios,
  valor_pago,
  unidade_medida,
  fonte_codigo,
  fonte_nome,
  fonte_url,
  natureza_dado,
  source_hash,
  data_coleta,
  observacoes,
  updated_at
) on public.beneficios_sociais_v2 to anon, authenticated;

drop trigger if exists update_beneficios_sociais_v2_updated_at
  on public.beneficios_sociais_v2;
create trigger update_beneficios_sociais_v2_updated_at
  before update on public.beneficios_sociais_v2
  for each row
  execute function public.update_updated_at_column();

with normalizados as (
  select
    b.*,
    case
      when b.programa in ('Bolsa Família', 'bolsa_familia')
        then 'bolsa_familia'
      when b.programa in ('BPC - Benefício de Prestação Continuada', 'bpc')
        then 'bpc'
      when b.programa in ('Garantia-Safra', 'garantia_safra')
        then 'garantia_safra'
      when b.programa = 'peti'
        then 'peti'
      when b.programa in ('Seguro Defeso', 'seguro_defeso')
        then 'seguro_defeso'
      when b.programa = 'tarifa_social'
        then 'tarifa_social'
      else null
    end as programa_canonico,
    case
      when b.programa = 'tarifa_social'
        then 'estimativa_bolsa_familia'
      else 'portal_transparencia'
    end as fonte_canonica,
    case
      when b.programa = 'tarifa_social'
        then 'estimado'
      else 'oficial'
    end as natureza_canonica,
    case
      when b.programa in (
        'bolsa_familia',
        'bpc',
        'garantia_safra',
        'peti',
        'seguro_defeso',
        'tarifa_social'
      ) then 0
      else 1
    end as prioridade_alias
  from public.beneficios_sociais b
),
vencedores as (
  select distinct on (
    municipio,
    programa_canonico,
    competencia,
    fonte_canonica,
    natureza_canonica
  )
    *
  from normalizados
  where programa_canonico is not null
  order by
    municipio,
    programa_canonico,
    competencia,
    fonte_canonica,
    natureza_canonica,
    prioridade_alias,
    data_coleta desc,
    updated_at desc,
    id
)
insert into public.beneficios_sociais_v2 (
  municipio,
  municipio_ibge,
  programa_codigo,
  competencia,
  beneficiarios,
  valor_pago,
  unidade_medida,
  fonte_codigo,
  fonte_nome,
  fonte_url,
  natureza_dado,
  raw_payload,
  data_coleta,
  observacoes,
  origem_legacy_id,
  updated_at
)
select
  municipio,
  '5217104',
  programa_canonico,
  competencia,
  beneficiarios,
  valor_pago,
  unidade_medida,
  fonte_canonica,
  case
    when natureza_canonica = 'estimado'
      then 'Estimativa municipal baseada no Bolsa Família'
    else 'Portal da Transparência do Governo Federal'
  end,
  fonte_url,
  natureza_canonica,
  jsonb_build_object('legacy_row', to_jsonb(vencedores)),
  data_coleta,
  observacoes,
  id,
  updated_at
from vencedores
on conflict (
  municipio_ibge,
  programa_codigo,
  competencia,
  fonte_codigo,
  natureza_dado
) do update set
  beneficiarios = excluded.beneficiarios,
  valor_pago = excluded.valor_pago,
  unidade_medida = excluded.unidade_medida,
  fonte_nome = excluded.fonte_nome,
  fonte_url = excluded.fonte_url,
  raw_payload = excluded.raw_payload,
  data_coleta = excluded.data_coleta,
  observacoes = excluded.observacoes,
  origem_legacy_id = excluded.origem_legacy_id,
  updated_at = excluded.updated_at;

do $$
declare
  legacy_count bigint;
  snapshot_count bigint;
  expected_canonical_count bigint;
  actual_canonical_count bigint;
begin
  select count(*) into legacy_count
  from public.beneficios_sociais;

  select count(*) into snapshot_count
  from public.beneficios_sociais_legacy_snapshot;

  if snapshot_count <> legacy_count then
    raise exception
      'snapshot de beneficios incompleto: legado %, snapshot %',
      legacy_count,
      snapshot_count;
  end if;

  select count(*) into expected_canonical_count
  from (
    select distinct
      municipio,
      case
        when programa in ('Bolsa Família', 'bolsa_familia')
          then 'bolsa_familia'
        when programa in ('BPC - Benefício de Prestação Continuada', 'bpc')
          then 'bpc'
        when programa in ('Garantia-Safra', 'garantia_safra')
          then 'garantia_safra'
        when programa = 'peti'
          then 'peti'
        when programa in ('Seguro Defeso', 'seguro_defeso')
          then 'seguro_defeso'
        when programa = 'tarifa_social'
          then 'tarifa_social'
      end,
      competencia
    from public.beneficios_sociais
    where programa in (
      'Bolsa Família',
      'bolsa_familia',
      'BPC - Benefício de Prestação Continuada',
      'bpc',
      'Garantia-Safra',
      'garantia_safra',
      'peti',
      'Seguro Defeso',
      'seguro_defeso',
      'tarifa_social'
    )
  ) canonical_keys;

  select count(*) into actual_canonical_count
  from public.beneficios_sociais_v2
  where origem_legacy_id is not null;

  if actual_canonical_count < expected_canonical_count then
    raise exception
      'backfill canonico incompleto: esperado %, encontrado %',
      expected_canonical_count,
      actual_canonical_count;
  end if;
end
$$;

drop view if exists public.v_beneficios_sociais_canonicos;
create view public.v_beneficios_sociais_canonicos
with (security_invoker = true)
as
select
  id,
  municipio,
  municipio_ibge,
  programa_codigo as programa,
  competencia,
  beneficiarios,
  valor_pago,
  unidade_medida,
  fonte_codigo,
  fonte_nome,
  fonte_url,
  natureza_dado,
  source_hash,
  data_coleta,
  observacoes,
  updated_at
from public.beneficios_sociais_v2;

grant select on public.v_beneficios_sociais_canonicos
  to anon, authenticated;

comment on view public.v_beneficios_sociais_canonicos is
  'Fonte unica para UI, exportacoes e agentes. Exclui aliases duplicados e identifica estimativas.';
