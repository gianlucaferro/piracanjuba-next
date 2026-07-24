export const FUNPREPI_ORGAO_ID = 44;
export const FUNPREPI_PORTAL_URL =
  "https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/despesas";
export const FUNPREPI_PORTAL_HISTORICO_URL =
  "https://piracanjuba.centi.com.br/despesas/orgao";
export const FUNPREPI_TCM_URL =
  "https://www.tcm.go.gov.br/site/wp-content/uploads/2019/08/AC-CONS-015-2019-processo-17680-18-Piracanjuba-CONSULTA.-REQUISITOS-DE-ADMISSIBILIDADE-ATENDIDOS.-RPPS.-PLANO-DE-AMORTIZA%C3%87%C3%83O.-APORTE-PER%C3%8DODO-DE-RECURSOS.pdf";
export const SECRETARIADO_URL =
  "https://piracanjuba.go.gov.br/secretariado/";

export type FunprepiCoberturaStatus =
  | "reconciliado"
  | "parcial"
  | "divergente"
  | "ausente"
  | "sem_referencia";

export type FunprepiResumo = {
  empenhos: number;
  empenhado: number;
  anulado: number;
  liquidado: number;
  pago: number;
  saldo_pagar: number;
  pago_periodo_atual: number;
  pago_periodo_anterior: number;
};

export type FunprepiSerieAnual = {
  ano: number;
  periodo_fim_referencia: string | null;
  empenhos_novo: number;
  empenhos_referencia: number;
  empenhado_novo: number;
  anulado_novo: number;
  liquidado_novo: number;
  pago_novo: number;
  pago_referencia: number;
  saldo_pagar_novo: number;
  fonte_referencia: string | null;
  status: FunprepiCoberturaStatus;
};

export type FunprepiSerieMensal = {
  mes: number;
  aposentadorias: number;
  pensoes: number;
  tarifas: number;
  fornecedores_externos: number;
  outros: number;
};

export type FunprepiComposicao = {
  categoria: string;
  valor: number;
  empenhos: number;
};

export type FunprepiFornecedor = {
  chave: string;
  nome: string;
  documento: string | null;
  valor_pago: number;
  empenhos: number;
  primeiro_ano: number;
  ultimo_ano: number;
};

export type FunprepiContrato = {
  id: number;
  numero: string | null;
  ano: number | null;
  valor: number | null;
  fornecedor_nome: string | null;
  documento: string | null;
  objeto: string | null;
  fiscal_contrato: string | null;
  situacao: string | null;
  licitacao_id: number | null;
  fonte_url: string;
  razao_social: string | null;
  data_abertura: string | null;
  situacao_cadastral: string | null;
};

export type FunprepiIndicio = {
  chave: string;
  regra: string;
  categoria: string;
  severidade: string;
  score: number;
  titulo: string;
  descricao: string;
  contrato_id: number | null;
  fornecedor_cnpj: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  fonte_urls: string[];
};

export type FunprepiEvidencia = {
  chave: string;
  titulo: string;
  tipo: string;
  data_referencia: string | null;
  valor: number | null;
  unidade: string | null;
  situacao: string;
  descricao: string;
  orgao_emissor: string;
  fonte_url: string;
  verificado_em: string;
};

export type FunprepiDashboard = {
  orgao_id: 44;
  divida_status: "nao_publicada";
  divida_valor: null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  atualizado_em: string | null;
  ano_atual: number | null;
  resumo: FunprepiResumo;
  serie_anual: FunprepiSerieAnual[];
  serie_mensal: FunprepiSerieMensal[];
  composicao: FunprepiComposicao[];
  fornecedores_externos: FunprepiFornecedor[];
  contratos: FunprepiContrato[];
  indicios: FunprepiIndicio[];
  evidencias: FunprepiEvidencia[];
};

export type CargoAtualDoador = {
  cargo: string;
  fonteUrl: string;
};

const CARGOS_DOADORES: Record<string, CargoAtualDoador> = {
  "ANTONINO INOCENCIO DE LIMA": {
    cargo: "atual secretário de Finanças do município",
    fonteUrl: SECRETARIADO_URL,
  },
  "WILSON RODRIGUES DE LIMA": {
    cargo: "atual secretário de Obras e Serviços Públicos do município",
    fonteUrl: SECRETARIADO_URL,
  },
};

function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function getCargoAtualDoador(nome: string): CargoAtualDoador | null {
  return CARGOS_DOADORES[normalizarNome(nome)] ?? null;
}

export function calcularVariacaoPercentual(
  atual: number,
  anterior: number,
): number | null {
  if (!Number.isFinite(atual) || !Number.isFinite(anterior) || anterior === 0) {
    return null;
  }
  return Math.round((((atual - anterior) / anterior) * 100) * 100) / 100;
}
