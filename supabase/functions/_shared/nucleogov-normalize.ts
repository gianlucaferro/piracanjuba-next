export type JsonRecord = Record<string, unknown>;

export function parseDate(value: unknown): string | null {
  if (!value) return null;
  const text = String(value).trim();
  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}

export function parseDecimal(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  if (!text || /sigilos/i.test(text)) return null;

  const normalized = text
    .replace(/[^\d.,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number"
    ? value
    : Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

export function documentDigits(value: unknown): string | null {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

export function normalizedName(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function compositeKey(parts: unknown[]): string {
  return parts
    .map((part) => normalizedName(part).replaceAll("|", "/"))
    .join("|");
}

function rawPayload(row: JsonRecord): JsonRecord {
  return row;
}

export function normalizeContrato(row: JsonRecord) {
  const id = parseInteger(row.id);
  if (id === null) return null;
  return {
    id,
    label: row.label ? String(row.label) : null,
    numero: row.numero ? String(row.numero) : null,
    ano: parseInteger(row.ano),
    orgao_id: parseInteger(row.orgao),
    orgao_nome: row.orgao_nome ? String(row.orgao_nome) : null,
    licitacao_id: parseInteger(row.licitacao_id),
    valor: parseDecimal(row.valor),
    data_publicacao: parseDate(row.data_publicacao),
    data_firmatura: parseDate(row.data_firmatura),
    vigencia_inicio: parseDate(row.inicio_vigencia),
    vigencia_fim: parseDate(row.fim_vigencia),
    fornecedor_nome: row.fornecedor_nome ? String(row.fornecedor_nome) : null,
    fornecedor_documento: row.fornecedor_cpfcnpj
      ? String(row.fornecedor_cpfcnpj)
      : null,
    fornecedor_documento_digitos: documentDigits(row.fornecedor_cpfcnpj),
    objeto: row.objeto ? String(row.objeto) : null,
    fiscal_contrato: row.fiscal_contrato ? String(row.fiscal_contrato) : null,
    situacao: row.situacao ? String(row.situacao) : null,
    assunto: row.assunto ? String(row.assunto) : null,
    tipo_ajuste: row.tipoa_juste ? String(row.tipoa_juste) : null,
    tipo: row.tipo ? String(row.tipo) : null,
    opcoes: row.opcoes ? String(row.opcoes) : null,
    parcelas: row.parcelas ? String(row.parcelas) : null,
    acrescimos: row.acrescimos ?? null,
    decrescimos: row.decrescimos ?? null,
    rescisoes: row.rescisoes ?? null,
    anexos: Array.isArray(row.anexos) ? row.anexos : [],
    raw_payload: rawPayload(row),
    fonte_url:
      "https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/contratos_cnt",
    updated_at: new Date().toISOString(),
  };
}

export function normalizeAditivo(row: JsonRecord) {
  const id = parseInteger(row.id);
  const contratoId = parseInteger(row.contrato);
  if (id === null || contratoId === null) return null;
  return {
    id,
    contrato_id: contratoId,
    termo: parseInteger(row.termo),
    label: row.label ? String(row.label) : null,
    ano: parseInteger(row.ano),
    tipo: row.tipo ? String(row.tipo) : null,
    tipo_aditivo: row.tipo_aditivo ? String(row.tipo_aditivo) : null,
    data_termo: parseDate(row.data_termo),
    prazo: parseDate(row.prazo),
    valor: parseDecimal(row.valor),
    credor_nome: row.credor ? String(row.credor) : null,
    credor_documento: row.cpf_cnpj ? String(row.cpf_cnpj) : null,
    credor_documento_digitos: documentDigits(row.cpf_cnpj),
    documentos: Array.isArray(row.documentos) ? row.documentos : [],
    raw_payload: rawPayload(row),
    fonte_url:
      "https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/aditivos_cnt",
    updated_at: new Date().toISOString(),
  };
}

export function normalizeFiscalContrato(row: JsonRecord) {
  const portalKey = parseInteger(row.chave);
  if (portalKey === null) return null;
  const fiscalNome = row.fiscal_contrato ? String(row.fiscal_contrato) : null;
  return {
    chave: compositeKey([portalKey, fiscalNome]),
    portal_key: portalKey,
    fiscal_nome: fiscalNome,
    contrato_label: row.contrato ? String(row.contrato) : null,
    contrato_numero: row.numero ? String(row.numero) : null,
    contrato_ano: parseInteger(row.ano),
    orgao_id: parseInteger(row.orgao_id),
    orgao_nome: row.orgao ? String(row.orgao) : null,
    situacao: row.situacao ? String(row.situacao) : null,
    data_publicacao: parseDate(row.data_publicacao),
    vigencia_inicio: parseDate(row.inicio_vigencia),
    raw_payload: rawPayload(row),
    fonte_url:
      "https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/fiscais_contratos_sg",
    updated_at: new Date().toISOString(),
  };
}

export function normalizePagamento(row: JsonRecord) {
  const numeroEmpenho = row.numero_empenho ? String(row.numero_empenho) : null;
  const fornecedor = row.fornecedor ? String(row.fornecedor) : null;
  if (!numeroEmpenho || !fornecedor) return null;
  const chave = compositeKey([
    numeroEmpenho,
    row.cpf_cnpj,
    row.data_atesto,
    row.data_pagamento,
    row.valor_pago,
    row.orgao,
  ]);
  return {
    chave,
    numero_empenho: numeroEmpenho,
    fornecedor_nome: fornecedor,
    fornecedor_documento: row.cpf_cnpj ? String(row.cpf_cnpj) : null,
    fornecedor_documento_digitos: documentDigits(row.cpf_cnpj),
    orgao_nome: row.orgao ? String(row.orgao) : null,
    fonte_recurso: row.fonte ? String(row.fonte) : null,
    categoria_contrato: row.categoria_contrato
      ? String(row.categoria_contrato)
      : null,
    data_atesto: parseDate(row.data_atesto),
    data_liquidacao: parseDate(row.data_liquidacao),
    data_vencimento: parseDate(row.data_vencimento),
    data_pagamento: parseDate(row.data_pagamento),
    valor_empenho: parseDecimal(row.valor_empenho),
    valor_pago: parseDecimal(row.valor_pago),
    justificativa: row.justificativa ? String(row.justificativa) : null,
    raw_payload: rawPayload(row),
    fonte_url:
      "https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/ordem_cronologica_pagamentos_cnt",
    updated_at: new Date().toISOString(),
  };
}

export function normalizeDiaria(row: JsonRecord) {
  const portalId = parseInteger(row.id);
  const empenhoId = parseInteger(row.id_empenho);
  if (portalId === null || empenhoId === null) return null;
  return {
    chave: `${portalId}:${empenhoId}`,
    portal_id: portalId,
    empenho_id: empenhoId,
    orgao_id: parseInteger(row.id_orgao),
    orgao_nome: row.orgao_nome ? String(row.orgao_nome) : null,
    favorecido: row.favorecido ? String(row.favorecido) : null,
    cargo: row.cargo ? String(row.cargo) : null,
    destino: row.destino ? String(row.destino) : null,
    cidade: row.cidade ? String(row.cidade) : null,
    valor: parseDecimal(row.valor),
    data_inicio: parseDate(row.data_inicio),
    data_fim: parseDate(row.data_fim),
    quantidade: parseInteger(row.quantidade),
    descricao: row.descricao ? String(row.descricao) : null,
    raw_payload: rawPayload(row),
    fonte_url:
      "https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/diarias_cnt",
    updated_at: new Date().toISOString(),
  };
}

export function normalizeFolha(row: JsonRecord) {
  const portalId = parseInteger(row.id);
  const ano = parseInteger(row.ano);
  const mes = parseInteger(row.mes);
  if (portalId === null || ano === null || mes === null || !row.nome) {
    return null;
  }
  return {
    chave: compositeKey([
      ano,
      String(mes).padStart(2, "0"),
      portalId,
      row.tipo_folha ?? "",
      row.tipo_movimentacao ?? "",
    ]),
    portal_id: portalId,
    ano,
    mes,
    referencia: row.referencia ? String(row.referencia) : null,
    matricula: row.matricula ? String(row.matricula) : null,
    nome: String(row.nome),
    nome_normalizado: normalizedName(row.nome),
    cargo: row.cargo ? String(row.cargo) : null,
    data_admissao: parseDate(row.data_admissao),
    tipo_admissao: row.tipo_admissao ? String(row.tipo_admissao) : null,
    decreto: row.decreto ? String(row.decreto) : null,
    lotacao: row.lotacao ? String(row.lotacao) : null,
    possui_estabilidade: row.possui_estabilidade
      ? String(row.possui_estabilidade)
      : null,
    tipo_folha: row.tipo_folha ? String(row.tipo_folha) : null,
    tipo_movimentacao: row.tipo_movimentacao
      ? String(row.tipo_movimentacao)
      : null,
    carga_horaria: row.carga_horaria ? String(row.carga_horaria) : null,
    situacao: row.situacao ? String(row.situacao) : null,
    funcao: row.funcao ? String(row.funcao) : null,
    hierarquia: row.hierarquia ? String(row.hierarquia) : null,
    salario_base: parseDecimal(row.salario_base),
    total_proventos: parseDecimal(row.total_proventos),
    total_descontos: parseDecimal(row.total_descontos),
    total_liquido: parseDecimal(row.total_liquido),
    outros_proventos: parseDecimal(row.outros_proventos),
    outros_descontos_obrigatorios: parseDecimal(
      row.outros_descontos_obrigatorios,
    ),
    raw_payload: rawPayload(row),
    fonte_url:
      "https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/servidores_cnt",
    updated_at: new Date().toISOString(),
  };
}

export function normalizeAto(row: JsonRecord) {
  if (!row.chave) return null;
  return {
    chave: String(row.chave),
    numero: row.numero ? String(row.numero) : null,
    data_publicacao: parseDate(row.data_publicacao),
    ementa: row.ementa ? String(row.ementa) : null,
    tipo_id: parseInteger(row.tipo_id),
    tipo: row.tipo ? String(row.tipo) : null,
    documento_url: row.url ? String(row.url) : null,
    arquivo_nome: row.file_name ? String(row.file_name) : null,
    raw_payload: rawPayload(row),
    fonte_url:
      "https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/atos_cnt",
    updated_at: new Date().toISOString(),
  };
}

export function normalizeEmpenho(row: JsonRecord, orgaoId: number) {
  const id = parseInteger(row.Id);
  if (id === null) return null;
  return {
    id,
    numero: row.Numero ? String(row.Numero) : null,
    data: parseDate(row.Data),
    fornecedor_nome: row.Fornecedor ? String(row.Fornecedor) : null,
    fornecedor_documento: row.CpfCnpjCredor ? String(row.CpfCnpjCredor) : null,
    fornecedor_documento_digitos: documentDigits(row.CpfCnpjCredor),
    orgao_id: orgaoId,
    orgao_gestor: row.OrgaoGestor ? String(row.OrgaoGestor) : null,
    unidade_orcamentaria: row.UnidadeOrcamentaria
      ? String(row.UnidadeOrcamentaria)
      : null,
    licitacao_id: parseInteger(row.IdLicitacaoDispensaAdesao),
    licitacao_modalidade: row.LicitacaoModalidade
      ? String(row.LicitacaoModalidade)
      : null,
    historico: row.Historico ? String(row.Historico) : null,
    funcao: row.Funcao ? String(row.Funcao) : null,
    subfuncao: row.SubFuncao ? String(row.SubFuncao) : null,
    programa: row.Programa ? String(row.Programa) : null,
    acao: row.Acao ? String(row.Acao) : null,
    fonte_recurso: row.FonteRecurso ? String(row.FonteRecurso) : null,
    destinacao_recurso: row.DestinacaoRecurso
      ? String(row.DestinacaoRecurso)
      : null,
    categoria: row.categoria ? String(row.categoria) : null,
    grupo: row.grupo ? String(row.grupo) : null,
    modalidade: row.modalidade ? String(row.modalidade) : null,
    elemento: row.elemento ? String(row.elemento) : null,
    subelemento: row.SubElemento ? String(row.SubElemento) : null,
    valor_empenhado: parseDecimal(row.ValorEmpenhado),
    valor_anulacao: parseDecimal(row.ValorAnulacao),
    valor_liquidado: parseDecimal(row.ValorLiquidado),
    valor_pago: parseDecimal(row.ValorPago),
    saldo_pagar: parseDecimal(row.SaldoPagar),
    raw_payload: rawPayload(row),
    fonte_url:
      "https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/despesas",
    updated_at: new Date().toISOString(),
  };
}
