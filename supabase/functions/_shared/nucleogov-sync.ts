/// <reference lib="deno.ns" />

// deno-lint-ignore no-import-prefix
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CENTI_BASE_PREFEITURA,
  centiFinanceList,
  centiListAllWithMeta,
  type CentiListResult,
  centiListUnpaginated,
} from "./centi-client.ts";
import { checkCentiAuth } from "./centi-auth.ts";
import {
  type JsonRecord,
  normalizeAditivo,
  normalizeAto,
  normalizeContrato,
  normalizeDiaria,
  normalizeEmpenho,
  normalizeFiscalContrato,
  normalizeFolha,
  normalizePagamento,
} from "./nucleogov-normalize.ts";

export type NucleoGovDataset =
  | "contratos"
  | "aditivos"
  | "fiscais"
  | "empenhos"
  | "pagamentos"
  | "diarias"
  | "folha"
  | "atos";

// O cliente e intencionalmente sem schema gerado: as tabelas desta migration ainda
// nao existem no Database type compartilhado no momento do primeiro deploy.
// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

const EMPENHO_ORGAOS = [22, 55, 67, 66, 44, 71, 68, 70, 72, 56, 23];
const EMPENHO_ORGAOS_PERMITIDOS = new Set(EMPENHO_ORGAOS);

const DATASET_CONFIG: Record<
  Exclude<NucleoGovDataset, "empenhos">,
  { referer: string; action: string }
> = {
  contratos: {
    referer: "/cidadao/transparencia/contratos_cnt",
    action: "contratos_cnt/listar",
  },
  aditivos: {
    referer: "/cidadao/transparencia/aditivos_cnt",
    action: "aditivos_cnt/listar",
  },
  fiscais: {
    referer: "/cidadao/transparencia/fiscais_contratos_sg",
    action: "sg_fiscais_contratos/buscaAvancada",
  },
  pagamentos: {
    referer: "/cidadao/transparencia/ordem_cronologica_pagamentos_cnt",
    action: "ordem_cronologica_pagamentos_cnt/listar",
  },
  diarias: {
    referer: "/cidadao/transparencia/diarias_cnt",
    action: "diarias_cnt/listar",
  },
  folha: {
    referer: "/cidadao/transparencia/servidores_cnt",
    action: "servidores_cnt/listar",
  },
  atos: {
    referer: "/cidadao/transparencia/atos_cnt",
    action: "atos_cnt/listar",
  },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function currentYear(): number {
  return new Date().getUTCFullYear();
}

function boundedInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`Parametro inteiro invalido: ${String(value)}`);
  }
  return parsed;
}

async function readBody(req: Request): Promise<JsonRecord> {
  if (req.method !== "POST") return {};
  const body = await req.json().catch(() => ({}));
  return body && typeof body === "object" && !Array.isArray(body)
    ? body as JsonRecord
    : {};
}

async function upsertChunks(
  supabase: SupabaseClient,
  table: string,
  rows: JsonRecord[],
  onConflict: string,
  chunkSize = 100,
): Promise<number> {
  const conflictFields = onConflict.split(",").map((field) => field.trim());
  const uniqueRows = new Map<string, JsonRecord>();
  for (const row of rows) {
    const conflictKey = JSON.stringify(
      conflictFields.map((field) => row[field] ?? null),
    );
    uniqueRows.set(conflictKey, row);
  }
  const deduplicated = [...uniqueRows.values()];
  let written = 0;
  for (let index = 0; index < deduplicated.length; index += chunkSize) {
    const chunk = deduplicated.slice(index, index + chunkSize);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict });
    if (error) {
      throw new Error(
        `${table} lote ${index / chunkSize + 1}: ${error.message}`,
      );
    }
    written += chunk.length;
  }
  return written;
}

async function startLog(
  supabase: SupabaseClient,
  functionName: string,
  scope: JsonRecord,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("sync_log")
    .insert({
      tipo: functionName,
      status: "running",
      detalhes: { source: "nucleogov", scope },
    })
    .select("id")
    .single();
  if (error) throw new Error(`sync_log start: ${error.message}`);
  return data?.id ?? null;
}

async function finishLog(
  supabase: SupabaseClient,
  logId: string | null,
  status: "success" | "partial" | "error",
  details: JsonRecord,
) {
  if (!logId) return;
  const { error } = await supabase
    .from("sync_log")
    .update({
      status,
      detalhes: details,
      finished_at: new Date().toISOString(),
    })
    .eq("id", logId);
  if (error) console.error("sync_log finish:", error.message);
}

async function saveState(
  supabase: SupabaseClient,
  dataset: string,
  scope: string,
  fetched: number,
  sourceTotal: number | null,
  complete: boolean,
) {
  const { error } = await supabase.from("prefeitura_sync_state").upsert({
    dataset,
    scope,
    fetched,
    source_total: sourceTotal,
    complete,
    checked_at: new Date().toISOString(),
  }, { onConflict: "dataset,scope" });
  if (error) throw new Error(`prefeitura_sync_state: ${error.message}`);
}

function ensureUsableResult(
  dataset: string,
  fetched: number,
  sourceTotal: number | null,
) {
  if (fetched === 0 && sourceTotal !== 0) {
    throw new Error(`${dataset}: fonte retornou vazio sem total zero`);
  }
}

async function syncPagedDataset(
  dataset: "contratos" | "aditivos" | "fiscais" | "folha" | "atos",
  body: JsonRecord,
): Promise<CentiListResult<JsonRecord> & { scope: string }> {
  const config = DATASET_CONFIG[dataset];
  const pageSize = boundedInteger(body.pageSize, 250, 25, 500);
  const maxPages = boundedInteger(body.maxPages, 10, 1, 40);
  const extra: Record<string, string> = {};
  let scope = "all";

  if (dataset === "contratos" || dataset === "aditivos" || dataset === "atos") {
    if (body.allYears !== true) {
      const year = boundedInteger(
        body.year,
        currentYear(),
        2000,
        currentYear(),
      );
      extra.ano = String(year);
      scope = String(year);
    }
  }

  if (dataset === "folha") {
    const requestedYear = body.year === undefined
      ? currentYear()
      : boundedInteger(body.year, currentYear(), 2000, currentYear());
    const requestedMonth = body.month === undefined
      ? new Date().getUTCMonth() + 1
      : boundedInteger(body.month, 1, 1, 12);

    for (let fallback = 0; fallback < 4; fallback++) {
      const date = new Date(
        Date.UTC(requestedYear, requestedMonth - 1 - fallback, 1),
      );
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const result = await centiListAllWithMeta<JsonRecord>(
        config.referer,
        config.action,
        {
          base: CENTI_BASE_PREFEITURA,
          extra: { ano: String(year), mes: String(month) },
          pageSize,
          maxPages,
        },
      );
      if (
        result.dados.length > 0 ||
        result.total === 0 && body.month !== undefined
      ) {
        return {
          ...result,
          scope: `${year}-${String(month).padStart(2, "0")}`,
        };
      }
    }
    return {
      dados: [],
      total: null,
      pagesFetched: 0,
      complete: false,
      maxPagesReached: false,
      scope: `${requestedYear}-${String(requestedMonth).padStart(2, "0")}`,
    };
  }

  const result = await centiListAllWithMeta<JsonRecord>(
    config.referer,
    config.action,
    {
      base: CENTI_BASE_PREFEITURA,
      extra,
      pageSize,
      maxPages,
    },
  );
  return { ...result, scope };
}

async function writeContratos(
  supabase: SupabaseClient,
  raw: JsonRecord[],
): Promise<{ canonical: number; compatibility: number; discarded: number }> {
  const rows = raw.map(normalizeContrato).filter((row) => row !== null);
  const canonical = await upsertChunks(
    supabase,
    "prefeitura_contratos",
    rows,
    "id",
  );

  const compatibilityRows = rows.map((row) => ({
    numero: row.numero,
    empresa: row.fornecedor_nome,
    valor: row.valor,
    objeto: row.objeto,
    vigencia_inicio: row.vigencia_inicio,
    vigencia_fim: row.vigencia_fim,
    status: row.situacao,
    fonte_url: row.fonte_url,
    empresa_cnpj: row.fornecedor_documento,
    updated_at: row.updated_at,
  }));
  const compatibility = await upsertChunks(
    supabase,
    "contratos",
    compatibilityRows,
    "numero,vigencia_inicio,empresa,valor",
  );
  return { canonical, compatibility, discarded: raw.length - rows.length };
}

async function writeAditivos(
  supabase: SupabaseClient,
  raw: JsonRecord[],
): Promise<{ canonical: number; compatibility: number; discarded: number }> {
  const rows = raw.map(normalizeAditivo).filter((row) => row !== null);
  const canonical = await upsertChunks(
    supabase,
    "prefeitura_aditivos",
    rows,
    "id",
  );

  const contractIds = [...new Set(rows.map((row) => row.contrato_id))];
  const contractNumber = new Map<number, string>();
  for (let index = 0; index < contractIds.length; index += 200) {
    const { data, error } = await supabase
      .from("prefeitura_contratos")
      .select("id,numero")
      .in("id", contractIds.slice(index, index + 200));
    if (error) throw new Error(`mapa contratos/aditivos: ${error.message}`);
    for (const contract of data ?? []) {
      if (contract.numero) {
        contractNumber.set(Number(contract.id), contract.numero);
      }
    }
  }

  const compatibilityRows = rows
    .filter((row) => contractNumber.has(row.contrato_id))
    .map((row) => ({
      contrato_numero: contractNumber.get(row.contrato_id)!,
      termo: row.termo ?? 0,
      tipo: row.tipo,
      tipo_aditivo: row.tipo_aditivo,
      data_termo: row.data_termo,
      prazo: row.prazo,
      cnpj: row.credor_documento,
      credor: row.credor_nome ?? "NAO INFORMADO",
      valor: row.valor,
      ano: row.ano ?? currentYear(),
      fonte_url: row.fonte_url,
      centi_id: String(row.id),
      updated_at: row.updated_at,
    }));
  const compatibility = compatibilityRows.length > 0
    ? await upsertChunks(
      supabase,
      "contratos_aditivos",
      compatibilityRows,
      "contrato_numero,termo,ano,credor",
    )
    : 0;
  return { canonical, compatibility, discarded: raw.length - rows.length };
}

async function writeFiscais(supabase: SupabaseClient, raw: JsonRecord[]) {
  const rows = raw
    .map(normalizeFiscalContrato)
    .filter((row) => row !== null);
  return {
    canonical: await upsertChunks(
      supabase,
      "prefeitura_fiscais_contratos",
      rows,
      "chave",
    ),
    compatibility: 0,
    discarded: raw.length - rows.length,
  };
}

async function writePagamentos(supabase: SupabaseClient, raw: JsonRecord[]) {
  const rows = raw.map(normalizePagamento).filter((row) => row !== null);
  return {
    canonical: await upsertChunks(
      supabase,
      "prefeitura_pagamentos_ordem",
      rows,
      "chave",
    ),
    compatibility: 0,
    discarded: raw.length - rows.length,
  };
}

async function writeDiarias(supabase: SupabaseClient, raw: JsonRecord[]) {
  const rows = raw.map(normalizeDiaria).filter((row) => row !== null);
  const canonical = await upsertChunks(
    supabase,
    "prefeitura_diarias_nucleogov",
    rows,
    "chave",
  );
  const compatibilityRows = rows.map((row) => ({
    nucleogov_chave: row.chave,
    servidor_nome: row.favorecido,
    destino: row.destino ?? row.cidade,
    motivo: row.descricao,
    valor: row.valor,
    data: row.data_inicio,
    fonte_url: row.fonte_url,
    updated_at: row.updated_at,
  }));
  return {
    canonical,
    compatibility: await upsertChunks(
      supabase,
      "diarias",
      compatibilityRows,
      "nucleogov_chave",
    ),
    discarded: raw.length - rows.length,
  };
}

async function writeAtos(supabase: SupabaseClient, raw: JsonRecord[]) {
  const rows = raw.map(normalizeAto).filter((row) => row !== null);
  const canonical = await upsertChunks(
    supabase,
    "prefeitura_atos_nucleogov",
    rows,
    "chave",
  );
  const mapAto = (row: NonNullable<(typeof rows)[number]>) => ({
    numero: row.numero,
    data_publicacao: row.data_publicacao,
    ementa: row.ementa ?? row.numero,
    orgao: "Prefeitura de Piracanjuba",
    categoria: row.tipo,
    fonte_url: row.documento_url ?? row.fonte_url,
    updated_at: row.updated_at,
  });
  const decretos = rows
    .filter((row) =>
      row.numero && row.tipo?.toUpperCase().startsWith("DECRETO")
    )
    .map(mapAto);
  const portarias = rows
    .filter((row) =>
      row.numero && row.tipo?.toUpperCase().startsWith("PORTARIA")
    )
    .map(mapAto);
  const compatibility = await upsertChunks(
    supabase,
    "decretos",
    decretos,
    "numero",
  ) +
    await upsertChunks(supabase, "portarias", portarias, "numero");
  return { canonical, compatibility, discarded: raw.length - rows.length };
}

async function writeFolha(supabase: SupabaseClient, raw: JsonRecord[]) {
  const rows = raw.map(normalizeFolha).filter((row) => row !== null);
  const canonical = await upsertChunks(
    supabase,
    "prefeitura_folha_nucleogov",
    rows,
    "chave",
  );

  const servidores = rows.map((row) => ({
    nucleogov_portal_id: row.portal_id,
    origem_chave: `prefeitura:nucleogov:${row.portal_id}`,
    nome: row.nome,
    cargo: row.cargo,
    orgao_tipo: "prefeitura",
    fonte_url: row.fonte_url,
    matricula: row.matricula,
    lotacao: row.lotacao,
    data_admissao: row.data_admissao,
    tipo_admissao: row.tipo_admissao,
    decreto_admissao: row.decreto,
    carga_horaria: row.carga_horaria,
    situacao_funcional: row.situacao,
    updated_at: row.updated_at,
  }));
  await upsertChunks(
    supabase,
    "servidores",
    servidores,
    "origem_chave",
  );

  const servidorIds = new Map<number, string>();
  const portalIds = [...new Set(rows.map((row) => row.portal_id))];
  for (let index = 0; index < portalIds.length; index += 100) {
    const { data, error } = await supabase
      .from("servidores")
      .select("id,nucleogov_portal_id")
      .eq("orgao_tipo", "prefeitura")
      .in("nucleogov_portal_id", portalIds.slice(index, index + 100));
    if (error) throw new Error(`mapa folha/servidores: ${error.message}`);
    for (const servidor of data ?? []) {
      servidorIds.set(servidor.nucleogov_portal_id, servidor.id);
    }
  }

  const remuneracoes = rows
    .filter((row) => servidorIds.has(row.portal_id))
    .map((row) => ({
      servidor_id: servidorIds.get(row.portal_id)!,
      competencia: `${row.ano}-${String(row.mes).padStart(2, "0")}`,
      bruto: row.total_proventos,
      liquido: row.total_liquido,
      tipo_folha: row.tipo_folha ?? "NORMAL",
      fonte_url: row.fonte_url,
      updated_at: row.updated_at,
    }));
  const compatibility = await upsertChunks(
    supabase,
    "remuneracao_servidores",
    remuneracoes,
    "servidor_id,competencia,tipo_folha",
  );
  return { canonical, compatibility, discarded: raw.length - rows.length };
}

function formatDateBR(date: Date): string {
  return [
    String(date.getUTCDate()).padStart(2, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    date.getUTCFullYear(),
  ].join("/");
}

function parseIsoDate(value: unknown, label: string): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} deve usar YYYY-MM-DD`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`${label} invalida`);
  }
  return date;
}

async function syncEmpenhos(
  supabase: SupabaseClient,
  body: JsonRecord,
): Promise<{
  scope: string;
  fetched: number;
  sourceTotal: number;
  complete: boolean;
  writes: { canonical: number; compatibility: number; discarded: number };
  extra: JsonRecord;
}> {
  const orgaosSolicitados = Array.isArray(body.orgaos)
    ? body.orgaos.map((value) => boundedInteger(value, 0, 1, 999))
    : EMPENHO_ORGAOS;
  const orgaos = [...new Set(orgaosSolicitados)];
  if (
    orgaos.length === 0 ||
    orgaos.length > EMPENHO_ORGAOS.length ||
    orgaos.some((orgao) => !EMPENHO_ORGAOS_PERMITIDOS.has(orgao))
  ) {
    throw new Error("lista de orgaos de empenhos invalida");
  }
  const now = new Date();
  let start: Date;
  let end: Date;
  if (body.startDate !== undefined || body.endDate !== undefined) {
    start = parseIsoDate(body.startDate, "startDate");
    end = parseIsoDate(body.endDate, "endDate");
    const days = (end.getTime() - start.getTime()) / 86_400_000;
    if (days < 0 || days > 93) {
      throw new Error("intervalo de empenhos deve ter entre 0 e 93 dias");
    }
  } else {
    const monthsBack = boundedInteger(body.monthsBack, 1, 0, 6);
    start = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() - monthsBack,
      1,
    ));
    end = now;
  }
  const raw: JsonRecord[] = [];
  let sourceTotal = 0;
  const byOrgao: Record<string, number> = {};

  for (const orgao of orgaos) {
    const data = await centiFinanceList<JsonRecord>(
      "/cidadao/transparencia/despesas",
      "empenhos",
      {
        id_orgao: String(orgao),
        data_inicio: formatDateBR(start),
        data_fim: formatDateBR(end),
      },
      { base: CENTI_BASE_PREFEITURA },
    );
    const reported = data.length > 0
      ? Number(data[0].TotalRegistros ?? data.length)
      : 0;
    sourceTotal += Number.isFinite(reported) ? reported : data.length;
    byOrgao[String(orgao)] = data.length;
    raw.push(...data.map((row) => ({ ...row, __orgao_id: orgao })));
  }

  ensureUsableResult("empenhos", raw.length, sourceTotal);
  const rows = raw
    .map((row) => normalizeEmpenho(row, Number(row.__orgao_id)))
    .filter((row) => row !== null);
  const canonical = await upsertChunks(
    supabase,
    "prefeitura_empenhos",
    rows,
    "id",
  );
  const compatibilityRows = rows
    .filter((row) =>
      row.data !== null &&
      (row.valor_pago ?? row.valor_liquidado ?? row.valor_empenhado) !== null
    )
    .map((row) => ({
      nucleogov_empenho_id: row.id,
      data: row.data,
      favorecido: row.fornecedor_nome,
      valor: row.valor_pago ?? row.valor_liquidado ?? row.valor_empenhado,
      descricao: row.historico,
      fonte_url: row.fonte_url,
      updated_at: row.updated_at,
    }));
  const compatibility = await upsertChunks(
    supabase,
    "despesas",
    compatibilityRows,
    "nucleogov_empenho_id",
  );
  return {
    scope: `${formatDateBR(start)}:${formatDateBR(end)}`,
    fetched: raw.length,
    sourceTotal,
    complete: raw.length >= sourceTotal,
    writes: {
      canonical,
      compatibility,
      discarded: raw.length - rows.length,
    },
    extra: { by_orgao: byOrgao },
  };
}

export function createNucleoGovSyncHandler(
  dataset: NucleoGovDataset,
  functionName: string,
) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (!checkCentiAuth(req)) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const startedAt = Date.now();
    let logId: string | null = null;
    let scope: JsonRecord = {};

    try {
      const body = await readBody(req);
      scope = body;
      logId = await startLog(supabase, functionName, body);

      let fetched: number;
      let sourceTotal: number | null;
      let complete: boolean;
      let scopeKey: string;
      let writes: {
        canonical: number;
        compatibility: number;
        discarded: number;
      };
      let extra: JsonRecord = {};

      if (dataset === "empenhos") {
        const result = await syncEmpenhos(supabase, body);
        fetched = result.fetched;
        sourceTotal = result.sourceTotal;
        complete = result.complete;
        scopeKey = result.scope;
        writes = result.writes;
        extra = result.extra;
      } else if (
        dataset === "pagamentos" || dataset === "diarias"
      ) {
        const config = DATASET_CONFIG[dataset];
        const result = await centiListUnpaginated<JsonRecord>(
          config.referer,
          config.action,
          { base: CENTI_BASE_PREFEITURA },
        );
        fetched = result.dados.length;
        sourceTotal = result.total ?? result.dados.length;
        complete = result.total === null || result.dados.length >= result.total;
        scopeKey = "all";
        ensureUsableResult(dataset, fetched, sourceTotal);
        writes = dataset === "pagamentos"
          ? await writePagamentos(supabase, result.dados)
          : await writeDiarias(supabase, result.dados);
      } else {
        const result = await syncPagedDataset(dataset, body);
        fetched = result.dados.length;
        sourceTotal = result.total;
        complete = result.complete;
        scopeKey = result.scope;
        ensureUsableResult(dataset, fetched, sourceTotal);
        extra = {
          pages_fetched: result.pagesFetched,
          max_pages_reached: result.maxPagesReached,
        };
        switch (dataset) {
          case "contratos":
            writes = await writeContratos(supabase, result.dados);
            break;
          case "aditivos":
            writes = await writeAditivos(supabase, result.dados);
            break;
          case "fiscais":
            writes = await writeFiscais(supabase, result.dados);
            break;
          case "folha":
            writes = await writeFolha(supabase, result.dados);
            break;
          case "atos":
            writes = await writeAtos(supabase, result.dados);
            break;
        }
      }

      if (fetched > 0 && writes.canonical === 0) {
        throw new Error(
          `${dataset}: fonte retornou ${fetched} registros, mas nenhum foi normalizado`,
        );
      }

      await saveState(
        supabase,
        dataset,
        scopeKey,
        fetched,
        sourceTotal,
        complete,
      );
      const status = complete ? "success" : "partial";
      const details = {
        dataset,
        scope: scopeKey,
        source: "nucleogov",
        source_total: sourceTotal,
        fetched,
        complete,
        writes,
        duration_ms: Date.now() - startedAt,
        ...extra,
      };
      await finishLog(supabase, logId, status, details);
      return jsonResponse(
        { success: complete, status, ...details },
        complete ? 200 : 206,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const details = {
        dataset,
        scope,
        source: "nucleogov",
        error: message,
        duration_ms: Date.now() - startedAt,
      };
      await finishLog(supabase, logId, "error", details);
      return jsonResponse({ success: false, ...details }, 500);
    }
  };
}
