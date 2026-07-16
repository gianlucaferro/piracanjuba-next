-- Estende o cruzamento contratos × sanção para além de CEIS/CNEP/CEPIM:
-- inclui Lista Suja do Trabalho Escravo (MTE) e TCU inidôneos (barrados de licitar),
-- ambos por CNPJ = fornecedor. Branch 1 mantido verbatim (sem regressão).
-- Depende de: contrato_camara, empresa_sancionada_ativa, empregador_trabalho_escravo, condenacao_tcu.
-- Aplicada no banco remoto em 2026-07-16 via MCP; arquivo espelha o schema no repo.
create or replace view public.contrato_camara_com_sancao as
-- Branch 1: CEIS / CNEP / CEPIM (via empresa_sancionada_ativa) -inalterado
select c.id as contrato_id, c.numero, c.ano, c.fornecedor_cnpj_limpo, c.fornecedor_nome,
  c.valor, c.data_firmatura, c.inicio_vigencia, c.fim_vigencia, c.objeto, c.situacao,
  s.cadastro, s.tipo_sancao, s.data_inicio_sancao, s.data_fim_sancao, s.orgao_sancionador,
  case
    when (c.situacao is null or c.situacao <> 'Encerrado') and (s.data_fim_sancao is null or s.data_fim_sancao >= current_date) then 'critico'
    when c.fim_vigencia is not null and s.data_inicio_sancao is not null and c.fim_vigencia < s.data_inicio_sancao then 'informativo'
    when c.fim_vigencia is null or s.data_inicio_sancao is null then 'atencao'
    else 'atencao'
  end as severidade
from contrato_camara c
join empresa_sancionada_ativa s on s.cnpj_digitos = c.fornecedor_cnpj_limpo

union all
-- Branch 2: Lista Suja do Trabalho Escravo (MTE) -só CNPJ. Sem datas de sanção
-- confiáveis, então "atenção" (sobreposição temporal incerta, verificar manualmente).
select c.id, c.numero, c.ano, c.fornecedor_cnpj_limpo, c.fornecedor_nome,
  c.valor, c.data_firmatura, c.inicio_vigencia, c.fim_vigencia, c.objeto, c.situacao,
  'Lista Suja'::text as cadastro,
  'Trabalho escravo (Cadastro de Empregadores - MTE)'::text as tipo_sancao,
  null::date as data_inicio_sancao,
  null::date as data_fim_sancao,
  'Ministério do Trabalho e Emprego'::text as orgao_sancionador,
  case when c.situacao is null or c.situacao <> 'Encerrado' then 'critico' else 'atencao' end as severidade
from contrato_camara c
join empregador_trabalho_escravo e on e.doc_digitos = c.fornecedor_cnpj_limpo and e.doc_tipo = 'CNPJ'

union all
-- Branch 3: TCU inidôneos (empresas barradas de licitar) -só CNPJ, com datas.
select c.id, c.numero, c.ano, c.fornecedor_cnpj_limpo, c.fornecedor_nome,
  c.valor, c.data_firmatura, c.inicio_vigencia, c.fim_vigencia, c.objeto, c.situacao,
  'TCU'::text as cadastro,
  'Inidôneo para licitar (TCU)'::text as tipo_sancao,
  t.data_transito as data_inicio_sancao,
  t.data_final as data_fim_sancao,
  'Tribunal de Contas da União'::text as orgao_sancionador,
  case
    when (c.situacao is null or c.situacao <> 'Encerrado') and (t.data_final is null or t.data_final >= current_date) then 'critico'
    when c.fim_vigencia is not null and t.data_transito is not null and c.fim_vigencia < t.data_transito then 'informativo'
    else 'atencao'
  end as severidade
from contrato_camara c
join condenacao_tcu t on t.doc_digitos = c.fornecedor_cnpj_limpo and t.doc_tipo = 'CNPJ' and t.tipo = 'inidoneo';
