-- Consolidacao das DUAS tabelas de contratos da Camara.
--
-- Antes existiam dois pipelines paralelos, cada um com sua tabela e sua pagina publica:
--   * contrato_camara   <- sync-contratos-camara (endpoint contratos_cnt/listar)
--                          id REAL do portal (centi_id bigint), CNPJ 162/162,
--                          enriquecimento 154, raw_payload. Pagina /transparencia/contratos-camara.
--   * camara_contratos  <- sync-camara-financeiro (endpoint GetContratoPortal)
--                          id sintetico "ctr-{id}-{ano}", sem CNPJ, 1 credor nulo,
--                          1 objeto truncado. Pagina /camara/contratos + chatbot + risco + resumo IA.
--
-- Paridade verificada (162 pares 1:1 pelo id do portal embutido em ctr-{id}-{ano}):
-- zero divergencia em numero/valor/vigencias; contrato_camara e superconjunto estrito
-- (preenche o credor nulo e o objeto truncado do contrato 4698).
--
-- Decisao: contrato_camara vira canonica. camara_contratos vira VIEW com os nomes
-- legados, entao NENHUM leitor muda. O legado e preservado como camara_contratos_legacy.

-- ---------- Parte 1: colunas que so existiam no legado / faltavam ----------

alter table public.contrato_camara
  add column if not exists documento_url text,
  add column if not exists fonte_url text;

-- documento_url so e exposto pelo endpoint GetContratoPortal (campo `docs`).
update public.contrato_camara tc
set documento_url = cc.documento_url
from public.camara_contratos cc
where (regexp_match(cc.centi_id, '^ctr-(\d+)-'))[1]::bigint = tc.centi_id
  and cc.documento_url is not null;

-- fonte_url por contrato. O legado guardava a URL generica /contratos (sem id), o que
-- impedia o vinculo autoritativo dos aditivos (aditivo.centi_id = id do contrato-pai).
update public.contrato_camara
set fonte_url = 'https://camarapiracanjuba.centi.com.br/contratos/contrato/' || centi_id::text
where centi_id is not null;

-- ---------- Parte 2: camara_contratos vira view ----------

alter table public.camara_contratos rename to camara_contratos_legacy;

create view public.camara_contratos
with (security_invoker = true) as
select
  tc.id,
  tc.numero,
  tc.ano,
  tc.fornecedor_nome as credor,
  tc.objeto,
  tc.valor,
  tc.inicio_vigencia as vigencia_inicio,
  tc.fim_vigencia    as vigencia_fim,
  -- vocabulario que a UI espera (152 encerrados / 10 ativos, identico ao legado)
  case tc.situacao
    when 'Em vigor'  then 'ativo'
    when 'Encerrado' then 'encerrado'
    else lower(tc.situacao)
  end                as status,
  tc.fonte_url,
  tc.centi_id::text  as centi_id,
  tc.updated_at,
  tc.documento_url
from public.contrato_camara tc;

grant select on public.camara_contratos to anon, authenticated, service_role;

-- Rollback: drop view camara_contratos; alter table camara_contratos_legacy rename to camara_contratos;
