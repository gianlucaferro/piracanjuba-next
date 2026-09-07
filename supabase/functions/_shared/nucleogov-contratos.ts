import {
  CENTI_BASE_PREFEITURA,
  centiCall,
  type CentiListResult,
} from "./centi-client.ts";
import type { JsonRecord } from "./nucleogov-normalize.ts";

type Dataset = "contratos" | "aditivos";
const REFERERS: Record<Dataset, string> = {
  contratos: "/cidadao/informacao/contratos_cnt",
  aditivos: "/cidadao/informacao/aditivos_cnt",
};

export interface ContratosOrgaoCoverage {
  orgao_id: number;
  orgao_nome: string;
  fetched: number;
  total: number;
  pagesFetched: number;
  complete: boolean;
  maxPagesReached: boolean;
}

export interface ContratosPrefeituraOptions {
  dataset: Dataset;
  year?: number;
  allYears?: boolean;
  pageSize?: number;
  maxPages?: number;
}

function record(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function integer(value: unknown, minimum = 1): number | null {
  if (
    value === null || value === undefined || value === "" ||
    (typeof value !== "number" && typeof value !== "string")
  ) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= minimum ? n : null;
}

function orgaosPrefeitura(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("Contratos: catálogo de órgãos inválido");
  }
  if (value.length > 100) {
    throw new Error("Contratos: catálogo excedeu 100 órgãos");
  }
  const ids = new Set<number>();
  const result: { id: number; nome: string }[] = [];
  for (const raw of value) {
    const row = record(raw);
    const id = integer(row.id);
    if (id === null || ids.has(id)) {
      throw new Error("Contratos: órgão sem identificador único");
    }
    ids.add(id);
    const nome = String(row.valor ?? row.nome ?? id).trim();
    const normalized = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // O catálogo oficial atual exclui o Legislativo. Manter a separação caso mude.
    if (id === 11 || /camara/i.test(normalized)) continue;
    result.push({ id, nome });
  }
  if (result.length === 0) {
    throw new Error("Contratos: catálogo sem órgãos da Prefeitura");
  }
  return result;
}

export async function fetchContratosPrefeitura(
  options: ContratosPrefeituraOptions,
  client: typeof centiCall = centiCall,
): Promise<
  CentiListResult<JsonRecord> & {
    scope: string;
    by_orgao: ContratosOrgaoCoverage[];
  }
> {
  const { dataset } = options;
  if (!(dataset in REFERERS)) throw new Error("Dataset de contratos inválido");
  const year = options.year ?? new Date().getUTCFullYear();
  if (
    !options.allYears && (integer(year) === null || year < 2000 ||
      year > new Date().getUTCFullYear())
  ) throw new Error("Ano de contratos inválido");
  const pageSize = options.pageSize ?? 250;
  const maxPages = options.maxPages ?? 10;
  if (
    integer(pageSize) === null || pageSize > 500 ||
    integer(maxPages) === null || maxPages > 40
  ) {
    throw new Error("Limites de paginação de contratos inválidos");
  }
  const catalog = await client(
    REFERERS.contratos,
    [{ acao: "contratos_cnt/listarOrgaos" }],
    CENTI_BASE_PREFEITURA,
    { timeoutMs: 20_000 },
  );
  const orgaos = orgaosPrefeitura(Object.values(catalog)[0]);

  async function fetchOrgao(orgao: { id: number; nome: string }) {
    const dados: JsonRecord[] = [];
    const ids = new Set<number>();
    let total: number | null = null;
    let pagesFetched = 0;
    for (let page = 0; page < maxPages; page++) {
      const extra: Record<string, string> = { orgao: String(orgao.id) };
      if (!options.allYears) extra.ano = String(year);
      const response = await client(
        REFERERS[dataset],
        [{
          acao: `${dataset}_cnt/listar`,
          extra,
          limit: { offset: page * pageSize, pageSize },
        }],
        CENTI_BASE_PREFEITURA,
        { timeoutMs: 20_000 },
      );
      const result = record(Object.values(response)[0]);
      const pageTotal = integer(result.total, 0);
      if (!Array.isArray(result.dados) || pageTotal === null) {
        throw new Error(
          `${dataset} órgão ${orgao.id}: resposta sem dados ou total válido`,
        );
      }
      if (total !== null && total !== pageTotal) {
        throw new Error(
          `${dataset} órgão ${orgao.id}: total mudou durante paginação`,
        );
      }
      total = pageTotal;
      if (
        result.orgao_principal !== null &&
        result.orgao_principal !== undefined &&
        result.orgao_principal !== "" &&
        Number(result.orgao_principal) !== orgao.id
      ) {
        throw new Error(
          `${dataset} órgão ${orgao.id}: fonte aplicou outro órgão`,
        );
      }
      if (
        dataset === "aditivos" &&
        integer(record(result.filtros).idOrgao) !== orgao.id
      ) {
        throw new Error(
          `Aditivos órgão ${orgao.id}: fonte não confirmou filtro solicitado`,
        );
      }
      pagesFetched++;
      for (const value of result.dados) {
        const row = record(value);
        const id = integer(row.id);
        if (id === null || ids.has(id)) {
          throw new Error(
            `${dataset} órgão ${orgao.id}: ID inválido ou duplicado`,
          );
        }
        if (!options.allYears && integer(row.ano) !== year) {
          throw new Error(`${dataset}: fonte não respeitou ano solicitado`);
        }
        if (dataset === "contratos" && integer(row.orgao) !== orgao.id) {
          throw new Error(
            `Contrato de órgão diferente do solicitado: ${orgao.id}`,
          );
        }
        if (dataset === "aditivos" && integer(row.contrato) === null) {
          throw new Error(`Aditivo sem contrato de origem válido: ${orgao.id}`);
        }
        ids.add(id);
        dados.push(row);
      }
      if (dados.length > total) {
        throw new Error(`${dataset}: dados excedem total publicado`);
      }
      if (dados.length === total) break;
      if (result.dados.length < pageSize) {
        throw new Error(
          `${dataset} órgão ${orgao.id}: página incompleta antes do total`,
        );
      }
    }
    const complete = dados.length === total;
    const coverage: ContratosOrgaoCoverage = {
      orgao_id: orgao.id,
      orgao_nome: orgao.nome,
      fetched: dados.length,
      total: total!,
      pagesFetched,
      complete,
      maxPagesReached: !complete && pagesFetched >= maxPages,
    };
    return { dados, coverage };
  }

  const dados: JsonRecord[] = [];
  const by_orgao: ContratosOrgaoCoverage[] = [];
  const identities = new Set<number>();
  for (let start = 0; start < orgaos.length; start += 3) {
    const batch = await Promise.all(
      orgaos.slice(start, start + 3).map(fetchOrgao),
    );
    for (const result of batch) {
      for (const row of result.dados) {
        const id = integer(row.id)!;
        if (identities.has(id)) {
          throw new Error(`${dataset}: ID repetido entre órgãos`);
        }
        identities.add(id);
        dados.push(row);
      }
      by_orgao.push(result.coverage);
    }
  }
  return {
    dados,
    total: by_orgao.reduce((sum, row) => sum + row.total, 0),
    pagesFetched: by_orgao.reduce((sum, row) => sum + row.pagesFetched, 0),
    complete: by_orgao.every((row) => row.complete),
    maxPagesReached: by_orgao.some((row) => row.maxPagesReached),
    scope: options.allYears ? "all" : String(year),
    by_orgao,
  };
}
