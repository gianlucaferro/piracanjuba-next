/// <reference lib="deno.ns" />

import {
  CENTI_BASE_PREFEITURA,
  centiCall,
  type CentiListResult,
} from "./centi-client.ts";
import { type JsonRecord } from "./nucleogov-normalize.ts";

export const FOLHA_PREFEITURA_REFERER = "/cidadao/transparencia/servidores_cnt";
const ACTION = "servidores_cnt/listar";

type Orgao = { id: number; nome: string };
export type FolhaOrgaoCoverage = {
  orgao_id: number;
  orgao_nome: string;
  fetched: number;
  source_total: number;
  pages_fetched: number;
};

export type FolhaPrefeituraResult = CentiListResult<JsonRecord> & {
  scope: string;
  by_orgao: FolhaOrgaoCoverage[];
};

function record(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Folha: resposta da fonte invalida");
  }
  return value as JsonRecord;
}

async function listOrgaos(): Promise<Orgao[]> {
  const response = await centiCall(
    FOLHA_PREFEITURA_REFERER,
    [{ acao: "servidores_cnt/listarOrgaos" }],
    CENTI_BASE_PREFEITURA,
    { timeoutMs: 20_000 },
  );
  const raw: unknown = Object.values(response)[0];
  const rows: unknown = Array.isArray(raw) ? raw : record(raw).dados;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 100) {
    throw new Error("Folha: lista de orgaos vazia ou invalida");
  }
  const seen = new Set<number>();
  return rows.map((value) => {
    const row = record(value);
    const id = Number(row.id);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) {
      throw new Error("Folha: orgao sem identificador unico");
    }
    seen.add(id);
    return { id, nome: String(row.valor ?? row.nome ?? id) };
  });
}

async function fetchOrgao(
  orgao: Orgao,
  year: number,
  month: number,
  pageSize: number,
  maxPages: number,
): Promise<{ dados: JsonRecord[]; coverage: FolhaOrgaoCoverage }> {
  const dados: JsonRecord[] = [];
  let total: number | null = null;
  let pagesFetched = 0;
  const identities = new Set<string>();

  for (let page = 0; page < maxPages; page++) {
    const response = await centiCall(
      FOLHA_PREFEITURA_REFERER,
      [{
        acao: ACTION,
        extra: {
          ano: String(year),
          mes: String(month),
          orgao: String(orgao.id),
        },
        limit: { offset: page * pageSize, pageSize },
      }],
      CENTI_BASE_PREFEITURA,
      { timeoutMs: 20_000 },
    );
    const result = record(Object.values(response)[0]);
    const sourceTotal = result.total === null || result.total === undefined ||
        result.total === ""
      ? NaN
      : Number(result.total);
    if (
      !Number.isSafeInteger(sourceTotal) || sourceTotal < 0 ||
      !Array.isArray(result.dados)
    ) {
      throw new Error(
        `Folha orgao ${orgao.id}: resposta sem total ou dados validos`,
      );
    }
    if (Number(result.orgao_filtrado) !== orgao.id) {
      throw new Error(
        `Folha orgao ${orgao.id}: fonte nao confirmou filtro solicitado`,
      );
    }
    if (total !== null && total !== sourceTotal) {
      throw new Error(
        `Folha orgao ${orgao.id}: total mudou durante a paginacao`,
      );
    }
    total = sourceTotal;
    pagesFetched++;

    for (const value of result.dados) {
      const row = record(value);
      const portalId = Number(row.id);
      if (
        Number(row.ano) !== year || Number(row.mes) !== month ||
        Number(row.orgao_id) !== orgao.id ||
        !Number.isSafeInteger(portalId) || portalId <= 0 ||
        typeof row.nome !== "string" || !row.nome.trim()
      ) {
        throw new Error(
          `Folha orgao ${orgao.id}: registro fora do escopo ou sem identidade`,
        );
      }
      const identity = JSON.stringify([
        portalId,
        row.tipo_folha ?? "",
        row.tipo_movimentacao ?? "",
      ]);
      if (identities.has(identity)) {
        throw new Error(
          `Folha orgao ${orgao.id}: registro repetido entre paginas`,
        );
      }
      identities.add(identity);
      dados.push(row);
    }
    if (dados.length > total) {
      throw new Error(
        `Folha orgao ${orgao.id}: registros excedem o total informado`,
      );
    }
    if (dados.length === total) {
      return {
        dados,
        coverage: {
          orgao_id: orgao.id,
          orgao_nome: orgao.nome,
          fetched: dados.length,
          source_total: total,
          pages_fetched: pagesFetched,
        },
      };
    }
    if (result.dados.length < pageSize) break;
  }
  throw new Error(
    `Folha orgao ${orgao.id}: paginacao incompleta ${dados.length}/${
      total ?? "?"
    }`,
  );
}

export async function fetchFolhaPrefeitura(options: {
  year: number;
  month: number;
  forced: boolean;
  pageSize: number;
  maxPages: number;
}): Promise<FolhaPrefeituraResult> {
  const orgaos = await listOrgaos();
  const attempts = options.forced ? 1 : 4;
  for (let fallback = 0; fallback < attempts; fallback++) {
    const date = new Date(
      Date.UTC(options.year, options.month - 1 - fallback, 1),
    );
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const dados: JsonRecord[] = [];
    const byOrgao: FolhaOrgaoCoverage[] = [];
    const originOrgaos = new Map<number, number>();
    // Duas requisicoes simultaneas limitam a carga na fonte municipal.
    for (let index = 0; index < orgaos.length; index += 2) {
      const results = await Promise.all(
        orgaos.slice(index, index + 2).map((orgao) =>
          fetchOrgao(orgao, year, month, options.pageSize, options.maxPages)
        ),
      );
      for (const result of results) {
        for (const row of result.dados) {
          const id = Number(row.id);
          const orgao = Number(row.orgao_id);
          const existing = originOrgaos.get(id);
          if (existing !== undefined && existing !== orgao) {
            throw new Error(
              "Folha: identificador de vinculo reutilizado entre orgaos",
            );
          }
          originOrgaos.set(id, orgao);
          dados.push(row);
        }
        byOrgao.push(result.coverage);
      }
    }
    if (dados.length > 0 || options.forced) {
      return {
        dados,
        total: byOrgao.reduce((sum, orgao) => sum + orgao.source_total, 0),
        pagesFetched: byOrgao.reduce(
          (sum, orgao) => sum + orgao.pages_fetched,
          0,
        ),
        complete: true,
        maxPagesReached: false,
        scope: `${year}-${String(month).padStart(2, "0")}`,
        by_orgao: byOrgao,
      };
    }
  }
  throw new Error(
    "Folha: nenhuma competencia publicada nos orgaos consultados",
  );
}
