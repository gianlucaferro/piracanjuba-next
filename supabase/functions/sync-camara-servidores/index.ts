/// <reference lib="deno.ns" />
// deno-lint-ignore no-import-prefix
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkCentiAuth } from "../_shared/centi-auth.ts";
import {
  planLegacyOriginAdoptions,
  servidorOriginKey,
} from "../_shared/servidor-origin.ts";
import {
  assertPersistenceSucceeded,
  mapIdsByOrigin,
} from "../_shared/persistence-guards.ts";
import { CENTI_BASE_CAMARA, centiCall } from "../_shared/centi-client.ts";

import {
  folhaCompetencias,
  preserveServidorUpdates,
} from "../_shared/folha-retroativa.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-cron-secret, x-centi-ingest-secret, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = CENTI_BASE_CAMARA;
const SOURCE_URL = `${BASE_URL}/cidadao/transparencia/servidores_cnt`;

function parseBRL(str: string): number | null {
  if (!str || str.trim() === "") return null;
  const cleaned = str.replace("R$", "").replace(/\./g, "").replace(",", ".")
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

type JsonRecord = Record<string, unknown>;

interface ScrapedServidor {
  portalId: number;
  matricula: string;
  nome: string;
  cargo: string | null;
  bruto: number | null;
  liquido: number | null;
  tipoFolha: string;
  lotacao: string | null;
  dataAdmissao: string | null;
  tipoAdmissao: string | null;
  decreto: string | null;
  cargaHoraria: string | null;
  situacao: string | null;
  origemChave: string;
}

function optionalText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function parsePortalDate(value: unknown): string | null {
  const text = optionalText(value);
  if (!text) return null;
  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const [, day, month, year] = br;
    const iso = `${year}-${month}-${day}`;
    const date = new Date(`${iso}T00:00:00Z`);
    if (
      date.getUTCFullYear() === Number(year) &&
      date.getUTCMonth() + 1 === Number(month) &&
      date.getUTCDate() === Number(day)
    ) {
      return iso;
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  throw new Error(`Data de admissão inválida na Câmara: ${text}`);
}

function parsePortalRow(row: JsonRecord): ScrapedServidor | null {
  const portalId = Number(row.id);
  const matricula = optionalText(row.matricula);
  const nome = optionalText(row.nome);
  if (!Number.isInteger(portalId) || portalId <= 0 || !matricula || !nome) {
    return null;
  }

  const bruto = parseBRL(String(row.total_proventos ?? ""));
  const descontos = parseBRL(String(row.total_descontos ?? ""));
  const liquidoFonte = parseBRL(String(row.total_liquido ?? ""));
  const liquido = liquidoFonte ??
    (bruto !== null && descontos !== null
      ? Math.round((bruto - descontos) * 100) / 100
      : null);

  return {
    portalId,
    matricula,
    nome,
    cargo: optionalText(row.cargo),
    bruto,
    liquido,
    tipoFolha: optionalText(row.tipo_folha)?.toUpperCase() || "MENSAL",
    lotacao: optionalText(row.lotacao),
    dataAdmissao: parsePortalDate(row.data_admissao),
    tipoAdmissao: optionalText(row.tipo_admissao),
    decreto: optionalText(row.decreto),
    cargaHoraria: optionalText(row.carga_horaria),
    situacao: optionalText(row.situacao),
    origemChave: servidorOriginKey("camara", "nucleogov", portalId),
  };
}

type Competencia = { ano: number; mes: number; competencia: string };
type FolhaSource = Competencia & {
  dados: ScrapedServidor[];
  total: number;
  complete: boolean;
};
type MonthResult = Competencia & {
  status: "pending" | "success" | "dry_run" | "error";
  stage: "collection" | "persistence" | "complete";
  source_total: number | null;
  source_complete: boolean;
  registros_folha: number;
  servidores: number;
  servidores_atualizados: number;
  remuneracoes: number;
  error?: string;
};

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Folha Câmara: resposta da fonte inválida");
  }
  return value as JsonRecord;
}

async function fetchFolha(mes: number, ano: number) {
  const dados: ScrapedServidor[] = [];
  const identities = new Set<string>();
  let total: number | null = null;
  const pageSize = 100;
  for (let page = 0; page < 30; page++) {
    const response = await centiCall(
      "/cidadao/transparencia/servidores_cnt",
      [{
        acao: "servidores_cnt/listar",
        extra: { ano: String(ano), mes: String(mes) },
        limit: { offset: page * pageSize, pageSize },
      }],
      CENTI_BASE_CAMARA,
      { timeoutMs: 20_000 },
    );
    const result = asRecord(Object.values(response)[0]);
    if (result.error || result.erro || result.success === false) {
      throw new Error("Folha Câmara: fonte informou erro na consulta");
    }
    const reported = result.total === null || result.total === undefined ||
        result.total === ""
      ? NaN
      : Number(result.total);
    if (
      !Number.isSafeInteger(reported) || reported < 0 ||
      !Array.isArray(result.dados)
    ) {
      throw new Error("Folha Câmara: resposta sem total ou dados válidos");
    }
    if (total !== null && total !== reported) {
      throw new Error("Folha Câmara: total mudou durante a paginação");
    }
    total = reported;
    for (const value of result.dados) {
      const row = asRecord(value);
      if (Number(row.ano) !== ano || Number(row.mes) !== mes) {
        throw new Error(
          "Folha Câmara: registro fora da competência solicitada",
        );
      }
      const parsed = parsePortalRow(row);
      if (!parsed) throw new Error("Folha Câmara: registro sem identidade");
      const identity = JSON.stringify([
        parsed.origemChave,
        parsed.tipoFolha,
        row.tipo_movimentacao ?? "",
      ]);
      if (identities.has(identity)) {
        throw new Error("Folha Câmara: registro repetido entre páginas");
      }
      identities.add(identity);
      dados.push(parsed);
    }
    if (dados.length > total) {
      throw new Error("Folha Câmara: registros excedem o total informado");
    }
    if (dados.length === total) return { dados, total, complete: true };
    if (result.dados.length < pageSize) break;
  }
  throw new Error(
    `Folha Câmara: paginação incompleta ${dados.length}/${total ?? "?"}`,
  );
}

function currentMonth(now = new Date()) {
  return { ano: now.getUTCFullYear(), mes: now.getUTCMonth() + 1 };
}

function uniqueRemuneracoes(rows: ScrapedServidor[]): ScrapedServidor[] {
  const unique = new Map<string, ScrapedServidor>();
  for (const row of rows) {
    const key = `${row.origemChave}\u0000${row.tipoFolha}`;
    const previous = unique.get(key);
    if (!previous || previous.bruto === null && row.bruto !== null) {
      unique.set(key, row);
    }
  }
  return [...unique.values()];
}

function uniqueServidores(rows: ScrapedServidor[]): ScrapedServidor[] {
  const unique = new Map<string, ScrapedServidor>();
  for (const row of rows) {
    const previous = unique.get(row.origemChave);
    if (!previous || !previous.cargo && row.cargo) {
      unique.set(row.origemChave, row);
    }
  }
  return [...unique.values()];
}

async function fetchFolhaWindow(
  year: number,
  month: number,
  explicit: boolean,
) {
  const sources: FolhaSource[] = [];
  const results: MonthResult[] = [];
  for (const period of folhaCompetencias(year, month, explicit)) {
    const result: MonthResult = {
      ...period,
      status: "pending",
      stage: "collection",
      source_total: null,
      source_complete: false,
      registros_folha: 0,
      servidores: 0,
      servidores_atualizados: 0,
      remuneracoes: 0,
    };
    results.push(result);
    try {
      const source = await fetchFolha(period.mes, period.ano);
      if (!source.complete) throw new Error("Folha Câmara: coleta incompleta");
      const dados = uniqueRemuneracoes(source.dados);
      sources.push({ ...source, ...period, dados });
      Object.assign(result, {
        source_total: source.total,
        source_complete: true,
        registros_folha: dados.length,
        servidores: uniqueServidores(dados).length,
      });
    } catch (error) {
      result.status = "error";
      result.error = error instanceof Error ? error.message : String(error);
    }
  }
  return { sources, results };
}

function responseJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function dryRunFlag(value: unknown): boolean {
  if (
    value === undefined || value === null || value === false ||
    value === "false" || value === "0"
  ) return false;
  if (value === true || value === "true" || value === "1") return true;
  throw new Error("dry_run deve ser true ou false");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (!checkCentiAuth(req)) {
    return responseJson({ success: false, error: "Unauthorized" }, 401);
  }

  const startedAt = Date.now();
  const url = new URL(req.url);
  const mesParam = url.searchParams.get("mes");
  const anoParam = url.searchParams.get("ano");
  const forced = mesParam !== null || anoParam !== null;
  const fallback = currentMonth();
  const requestedMonth = mesParam !== null ? Number(mesParam) : fallback.mes;
  const requestedYear = anoParam !== null ? Number(anoParam) : fallback.ano;
  if (
    forced &&
    (mesParam === null || anoParam === null || !mesParam.trim() ||
      !anoParam.trim())
  ) {
    return responseJson(
      { success: false, error: "Informe mes e ano juntos" },
      400,
    );
  }
  if (
    !Number.isInteger(requestedMonth) || requestedMonth < 1 ||
    requestedMonth > 12 ||
    !Number.isInteger(requestedYear) || requestedYear < 2000 ||
    requestedYear > fallback.ano ||
    requestedYear === fallback.ano && requestedMonth > fallback.mes
  ) {
    return responseJson({ success: false, error: "Competência inválida" }, 400);
  }
  let dryRun: boolean;
  try {
    const text = req.method === "POST" ? await req.text() : "";
    const body = text.trim() ? asRecord(JSON.parse(text)) : {};
    const queryFlag = url.searchParams.get("dry_run");
    if (body.dry_run !== undefined && typeof body.dry_run !== "boolean") {
      throw new Error("dry_run JSON deve ser booleano");
    }
    if (
      queryFlag !== null && body.dry_run !== undefined &&
      dryRunFlag(queryFlag) !== body.dry_run
    ) {
      throw new Error("dry_run divergente na URL e no corpo");
    }
    dryRun = dryRunFlag(queryFlag ?? body.dry_run);
  } catch {
    return responseJson({
      success: false,
      error: "Corpo JSON ou dry_run inválido",
    }, 400);
  }
  const requestedCompetencia = `${requestedYear}-${
    String(requestedMonth).padStart(2, "0")
  }`;
  // Simulação não instancia cliente nem escreve logs, cadastros ou remunerações.
  const sb = dryRun ? null : createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  let logId: string | null = null;
  let results: MonthResult[] = [];
  let stage = "start";
  try {
    if (sb) {
      const { data, error } = await sb.from("sync_log").insert({
        tipo: "camara_servidores",
        status: "running",
        detalhes: {
          requested_competencia: requestedCompetencia,
          forced,
          revision_months: forced ? 1 : 4,
        },
      }).select("id").single();
      assertPersistenceSucceeded("sync_log start", error);
      logId = data?.id ?? null;
    }
    stage = "collection";
    const window = await fetchFolhaWindow(
      requestedYear,
      requestedMonth,
      forced,
    );
    const { sources } = window;
    results = window.results;
    const latestByOrigin = new Map<
      string,
      { row: ScrapedServidor; competencia: string }
    >();
    for (const source of sources) {
      for (const row of uniqueServidores(source.dados)) {
        if (!latestByOrigin.has(row.origemChave)) {
          latestByOrigin.set(row.origemChave, {
            row,
            competencia: source.competencia,
          });
        }
      }
    }

    let adopted = 0;
    stage = "identity";
    if (sb && latestByOrigin.size > 0) {
      const storedCamara: { id: string; nome: string; origem_chave: string }[] =
        [];
      for (let offset = 0;; offset += 500) {
        const { data, error } = await sb.from("servidores")
          .select("id, nome, origem_chave").eq("orgao_tipo", "camara")
          .order("id").range(offset, offset + 499);
        assertPersistenceSucceeded("Busca identidades Câmara", error);
        storedCamara.push(...(data ?? []));
        if ((data ?? []).length < 500) break;
      }
      // Uma origem repetida em meses diferentes continua sendo um só vínculo.
      const adoptions = planLegacyOriginAdoptions(
        [...latestByOrigin.values()].map(({ row }) => row),
        storedCamara,
        "camara:nome:",
      );
      for (const adoption of adoptions) {
        const { error } = await sb.from("servidores").update({
          origem_chave: adoption.nextOrigin,
          fonte_url: SOURCE_URL,
          updated_at: new Date().toISOString(),
        }).eq("id", adoption.id).eq("origem_chave", adoption.previousOrigin)
          .select("id").single();
        assertPersistenceSucceeded("Adoção de identidade Câmara", error);
        adopted++;
      }
    }

    stage = "persistence";
    for (const source of sources) {
      const result = results.find((value) =>
        value.competencia === source.competencia
      )!;
      if (!sb) {
        result.status = "dry_run";
        result.stage = "complete";
        continue;
      }
      result.stage = "persistence";
      try {
        const serverEntries = uniqueServidores(source.dados);
        const candidates = serverEntries
          .filter((row) =>
            latestByOrigin.get(row.origemChave)?.competencia ===
              source.competencia
          )
          .map((row) => ({
            nucleogov_portal_id: row.portalId,
            nome: row.nome,
            cargo: row.cargo,
            matricula: row.matricula,
            lotacao: row.lotacao,
            data_admissao: row.dataAdmissao,
            tipo_admissao: row.tipoAdmissao,
            decreto_admissao: row.decreto,
            carga_horaria: row.cargaHoraria,
            situacao_funcional: row.situacao,
            fonte_url: SOURCE_URL,
            orgao_tipo: "camara",
            origem_chave: row.origemChave,
          }));
        const updates = await preserveServidorUpdates(
          sb,
          candidates,
          source.competencia,
        );
        const batchSize = 200;
        for (let offset = 0; offset < updates.length; offset += batchSize) {
          const batch = updates.slice(offset, offset + batchSize);
          const { error } = await sb.from("servidores").upsert(batch, {
            onConflict: "origem_chave",
          });
          assertPersistenceSucceeded(`Servidores Câmara lote ${offset}`, error);
          result.servidores_atualizados += batch.length;
        }
        const dbSrvs: { id: string; origem_chave: string }[] = [];
        const originKeys = serverEntries.map((row) => row.origemChave);
        for (let offset = 0; offset < originKeys.length; offset += batchSize) {
          const { data, error } = await sb.from("servidores").select(
            "id, origem_chave",
          )
            .in("origem_chave", originKeys.slice(offset, offset + batchSize));
          assertPersistenceSucceeded(
            `Busca servidores Câmara lote ${offset}`,
            error,
          );
          dbSrvs.push(...(data ?? []));
        }
        const originMap = mapIdsByOrigin(dbSrvs, originKeys);
        const remuneracoes = source.dados.filter((row) => row.bruto !== null)
          .map((row) => ({
            servidor_id: originMap.get(row.origemChave)!,
            competencia: source.competencia,
            bruto: row.bruto,
            liquido: row.liquido,
            tipo_folha: row.tipoFolha,
            fonte_url: SOURCE_URL,
          }));
        for (
          let offset = 0;
          offset < remuneracoes.length;
          offset += batchSize
        ) {
          const batch = remuneracoes.slice(offset, offset + batchSize);
          const { error } = await sb.from("remuneracao_servidores").upsert(
            batch,
            {
              onConflict: "servidor_id,competencia,tipo_folha",
            },
          );
          assertPersistenceSucceeded(
            `Remunerações Câmara lote ${offset}`,
            error,
          );
          result.remuneracoes += batch.length;
        }
        result.status = "success";
        result.stage = "complete";
      } catch (error) {
        result.status = "error";
        result.error = error instanceof Error ? error.message : String(error);
      }
    }

    const failed = results.some((result) => result.status === "error");
    const status = failed
      ? results.some((result) => result.status !== "error")
        ? "partial"
        : "error"
      : "success";
    const latest = sources.find((source) => source.dados.length > 0) ??
      sources[0];
    const latestResult = results.find((result) =>
      result.competencia === latest?.competencia
    );
    const result = {
      success: !failed,
      status,
      dry_run: dryRun,
      requested_competencia: requestedCompetencia,
      reviewed_competencias: results.map((result) => result.competencia),
      por_competencia: results,
      fallback_used: latest
        ? latest.competencia !== requestedCompetencia
        : false,
      competencia: latest?.competencia ?? requestedCompetencia,
      ano: latest?.ano ?? requestedYear,
      mes: latest?.mes ?? requestedMonth,
      source_total: latest?.total ?? null,
      source_complete: latest?.complete ?? false,
      window_complete: results.every((result) => result.source_complete),
      servidores: latestResult?.servidores ?? 0,
      registros_folha: latestResult?.registros_folha ?? 0,
      remuneracoes: latestResult?.remuneracoes ?? 0,
      registros_folha_janela: results.reduce(
        (sum, result) => sum + result.registros_folha,
        0,
      ),
      remuneracoes_janela: results.reduce(
        (sum, result) => sum + result.remuneracoes,
        0,
      ),
      servidores_unicos_janela: latestByOrigin.size,
      identidades_historicas_adotadas: adopted,
      duration_ms: Date.now() - startedAt,
    };
    stage = "log";
    if (sb && logId) {
      const { error } = await sb.from("sync_log").update({
        status,
        detalhes: result,
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
      assertPersistenceSucceeded("sync_log finish", error);
    }
    return responseJson(result, failed ? 500 : 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const result = {
      success: false,
      status: "error",
      dry_run: dryRun,
      requested_competencia: requestedCompetencia,
      reviewed_competencias: results.map((result) => result.competencia),
      por_competencia: results,
      stage,
      error: message,
      duration_ms: Date.now() - startedAt,
    };
    if (sb && logId) {
      const { error: logError } = await sb.from("sync_log").update({
        status: "error",
        detalhes: result,
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
      if (logError) console.error("sync_log error finish failed");
    }
    return responseJson(result, 500);
  }
});
