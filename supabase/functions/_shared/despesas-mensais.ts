export type RelatorioEmpenhos = {
  total_empenhado?: string | number | null;
  total_liquidado?: string | number | null;
  total_pago?: string | number | null;
};

export type DespesaMensalCanonica = {
  competencia: string;
  valor_empenhado: number;
  valor_liquidado: number;
  valor_pago: number;
  fonte_nome: string;
  fonte_url: string;
  metodologia: string;
  escopo: string;
  data_coleta: string;
};

const FONTE_NOME = "Portal da Transparência de Piracanjuba - NucleoGov";
const FONTE_URL =
  "https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/cntdespesas";
const METODOLOGIA =
  "Totais oficiais do relatório de empenhos para compromissos com data no mês selecionado. Empenhado, liquidado e pago são fases do mesmo gasto e não devem ser somados.";
const ESCOPO =
  "Todos os órgãos e fundos exibidos no portal da Prefeitura, com id_orgao igual a zero.";

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function parseExpenseValue(
  value: string | number | null | undefined,
): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }
  if (typeof value !== "string" || value.trim() === "") return Number.NaN;

  const raw = value.trim().replace(/\s/g, "");
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  return Number(normalized);
}

function requireNonNegative(
  value: string | number | null | undefined,
  field: string,
): number {
  const parsed = parseExpenseValue(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Relatório mensal de despesas inválido: ${field}`);
  }
  return roundCurrency(parsed);
}

export function canonicalizeMonthlyExpense(
  summary: RelatorioEmpenhos,
  competencia: string,
  collectedAt: string,
): DespesaMensalCanonica {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) {
    throw new Error(`Competência inválida: ${competencia}`);
  }
  if (!collectedAt || Number.isNaN(Date.parse(collectedAt))) {
    throw new Error("Data de coleta inválida");
  }

  return {
    competencia,
    valor_empenhado: requireNonNegative(
      summary.total_empenhado,
      "total_empenhado",
    ),
    valor_liquidado: requireNonNegative(
      summary.total_liquidado,
      "total_liquidado",
    ),
    valor_pago: requireNonNegative(summary.total_pago, "total_pago"),
    fonte_nome: FONTE_NOME,
    fonte_url: FONTE_URL,
    metodologia: METODOLOGIA,
    escopo: ESCOPO,
    data_coleta: collectedAt,
  };
}
