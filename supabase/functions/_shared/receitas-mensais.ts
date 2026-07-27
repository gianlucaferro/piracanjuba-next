export type ReceitaCentiItem = {
  CodigoElemento?: string | null;
  DescricaoElemento?: string | null;
  ValoReceitaAcumuladoMes?: string | number | null;
};

export type EsferaReceita = "federal" | "estadual" | "municipal";

export type ReceitaMensalCanonica = {
  competencia: string;
  esfera: EsferaReceita;
  categoria: string;
  categoria_ordem: number;
  valor_bruto: number;
  deducoes: number;
  valor_liquido: number;
  fonte_nome: string;
  fonte_url: string;
  metodologia: string;
  registros_fonte: number;
};

const FONTE_NOME = "Portal da Transparência de Piracanjuba - NucleoGov";
const FONTE_URL =
  "https://acessoainformacao.piracanjuba.go.gov.br/cidadao/transparencia/cntreceitas";

const METODOLOGIA_TRANSFERENCIAS =
  "Valor arrecadado no mês, líquido das deduções contábeis registradas no próprio portal. Não inclui benefícios pagos diretamente a cidadãos.";
const METODOLOGIA_PROPRIA =
  "Soma mensal de impostos e taxas, contribuições municipais, receita patrimonial, serviços e outras receitas próprias. Exclui transferências e operações de crédito.";

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function parseCentiMoney(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;

  const normalized = value
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function valuesByCode(items: ReceitaCentiItem[]): Map<string, number> {
  const values = new Map<string, number>();
  for (const item of items) {
    const code = item.CodigoElemento?.trim();
    if (!code || values.has(code)) continue;
    values.set(code, parseCentiMoney(item.ValoReceitaAcumuladoMes));
  }
  return values;
}

function read(values: Map<string, number>, code: string): number {
  return values.get(code) ?? 0;
}

function sum(values: Map<string, number>, codes: string[]): number {
  return codes.reduce((total, code) => total + read(values, code), 0);
}

function remainder(total: number, parts: number[]): number {
  const value = total - parts.reduce((subtotal, part) => subtotal + part, 0);
  if (value < -0.02) {
    throw new Error(
      `Receitas mensais inconsistentes: subtotal ${roundCurrency(value)} negativo`,
    );
  }
  return Math.max(0, value);
}

function buildRow(
  competencia: string,
  esfera: EsferaReceita,
  categoria: string,
  categoriaOrdem: number,
  valorBruto: number,
  deducoes: number,
  registrosFonte: number,
): ReceitaMensalCanonica {
  return {
    competencia,
    esfera,
    categoria,
    categoria_ordem: categoriaOrdem,
    valor_bruto: roundCurrency(valorBruto),
    deducoes: roundCurrency(deducoes),
    valor_liquido: roundCurrency(valorBruto + deducoes),
    fonte_nome: FONTE_NOME,
    fonte_url: FONTE_URL,
    metodologia: esfera === "municipal"
      ? METODOLOGIA_PROPRIA
      : METODOLOGIA_TRANSFERENCIAS,
    registros_fonte: registrosFonte,
  };
}

/**
 * Converte a árvore contábil do portal em categorias mensais sem somar linhas
 * pai e filhas ao mesmo tempo. Códigos repetidos no retorno são deduplicados.
 */
export function canonicalizeMonthlyRevenue(
  items: ReceitaCentiItem[],
  competencia: string,
): ReceitaMensalCanonica[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) {
    throw new Error(`Competência inválida: ${competencia}`);
  }
  if (!Array.isArray(items) || items.length === 0) return [];

  const values = valuesByCode(items);

  const federalCurrent = read(values, "1.7.1.0.00.0.0");
  const federalCapital = read(values, "2.4.1.0.00.0.0");
  const federalDeduction = read(values, "91.7.1.0.00.0.0");
  const fpm = read(values, "1.7.1.1.51.0.0");
  const itr = read(values, "1.7.1.1.52.0.0");
  const fpmDeduction = read(values, "91.7.1.1.51.0.0");
  const itrDeduction = read(values, "91.7.1.1.52.0.0");
  const otherFederal = remainder(federalCurrent, [fpm, itr]);
  const otherFederalDeduction =
    federalDeduction - fpmDeduction - itrDeduction;

  const stateCurrent = read(values, "1.7.2.0.00.0.0");
  const stateCapital = read(values, "2.4.2.0.00.0.0");
  const stateDeduction = read(values, "91.7.2.0.00.0.0");
  const icms = read(values, "1.7.2.1.50.0.0");
  const ipva = read(values, "1.7.2.1.51.0.0");
  const ipi = read(values, "1.7.2.1.52.0.0");
  const icmsDeduction = read(values, "91.7.2.1.50.0.0");
  const ipvaDeduction = read(values, "91.7.2.1.51.0.0");
  const ipiDeduction = read(values, "91.7.2.1.52.0.0");
  const otherState = remainder(stateCurrent, [icms, ipva, ipi]);
  const otherStateDeduction =
    stateDeduction - icmsDeduction - ipvaDeduction - ipiDeduction;

  const ownTaxes = read(values, "1.1.0.0.00.0.0");
  const ownContributions = read(values, "1.2.0.0.00.0.0");
  const ownPatrimonial = read(values, "1.3.0.0.00.0.0");
  const ownServices = read(values, "1.6.0.0.00.0.0");
  const otherOwn = sum(values, [
    "1.4.0.0.00.0.0",
    "1.5.0.0.00.0.0",
    "1.9.0.0.00.0.0",
    "2.2.0.0.00.0.0",
    "2.3.0.0.00.0.0",
  ]);

  const recordCount = items.length;
  return [
    buildRow(
      competencia,
      "federal",
      "FPM",
      10,
      fpm,
      fpmDeduction,
      recordCount,
    ),
    buildRow(
      competencia,
      "federal",
      "ITR",
      20,
      itr,
      itrDeduction,
      recordCount,
    ),
    buildRow(
      competencia,
      "federal",
      "Outros repasses federais",
      30,
      otherFederal,
      otherFederalDeduction,
      recordCount,
    ),
    buildRow(
      competencia,
      "federal",
      "Transferências de capital",
      40,
      federalCapital,
      0,
      recordCount,
    ),
    buildRow(
      competencia,
      "estadual",
      "ICMS",
      10,
      icms,
      icmsDeduction,
      recordCount,
    ),
    buildRow(
      competencia,
      "estadual",
      "IPVA",
      20,
      ipva,
      ipvaDeduction,
      recordCount,
    ),
    buildRow(
      competencia,
      "estadual",
      "IPI Exportação",
      30,
      ipi,
      ipiDeduction,
      recordCount,
    ),
    buildRow(
      competencia,
      "estadual",
      "Outros repasses estaduais",
      40,
      otherState,
      otherStateDeduction,
      recordCount,
    ),
    buildRow(
      competencia,
      "estadual",
      "Transferências de capital",
      50,
      stateCapital,
      0,
      recordCount,
    ),
    buildRow(
      competencia,
      "municipal",
      "Impostos e taxas",
      10,
      ownTaxes,
      0,
      recordCount,
    ),
    buildRow(
      competencia,
      "municipal",
      "Contribuições municipais",
      20,
      ownContributions,
      0,
      recordCount,
    ),
    buildRow(
      competencia,
      "municipal",
      "Receita patrimonial",
      30,
      ownPatrimonial,
      0,
      recordCount,
    ),
    buildRow(
      competencia,
      "municipal",
      "Serviços",
      40,
      ownServices,
      0,
      recordCount,
    ),
    buildRow(
      competencia,
      "municipal",
      "Outras receitas próprias",
      50,
      otherOwn,
      0,
      recordCount,
    ),
  ];
}
