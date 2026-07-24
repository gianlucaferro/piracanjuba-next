-- Cadastro canonico para cruzamentos investigativos.
-- Versao aplicada em producao: 20260724170027.
-- Documentos de pessoas fisicas ficam apenas como hash na tabela privada.

create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function public.normaliza_nome_investigativo(valor text)
returns text
language sql
stable
set search_path = public, extensions
as $$
  select upper(
    trim(
      regexp_replace(
        unaccent(coalesce(valor, '')),
        '[^A-Za-z0-9 ]+',
        ' ',
        'g'
      )
    )
  );
$$;

create or replace function public.hash_investigativo(valor text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(digest(coalesce(valor, ''), 'sha256'), 'hex');
$$;

create table if not exists public.entidade_canonica (
  id uuid primary key default gen_random_uuid(),
  chave_interna text not null unique,
  no_grafo text not null unique,
  tipo text not null check (
    tipo in (
      'empresa',
      'pessoa',
      'servidor',
      'fiscal_origem',
      'orgao',
      'contrato',
      'licitacao',
      'sancao',
      'candidatura'
    )
  ),
  nome text not null,
  nome_normalizado text not null,
  cnpj text,
  documento_hash text,
  fonte_principal text not null,
  confianca text not null check (
    confianca in ('identificador_oficial', 'documento_hash', 'nome_exato', 'registro_origem')
  ),
  metadados jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cnpj is null or cnpj ~ '^[0-9]{14}$')
);

create index if not exists entidade_canonica_tipo_idx
  on public.entidade_canonica (tipo, ativo);
create index if not exists entidade_canonica_nome_idx
  on public.entidade_canonica (nome_normalizado);
create index if not exists entidade_canonica_cnpj_idx
  on public.entidade_canonica (cnpj)
  where cnpj is not null;
create index if not exists entidade_canonica_documento_hash_idx
  on public.entidade_canonica (documento_hash)
  where documento_hash is not null;

create table if not exists public.relacao_entidade (
  chave text primary key,
  origem_id uuid not null references public.entidade_canonica(id),
  relacao text not null,
  destino_id uuid not null references public.entidade_canonica(id),
  data_evento date,
  valor numeric,
  confianca text not null check (
    confianca in ('alta', 'media', 'baixa')
  ),
  fonte text not null,
  fonte_url text,
  evidencias jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (origem_id <> destino_id)
);

create index if not exists relacao_entidade_origem_idx
  on public.relacao_entidade (origem_id, relacao)
  where ativo;
create index if not exists relacao_entidade_destino_idx
  on public.relacao_entidade (destino_id, relacao)
  where ativo;

create table if not exists public.fornecedores_cnpj_falhas (
  cnpj text primary key check (cnpj ~ '^[0-9]{14}$'),
  tentativas integer not null default 0,
  ultimo_erro text,
  proxima_tentativa_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.entidade_canonica enable row level security;
alter table public.relacao_entidade enable row level security;
alter table public.fornecedores_cnpj_falhas enable row level security;

drop policy if exists entidade_canonica_publica on public.entidade_canonica;
create policy entidade_canonica_publica
  on public.entidade_canonica
  for select to anon, authenticated
  using (ativo);

drop policy if exists relacao_entidade_publica on public.relacao_entidade;
create policy relacao_entidade_publica
  on public.relacao_entidade
  for select to anon, authenticated
  using (ativo);

revoke all on public.entidade_canonica from public, anon, authenticated;
grant select (
  id,
  no_grafo,
  tipo,
  nome,
  nome_normalizado,
  cnpj,
  fonte_principal,
  confianca,
  metadados,
  ativo,
  created_at,
  updated_at
) on public.entidade_canonica to anon, authenticated;

revoke all on public.relacao_entidade from public, anon, authenticated;
grant select on public.relacao_entidade to anon, authenticated;
revoke all on public.fornecedores_cnpj_falhas
  from public, anon, authenticated;

create or replace view public.v_entidades_canonicas
with (security_invoker = true) as
select
  id,
  no_grafo,
  tipo,
  nome,
  nome_normalizado,
  cnpj,
  fonte_principal,
  confianca,
  metadados,
  updated_at
from public.entidade_canonica
where ativo;

create or replace view public.v_relacoes_entidades
with (security_invoker = true) as
select
  relacao.chave,
  origem.no_grafo as origem,
  relacao.relacao,
  destino.no_grafo as destino,
  relacao.data_evento,
  relacao.valor,
  relacao.confianca,
  relacao.fonte,
  relacao.fonte_url,
  relacao.evidencias,
  relacao.updated_at
from public.relacao_entidade relacao
join public.entidade_canonica origem on origem.id = relacao.origem_id
join public.entidade_canonica destino on destino.id = relacao.destino_id
where relacao.ativo
  and origem.ativo
  and destino.ativo;

grant select on public.v_entidades_canonicas, public.v_relacoes_entidades
  to anon, authenticated;

create or replace function public.refresh_cadastro_canonico_investigativo()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  entidades_ativas integer;
  relacoes_ativas integer;
begin
  -- As entidades historicas permanecem para auditoria, mas deixam de ser
  -- publicadas se nao forem reencontradas nas fontes do ciclo atual.
  update public.entidade_canonica
  set ativo = false, updated_at = now();

  -- Orgaos basicos.
  insert into public.entidade_canonica (
    chave_interna,
    no_grafo,
    tipo,
    nome,
    nome_normalizado,
    fonte_principal,
    confianca,
    metadados,
    ativo,
    updated_at
  )
  values
    (
      'orgao:prefeitura',
      'orgao:prefeitura',
      'orgao',
      'Prefeitura de Piracanjuba',
      'PREFEITURA DE PIRACANJUBA',
      'Piracanjuba.ai',
      'identificador_oficial',
      '{"poder":"executivo"}'::jsonb,
      true,
      now()
    ),
    (
      'orgao:camara',
      'orgao:camara',
      'orgao',
      'Camara Municipal de Piracanjuba',
      'CAMARA MUNICIPAL DE PIRACANJUBA',
      'Piracanjuba.ai',
      'identificador_oficial',
      '{"poder":"legislativo"}'::jsonb,
      true,
      now()
    )
  on conflict (chave_interna) do update
  set ativo = true, updated_at = now();

  -- Empresas conhecidas pelo cache de CNPJ.
  insert into public.entidade_canonica (
    chave_interna,
    no_grafo,
    tipo,
    nome,
    nome_normalizado,
    cnpj,
    fonte_principal,
    confianca,
    metadados,
    ativo,
    updated_at
  )
  select
    'empresa:cnpj:' || fornecedor.cnpj,
    'empresa:' || fornecedor.cnpj,
    'empresa',
    coalesce(
      nullif(fornecedor.razao_social, ''),
      nullif(fornecedor.nome_fantasia, ''),
      fornecedor.cnpj
    ),
    public.normaliza_nome_investigativo(
      coalesce(
        nullif(fornecedor.razao_social, ''),
        nullif(fornecedor.nome_fantasia, ''),
        fornecedor.cnpj
      )
    ),
    fornecedor.cnpj,
    'Receita Federal via BrasilAPI ou OpenCNPJ',
    'identificador_oficial',
    jsonb_strip_nulls(jsonb_build_object(
      'nome_fantasia', fornecedor.nome_fantasia,
      'data_abertura', fornecedor.data_abertura,
      'situacao_cadastral', fornecedor.situacao_cadastral,
      'cnae_principal', fornecedor.cnae_principal,
      'cnae_descricao', fornecedor.cnae_descricao,
      'municipio', fornecedor.municipio,
      'uf', fornecedor.uf,
      'consultado_em', fornecedor.consultado_em
    )),
    true,
    now()
  from public.fornecedores_cnpj fornecedor
  where fornecedor.cnpj ~ '^[0-9]{14}$'
  on conflict (chave_interna) do update
  set
    nome = excluded.nome,
    nome_normalizado = excluded.nome_normalizado,
    cnpj = excluded.cnpj,
    fonte_principal = excluded.fonte_principal,
    confianca = excluded.confianca,
    metadados = excluded.metadados,
    ativo = true,
    updated_at = now();

  -- Empresas ainda nao enriquecidas, mas presentes nas fontes municipais.
  with empresas_municipais as (
    select
      fornecedor_documento_digitos as cnpj,
      max(fornecedor_nome) as nome,
      'contratos NucleoGov'::text as fonte
    from public.prefeitura_contratos
    where fornecedor_documento_digitos ~ '^[0-9]{14}$'
    group by fornecedor_documento_digitos

    union all

    select
      fornecedor_documento_digitos,
      max(fornecedor_nome),
      'empenhos NucleoGov'
    from public.prefeitura_empenhos
    where fornecedor_documento_digitos ~ '^[0-9]{14}$'
    group by fornecedor_documento_digitos

    union all

    select
      fornecedor_documento_digitos,
      max(fornecedor_nome),
      'pagamentos NucleoGov'
    from public.prefeitura_pagamentos_ordem
    where fornecedor_documento_digitos ~ '^[0-9]{14}$'
    group by fornecedor_documento_digitos
  ),
  consolidadas as (
    select cnpj, max(nome) as nome, string_agg(distinct fonte, ', ') as fonte
    from empresas_municipais
    group by cnpj
  )
  insert into public.entidade_canonica (
    chave_interna,
    no_grafo,
    tipo,
    nome,
    nome_normalizado,
    cnpj,
    fonte_principal,
    confianca,
    metadados,
    ativo,
    updated_at
  )
  select
    'empresa:cnpj:' || empresa.cnpj,
    'empresa:' || empresa.cnpj,
    'empresa',
    coalesce(nullif(empresa.nome, ''), empresa.cnpj),
    public.normaliza_nome_investigativo(
      coalesce(nullif(empresa.nome, ''), empresa.cnpj)
    ),
    empresa.cnpj,
    empresa.fonte,
    'identificador_oficial',
    '{"enriquecimento_cnpj":"pendente"}'::jsonb,
    true,
    now()
  from consolidadas empresa
  on conflict (chave_interna) do update
  set
    nome = case
      when entidade_canonica.fonte_principal =
        'Receita Federal via BrasilAPI ou OpenCNPJ'
      then entidade_canonica.nome
      else excluded.nome
    end,
    nome_normalizado = case
      when entidade_canonica.fonte_principal =
        'Receita Federal via BrasilAPI ou OpenCNPJ'
      then entidade_canonica.nome_normalizado
      else excluded.nome_normalizado
    end,
    ativo = true,
    updated_at = now();

  -- Pessoas do QSA. CPF nunca e persistido; apenas o hash permite cruzamento.
  with qsa as (
    select
      fornecedor.cnpj,
      socio,
      coalesce(
        nullif(socio->>'nome_socio', ''),
        nullif(socio->>'nome', '')
      ) as nome,
      regexp_replace(
        coalesce(socio->>'cnpj_cpf_do_socio', ''),
        '[^0-9]',
        '',
        'g'
      ) as documento
    from public.fornecedores_cnpj fornecedor
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(fornecedor.socios) = 'array'
        then fornecedor.socios
        else '[]'::jsonb
      end
    ) socio
    where fornecedor.cnpj ~ '^[0-9]{14}$'
  ),
  pessoas as (
    select distinct on (chave_interna)
      case
        when length(documento) = 14 then 'empresa:cnpj:' || documento
        when length(documento) = 11
          then 'pessoa:cpf:' || public.hash_investigativo(documento)
        else 'pessoa:qsa-nome:' ||
          public.hash_investigativo(
            public.normaliza_nome_investigativo(nome)
          )
      end as chave_interna,
      case
        when length(documento) = 14 then 'empresa:' || documento
        when length(documento) = 11
          then 'pessoa:doc:' ||
            left(public.hash_investigativo(documento), 32)
        else 'pessoa:qsa:' ||
          left(
            public.hash_investigativo(
              public.normaliza_nome_investigativo(nome)
            ),
            32
          )
      end as no_grafo,
      case when length(documento) = 14 then 'empresa' else 'pessoa' end as tipo,
      nome,
      public.normaliza_nome_investigativo(nome) as nome_normalizado,
      case when length(documento) = 14 then documento else null end as cnpj,
      case
        when length(documento) = 11
        then public.hash_investigativo(documento)
        else null
      end as documento_hash,
      case
        when length(documento) in (11, 14) then 'documento_hash'
        else 'nome_exato'
      end as confianca,
      jsonb_strip_nulls(jsonb_build_object(
        'qualificacao',
        coalesce(
          nullif(socio->>'qualificacao_socio', ''),
          nullif(socio->>'qual', '')
        ),
        'data_entrada_sociedade', socio->>'data_entrada_sociedade'
      )) as metadados
    from qsa
    where nullif(public.normaliza_nome_investigativo(nome), '') is not null
    order by chave_interna, nome
  )
  insert into public.entidade_canonica (
    chave_interna,
    no_grafo,
    tipo,
    nome,
    nome_normalizado,
    cnpj,
    documento_hash,
    fonte_principal,
    confianca,
    metadados,
    ativo,
    updated_at
  )
  select
    chave_interna,
    no_grafo,
    tipo,
    nome,
    nome_normalizado,
    cnpj,
    documento_hash,
    'QSA da Receita Federal',
    confianca,
    metadados,
    true,
    now()
  from pessoas
  on conflict (chave_interna) do update
  set
    nome = excluded.nome,
    nome_normalizado = excluded.nome_normalizado,
    cnpj = coalesce(excluded.cnpj, entidade_canonica.cnpj),
    documento_hash = coalesce(
      excluded.documento_hash,
      entidade_canonica.documento_hash
    ),
    fonte_principal = excluded.fonte_principal,
    confianca = excluded.confianca,
    metadados = entidade_canonica.metadados || excluded.metadados,
    ativo = true,
    updated_at = now();

  -- Servidores possuem identificador de origem, nunca sao unidos apenas por nome.
  insert into public.entidade_canonica (
    chave_interna,
    no_grafo,
    tipo,
    nome,
    nome_normalizado,
    fonte_principal,
    confianca,
    metadados,
    ativo,
    updated_at
  )
  select
    'servidor:' || servidor.origem_chave,
    'servidor:' || servidor.id::text,
    'servidor',
    servidor.nome,
    public.normaliza_nome_investigativo(servidor.nome),
    coalesce(servidor.fonte_url, 'Portal da Transparencia'),
    'identificador_oficial',
    jsonb_strip_nulls(jsonb_build_object(
      'orgao_tipo', servidor.orgao_tipo,
      'cargo', servidor.cargo,
      'lotacao', servidor.lotacao,
      'situacao_funcional', servidor.situacao_funcional
    )),
    true,
    now()
  from public.servidores servidor
  where servidor.origem_chave is not null
  on conflict (chave_interna) do update
  set
    nome = excluded.nome,
    nome_normalizado = excluded.nome_normalizado,
    fonte_principal = excluded.fonte_principal,
    metadados = excluded.metadados,
    ativo = true,
    updated_at = now();

  -- Fiscais sem CPF ou matricula permanecem como evidencias por registro.
  insert into public.entidade_canonica (
    chave_interna,
    no_grafo,
    tipo,
    nome,
    nome_normalizado,
    fonte_principal,
    confianca,
    metadados,
    ativo,
    updated_at
  )
  select
    'fiscal-origem:' || fiscal.chave,
    'fiscal-origem:' || fiscal.chave,
    'fiscal_origem',
    fiscal.fiscal_nome,
    public.normaliza_nome_investigativo(fiscal.fiscal_nome),
    fiscal.fonte_url,
    'registro_origem',
    jsonb_strip_nulls(jsonb_build_object(
      'contrato_numero', fiscal.contrato_numero,
      'contrato_ano', fiscal.contrato_ano,
      'orgao_nome', fiscal.orgao_nome
    )),
    true,
    now()
  from public.prefeitura_fiscais_contratos fiscal
  where nullif(fiscal.fiscal_nome, '') is not null
  on conflict (chave_interna) do update
  set
    nome = excluded.nome,
    nome_normalizado = excluded.nome_normalizado,
    metadados = excluded.metadados,
    ativo = true,
    updated_at = now();

  -- Pessoas publicas.
  insert into public.entidade_canonica (
    chave_interna,
    no_grafo,
    tipo,
    nome,
    nome_normalizado,
    documento_hash,
    fonte_principal,
    confianca,
    metadados,
    ativo,
    updated_at
  )
  select
    'pessoa-publica:' || pessoa.id::text,
    'pessoa-publica:' || pessoa.id::text,
    'pessoa',
    coalesce(nullif(pessoa.nome_publico, ''), pessoa.nome),
    public.normaliza_nome_investigativo(
      coalesce(nullif(pessoa.nome_publico, ''), pessoa.nome)
    ),
    case
      when length(regexp_replace(coalesce(pessoa.cpf, ''), '[^0-9]', '', 'g')) = 11
      then public.hash_investigativo(
        regexp_replace(pessoa.cpf, '[^0-9]', '', 'g')
      )
      else null
    end,
    coalesce(pessoa.fonte_url, 'Piracanjuba.ai'),
    'identificador_oficial',
    jsonb_strip_nulls(jsonb_build_object(
      'cargo_categoria', pessoa.cargo_categoria,
      'cargo_detalhe', pessoa.cargo_detalhe,
      'mandato_inicio', pessoa.mandato_inicio,
      'mandato_fim', pessoa.mandato_fim
    )),
    true,
    now()
  from public.pessoa_publica pessoa
  on conflict (chave_interna) do update
  set
    nome = excluded.nome,
    nome_normalizado = excluded.nome_normalizado,
    documento_hash = coalesce(
      excluded.documento_hash,
      entidade_canonica.documento_hash
    ),
    metadados = excluded.metadados,
    ativo = true,
    updated_at = now();

  -- Contratos, licitacoes e sancoes sao nos de evidencia do mesmo grafo.
  insert into public.entidade_canonica (
    chave_interna,
    no_grafo,
    tipo,
    nome,
    nome_normalizado,
    fonte_principal,
    confianca,
    metadados,
    ativo,
    updated_at
  )
  select
    'contrato:' || contrato.id::text,
    'contrato:' || contrato.id::text,
    'contrato',
    coalesce(contrato.label, contrato.numero, contrato.id::text),
    public.normaliza_nome_investigativo(
      coalesce(contrato.label, contrato.numero, contrato.id::text)
    ),
    contrato.fonte_url,
    'identificador_oficial',
    jsonb_strip_nulls(jsonb_build_object(
      'numero', contrato.numero,
      'ano', contrato.ano,
      'orgao_id', contrato.orgao_id,
      'valor', contrato.valor,
      'situacao', contrato.situacao
    )),
    true,
    now()
  from public.prefeitura_contratos contrato
  on conflict (chave_interna) do update
  set
    nome = excluded.nome,
    nome_normalizado = excluded.nome_normalizado,
    metadados = excluded.metadados,
    ativo = true,
    updated_at = now();

  insert into public.entidade_canonica (
    chave_interna,
    no_grafo,
    tipo,
    nome,
    nome_normalizado,
    fonte_principal,
    confianca,
    metadados,
    ativo,
    updated_at
  )
  select
    'licitacao:' || coalesce(
      nullif(licitacao.raw_payload->>'chave', ''),
      licitacao.id::text
    ),
    'licitacao:' || coalesce(
      nullif(licitacao.raw_payload->>'chave', ''),
      licitacao.id::text
    ),
    'licitacao',
    coalesce(licitacao.numero, licitacao.chave::text),
    public.normaliza_nome_investigativo(
      coalesce(licitacao.numero, licitacao.chave::text)
    ),
    licitacao.fonte_url,
    'identificador_oficial',
    jsonb_strip_nulls(jsonb_build_object(
      'numero', licitacao.numero,
      'ano', licitacao.ano,
      'modalidade', licitacao.modalidade,
      'tipo', licitacao.tipo,
      'valor_estimado', licitacao.valor_estimado
    )),
    true,
    now()
  from public.licitacoes licitacao
  where licitacao.fonte = 'nucleogov'
  on conflict (chave_interna) do update
  set
    nome = excluded.nome,
    nome_normalizado = excluded.nome_normalizado,
    metadados = excluded.metadados,
    ativo = true,
    updated_at = now();

  insert into public.entidade_canonica (
    chave_interna,
    no_grafo,
    tipo,
    nome,
    nome_normalizado,
    fonte_principal,
    confianca,
    metadados,
    ativo,
    updated_at
  )
  select
    'sancao:' || sancao.cadastro || ':' || sancao.id_externo,
    'sancao:' || sancao.cadastro || ':' || sancao.id_externo,
    'sancao',
    sancao.cadastro || ': ' || coalesce(sancao.tipo_sancao, sancao.nome),
    public.normaliza_nome_investigativo(
      sancao.cadastro || ' ' || coalesce(sancao.tipo_sancao, sancao.nome)
    ),
    'Portal da Transparencia Federal',
    'identificador_oficial',
    jsonb_strip_nulls(jsonb_build_object(
      'cadastro', sancao.cadastro,
      'tipo_sancao', sancao.tipo_sancao,
      'data_inicio', sancao.data_inicio_sancao,
      'data_fim', sancao.data_fim_sancao,
      'orgao_sancionador', sancao.orgao_sancionador
    )),
    true,
    now()
  from public.empresa_sancionada sancao
  where sancao.id_externo is not null
  on conflict (chave_interna) do update
  set
    nome = excluded.nome,
    nome_normalizado = excluded.nome_normalizado,
    metadados = excluded.metadados,
    ativo = true,
    updated_at = now();

  -- Doadores e candidaturas. CNPJ e unido a empresa; CPF usa apenas hash.
  with doacoes as (
    select
      doacao.*,
      regexp_replace(
        coalesce(doacao.cpf_cnpj_doador, ''),
        '[^0-9]',
        '',
        'g'
      ) as documento_doador,
      regexp_replace(
        coalesce(doacao.cpf_candidato, ''),
        '[^0-9]',
        '',
        'g'
      ) as documento_candidato
    from public.tse_doador_campanha doacao
  ),
  atores as (
    select distinct on (chave_interna)
      case
        when length(documento_doador) = 14
          then 'empresa:cnpj:' || documento_doador
        when length(documento_doador) = 11
          then 'pessoa:cpf:' || public.hash_investigativo(documento_doador)
        else 'pessoa:doador-nome:' ||
          public.hash_investigativo(
            public.normaliza_nome_investigativo(nome_doador) ||
            ':' || ano_eleicao::text
          )
      end as chave_interna,
      case
        when length(documento_doador) = 14
          then 'empresa:' || documento_doador
        when length(documento_doador) = 11
          then 'pessoa:doc:' ||
            left(public.hash_investigativo(documento_doador), 32)
        else 'pessoa:doador:' ||
          left(
            public.hash_investigativo(
              public.normaliza_nome_investigativo(nome_doador) ||
              ':' || ano_eleicao::text
            ),
            32
          )
      end as no_grafo,
      case
        when length(documento_doador) = 14 then 'empresa'
        else 'pessoa'
      end as tipo,
      nome_doador as nome,
      public.normaliza_nome_investigativo(nome_doador) as nome_normalizado,
      case when length(documento_doador) = 14 then documento_doador end as cnpj,
      case
        when length(documento_doador) = 11
        then public.hash_investigativo(documento_doador)
      end as documento_hash,
      case
        when length(documento_doador) in (11, 14) then 'documento_hash'
        else 'nome_exato'
      end as confianca
    from doacoes
    where nullif(public.normaliza_nome_investigativo(nome_doador), '') is not null
    order by chave_interna, nome_doador
  )
  insert into public.entidade_canonica (
    chave_interna,
    no_grafo,
    tipo,
    nome,
    nome_normalizado,
    cnpj,
    documento_hash,
    fonte_principal,
    confianca,
    metadados,
    ativo,
    updated_at
  )
  select
    chave_interna,
    no_grafo,
    tipo,
    nome,
    nome_normalizado,
    cnpj,
    documento_hash,
    'TSE Dados Abertos',
    confianca,
    '{}'::jsonb,
    true,
    now()
  from atores
  on conflict (chave_interna) do update
  set
    nome = excluded.nome,
    nome_normalizado = excluded.nome_normalizado,
    cnpj = coalesce(excluded.cnpj, entidade_canonica.cnpj),
    documento_hash = coalesce(
      excluded.documento_hash,
      entidade_canonica.documento_hash
    ),
    ativo = true,
    updated_at = now();

  with candidaturas as (
    select distinct on (chave_interna)
      case
        when doacao.pessoa_publica_id is not null
          then 'pessoa-publica:' || doacao.pessoa_publica_id::text
        when length(
          regexp_replace(
            coalesce(doacao.cpf_candidato, ''),
            '[^0-9]',
            '',
            'g'
          )
        ) = 11
          then 'candidatura:cpf:' || public.hash_investigativo(
            regexp_replace(doacao.cpf_candidato, '[^0-9]', '', 'g')
          )
        else 'candidatura:nome:' || public.hash_investigativo(
          public.normaliza_nome_investigativo(doacao.nome_candidato) ||
          ':' || doacao.ano_eleicao::text
        )
      end as chave_interna,
      case
        when doacao.pessoa_publica_id is not null
          then 'pessoa-publica:' || doacao.pessoa_publica_id::text
        else 'candidatura:' || left(
          public.hash_investigativo(
            coalesce(
              nullif(
                regexp_replace(
                  coalesce(doacao.cpf_candidato, ''),
                  '[^0-9]',
                  '',
                  'g'
                ),
                ''
              ),
              public.normaliza_nome_investigativo(doacao.nome_candidato)
            ) || ':' || doacao.ano_eleicao::text
          ),
          32
        )
      end as no_grafo,
      case
        when doacao.pessoa_publica_id is not null then 'pessoa'
        else 'candidatura'
      end as tipo,
      doacao.nome_candidato as nome,
      public.normaliza_nome_investigativo(doacao.nome_candidato)
        as nome_normalizado,
      doacao.ano_eleicao,
      doacao.ds_cargo,
      doacao.sg_partido,
      case
        when doacao.pessoa_publica_id is not null then 'identificador_oficial'
        when doacao.cpf_candidato is not null then 'documento_hash'
        else 'nome_exato'
      end as confianca
    from public.tse_doador_campanha doacao
    order by chave_interna, doacao.nome_candidato
  )
  insert into public.entidade_canonica (
    chave_interna,
    no_grafo,
    tipo,
    nome,
    nome_normalizado,
    fonte_principal,
    confianca,
    metadados,
    ativo,
    updated_at
  )
  select
    chave_interna,
    no_grafo,
    tipo,
    nome,
    nome_normalizado,
    'TSE Dados Abertos',
    confianca,
    jsonb_strip_nulls(jsonb_build_object(
      'ano_eleicao', ano_eleicao,
      'cargo', ds_cargo,
      'partido', sg_partido
    )),
    true,
    now()
  from candidaturas
  on conflict (chave_interna) do update
  set
    nome = excluded.nome,
    nome_normalizado = excluded.nome_normalizado,
    metadados = entidade_canonica.metadados || excluded.metadados,
    ativo = true,
    updated_at = now();

  -- Empresas sancionadas podem nao estar ainda no cache de fornecedores.
  insert into public.entidade_canonica (
    chave_interna,
    no_grafo,
    tipo,
    nome,
    nome_normalizado,
    cnpj,
    fonte_principal,
    confianca,
    metadados,
    ativo,
    updated_at
  )
  select distinct on (sancao.cnpj_digitos)
    'empresa:cnpj:' || sancao.cnpj_digitos,
    'empresa:' || sancao.cnpj_digitos,
    'empresa',
    sancao.nome,
    public.normaliza_nome_investigativo(sancao.nome),
    sancao.cnpj_digitos,
    'Portal da Transparencia Federal',
    'identificador_oficial',
    '{}'::jsonb,
    true,
    now()
  from public.empresa_sancionada sancao
  where sancao.cnpj_digitos ~ '^[0-9]{14}$'
  order by sancao.cnpj_digitos, sancao.consultado_em desc
  on conflict (chave_interna) do update
  set ativo = true, updated_at = now();

  -- Reconstroi relacoes derivadas de maneira idempotente.
  update public.relacao_entidade
  set ativo = false, updated_at = now();

  -- QSA.
  with qsa as (
    select
      fornecedor.cnpj,
      socio,
      coalesce(
        nullif(socio->>'nome_socio', ''),
        nullif(socio->>'nome', '')
      ) as nome,
      regexp_replace(
        coalesce(socio->>'cnpj_cpf_do_socio', ''),
        '[^0-9]',
        '',
        'g'
      ) as documento
    from public.fornecedores_cnpj fornecedor
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(fornecedor.socios) = 'array'
        then fornecedor.socios
        else '[]'::jsonb
      end
    ) socio
    where fornecedor.cnpj ~ '^[0-9]{14}$'
  )
  insert into public.relacao_entidade (
    chave,
    origem_id,
    relacao,
    destino_id,
    confianca,
    fonte,
    evidencias,
    ativo,
    updated_at
  )
  select
    'qsa:' || pessoa.chave_interna || ':' || qsa.cnpj,
    pessoa.id,
    'SOCIO_DE',
    empresa.id,
    case when length(qsa.documento) in (11, 14) then 'alta' else 'baixa' end,
    'QSA da Receita Federal',
    jsonb_strip_nulls(jsonb_build_object(
      'qualificacao',
      coalesce(
        nullif(qsa.socio->>'qualificacao_socio', ''),
        nullif(qsa.socio->>'qual', '')
      ),
      'data_entrada_sociedade', qsa.socio->>'data_entrada_sociedade',
      'criterio_identidade',
      case
        when length(qsa.documento) in (11, 14) then 'documento'
        else 'nome_normalizado'
      end
    )),
    true,
    now()
  from qsa
  join public.entidade_canonica pessoa on pessoa.chave_interna = case
    when length(qsa.documento) = 14
      then 'empresa:cnpj:' || qsa.documento
    when length(qsa.documento) = 11
      then 'pessoa:cpf:' || public.hash_investigativo(qsa.documento)
    else 'pessoa:qsa-nome:' ||
      public.hash_investigativo(
        public.normaliza_nome_investigativo(qsa.nome)
      )
  end
  join public.entidade_canonica empresa
    on empresa.chave_interna = 'empresa:cnpj:' || qsa.cnpj
  where pessoa.id <> empresa.id
  on conflict (chave) do update
  set
    origem_id = excluded.origem_id,
    destino_id = excluded.destino_id,
    confianca = excluded.confianca,
    evidencias = excluded.evidencias,
    ativo = true,
    updated_at = now();

  -- Empresas fornecedoras e contratos.
  insert into public.relacao_entidade (
    chave,
    origem_id,
    relacao,
    destino_id,
    data_evento,
    valor,
    confianca,
    fonte,
    fonte_url,
    evidencias,
    ativo,
    updated_at
  )
  select
    'fornecedor-contrato:' || contrato.id::text,
    empresa.id,
    'FORNECEU_PARA',
    entidade_contrato.id,
    coalesce(
      contrato.data_firmatura,
      contrato.vigencia_inicio,
      contrato.data_publicacao
    ),
    contrato.valor,
    'alta',
    'Contratos NucleoGov',
    contrato.fonte_url,
    jsonb_strip_nulls(jsonb_build_object(
      'numero', contrato.numero,
      'ano', contrato.ano,
      'orgao_id', contrato.orgao_id
    )),
    true,
    now()
  from public.prefeitura_contratos contrato
  join public.entidade_canonica empresa
    on empresa.chave_interna =
      'empresa:cnpj:' || contrato.fornecedor_documento_digitos
  join public.entidade_canonica entidade_contrato
    on entidade_contrato.chave_interna = 'contrato:' || contrato.id::text
  where contrato.fornecedor_documento_digitos ~ '^[0-9]{14}$'
  on conflict (chave) do update
  set
    origem_id = excluded.origem_id,
    destino_id = excluded.destino_id,
    data_evento = excluded.data_evento,
    valor = excluded.valor,
    evidencias = excluded.evidencias,
    ativo = true,
    updated_at = now();

  -- Servidores por poder.
  insert into public.relacao_entidade (
    chave,
    origem_id,
    relacao,
    destino_id,
    confianca,
    fonte,
    fonte_url,
    evidencias,
    ativo,
    updated_at
  )
  select
    'servidor-orgao:' || servidor.id::text,
    entidade_servidor.id,
    'SERVE_A',
    orgao.id,
    'alta',
    'Portal da Transparencia',
    servidor.fonte_url,
    jsonb_strip_nulls(jsonb_build_object(
      'cargo', servidor.cargo,
      'lotacao', servidor.lotacao,
      'situacao_funcional', servidor.situacao_funcional
    )),
    true,
    now()
  from public.servidores servidor
  join public.entidade_canonica entidade_servidor
    on entidade_servidor.chave_interna =
      'servidor:' || servidor.origem_chave
  join public.entidade_canonica orgao
    on orgao.chave_interna = case
      when servidor.orgao_tipo = 'camara' then 'orgao:camara'
      else 'orgao:prefeitura'
    end
  where servidor.origem_chave is not null
  on conflict (chave) do update
  set
    origem_id = excluded.origem_id,
    destino_id = excluded.destino_id,
    fonte_url = excluded.fonte_url,
    evidencias = excluded.evidencias,
    ativo = true,
    updated_at = now();

  -- Fiscais. Cada registro continua independente para evitar unir homonimos.
  insert into public.relacao_entidade (
    chave,
    origem_id,
    relacao,
    destino_id,
    data_evento,
    confianca,
    fonte,
    fonte_url,
    evidencias,
    ativo,
    updated_at
  )
  select
    'fiscaliza:' || fiscal.chave,
    entidade_fiscal.id,
    'FISCALIZA',
    entidade_contrato.id,
    fiscal.data_publicacao,
    'media',
    'Fiscais de contratos NucleoGov',
    fiscal.fonte_url,
    jsonb_strip_nulls(jsonb_build_object(
      'fiscal_nome', fiscal.fiscal_nome,
      'criterio_identidade', 'registro_de_origem'
    )),
    true,
    now()
  from public.prefeitura_fiscais_contratos fiscal
  join public.entidade_canonica entidade_fiscal
    on entidade_fiscal.chave_interna = 'fiscal-origem:' || fiscal.chave
  join public.entidade_canonica entidade_contrato
    on entidade_contrato.chave_interna =
      'contrato:' || fiscal.portal_key::text
  on conflict (chave) do update
  set
    origem_id = excluded.origem_id,
    destino_id = excluded.destino_id,
    data_evento = excluded.data_evento,
    evidencias = excluded.evidencias,
    ativo = true,
    updated_at = now();

  -- Sancoes.
  insert into public.relacao_entidade (
    chave,
    origem_id,
    relacao,
    destino_id,
    data_evento,
    valor,
    confianca,
    fonte,
    evidencias,
    ativo,
    updated_at
  )
  select
    'sancao-empresa:' || sancao.cadastro || ':' || sancao.id_externo,
    empresa.id,
    'POSSUI_SANCAO',
    entidade_sancao.id,
    sancao.data_inicio_sancao,
    sancao.valor_multa,
    'alta',
    'Portal da Transparencia Federal',
    jsonb_strip_nulls(jsonb_build_object(
      'cadastro', sancao.cadastro,
      'tipo_sancao', sancao.tipo_sancao,
      'data_fim', sancao.data_fim_sancao,
      'orgao_sancionador', sancao.orgao_sancionador
    )),
    true,
    now()
  from public.empresa_sancionada sancao
  join public.entidade_canonica empresa
    on empresa.chave_interna = 'empresa:cnpj:' || sancao.cnpj_digitos
  join public.entidade_canonica entidade_sancao
    on entidade_sancao.chave_interna =
      'sancao:' || sancao.cadastro || ':' || sancao.id_externo
  where sancao.cnpj_digitos ~ '^[0-9]{14}$'
  on conflict (chave) do update
  set
    origem_id = excluded.origem_id,
    destino_id = excluded.destino_id,
    data_evento = excluded.data_evento,
    valor = excluded.valor,
    evidencias = excluded.evidencias,
    ativo = true,
    updated_at = now();

  -- Doacoes eleitorais.
  with doacoes as (
    select
      doacao.*,
      regexp_replace(
        coalesce(doacao.cpf_cnpj_doador, ''),
        '[^0-9]',
        '',
        'g'
      ) as documento_doador
    from public.tse_doador_campanha doacao
  )
  insert into public.relacao_entidade (
    chave,
    origem_id,
    relacao,
    destino_id,
    data_evento,
    valor,
    confianca,
    fonte,
    evidencias,
    ativo,
    updated_at
  )
  select
    'doacao:' || doacao.id::text,
    doador.id,
    'DOOU_PARA',
    candidatura.id,
    doacao.dt_receita,
    doacao.vr_receita,
    case
      when length(doacao.documento_doador) in (11, 14) then 'alta'
      else 'baixa'
    end,
    'TSE Dados Abertos',
    jsonb_strip_nulls(jsonb_build_object(
      'ano_eleicao', doacao.ano_eleicao,
      'cargo', doacao.ds_cargo,
      'partido', doacao.sg_partido,
      'origem_recurso', doacao.ds_recurso
    )),
    true,
    now()
  from doacoes doacao
  join public.entidade_canonica doador on doador.chave_interna = case
    when length(doacao.documento_doador) = 14
      then 'empresa:cnpj:' || doacao.documento_doador
    when length(doacao.documento_doador) = 11
      then 'pessoa:cpf:' ||
        public.hash_investigativo(doacao.documento_doador)
    else 'pessoa:doador-nome:' ||
      public.hash_investigativo(
        public.normaliza_nome_investigativo(doacao.nome_doador) ||
        ':' || doacao.ano_eleicao::text
      )
  end
  join public.entidade_canonica candidatura
    on candidatura.chave_interna = case
      when doacao.pessoa_publica_id is not null
        then 'pessoa-publica:' || doacao.pessoa_publica_id::text
      when length(
        regexp_replace(
          coalesce(doacao.cpf_candidato, ''),
          '[^0-9]',
          '',
          'g'
        )
      ) = 11
        then 'candidatura:cpf:' || public.hash_investigativo(
          regexp_replace(doacao.cpf_candidato, '[^0-9]', '', 'g')
        )
      else 'candidatura:nome:' || public.hash_investigativo(
        public.normaliza_nome_investigativo(doacao.nome_candidato) ||
        ':' || doacao.ano_eleicao::text
      )
    end
  on conflict (chave) do update
  set
    origem_id = excluded.origem_id,
    destino_id = excluded.destino_id,
    data_evento = excluded.data_evento,
    valor = excluded.valor,
    confianca = excluded.confianca,
    evidencias = excluded.evidencias,
    ativo = true,
    updated_at = now();

  select count(*) into entidades_ativas
  from public.entidade_canonica
  where ativo;

  select count(*) into relacoes_ativas
  from public.relacao_entidade
  where ativo;

  return jsonb_build_object(
    'entidades_ativas', entidades_ativas,
    'relacoes_ativas', relacoes_ativas,
    'atualizado_em', now()
  );
end;
$$;

revoke execute on function public.refresh_cadastro_canonico_investigativo()
  from public, anon, authenticated;
grant execute on function public.refresh_cadastro_canonico_investigativo()
  to postgres, service_role;

create or replace function public.cnpjs_investigativos_pendentes(
  limite integer default 50
)
returns table (cnpj text)
language sql
security definer
set search_path = public
as $$
  with candidatos as (
    select fornecedor_documento_digitos as cnpj
    from public.prefeitura_contratos
    where fornecedor_documento_digitos ~ '^[0-9]{14}$'

    union

    select fornecedor_documento_digitos
    from public.prefeitura_empenhos
    where fornecedor_documento_digitos ~ '^[0-9]{14}$'

    union

    select fornecedor_documento_digitos
    from public.prefeitura_pagamentos_ordem
    where fornecedor_documento_digitos ~ '^[0-9]{14}$'

    union

    select credor_documento_digitos
    from public.prefeitura_aditivos
    where credor_documento_digitos ~ '^[0-9]{14}$'
  )
  select candidato.cnpj
  from candidatos candidato
  left join public.fornecedores_cnpj fornecedor
    on fornecedor.cnpj = candidato.cnpj
  left join public.fornecedores_cnpj_falhas falha
    on falha.cnpj = candidato.cnpj
  where (
    fornecedor.cnpj is null
    or fornecedor.consultado_em < now() - interval '180 days'
  )
    and (
      falha.cnpj is null
      or falha.proxima_tentativa_em <= now()
    )
  order by fornecedor.consultado_em nulls first, candidato.cnpj
  limit greatest(1, least(coalesce(limite, 50), 100));
$$;

revoke execute on function public.cnpjs_investigativos_pendentes(integer)
  from public, anon, authenticated;
grant execute on function public.cnpjs_investigativos_pendentes(integer)
  to postgres, service_role;

create or replace view public.v_grafo_investigativo_arestas
with (security_invoker = true) as
select
  origem,
  relacao,
  destino,
  data_evento,
  valor,
  fonte_url,
  'alta'::text as confianca,
  '{}'::jsonb as evidencias
from public.v_grafo_contratacoes_arestas_completas

union

select
  origem,
  relacao,
  destino,
  data_evento,
  valor,
  fonte_url,
  confianca,
  evidencias
from public.v_relacoes_entidades;

grant select on public.v_grafo_investigativo_arestas
  to anon, authenticated;

select public.refresh_cadastro_canonico_investigativo();
