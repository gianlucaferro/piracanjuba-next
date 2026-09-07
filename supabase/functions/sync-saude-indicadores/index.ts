import { hasCronOrServiceRoleAuth } from "../_shared/service-role-auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const GEOCODE = 5217104;
const DISEASES = ["dengue", "chikungunya", "zika"] as const;
const UA = "piracanjuba.ai/1.0 (transparencia municipal)";

interface IndicatorRow {
  categoria: string;
  indicador: string;
  ano: number;
  mes: number | null;
  semana_epidemiologica: number | null;
  valor: number;
  valor_texto: string | null;
  fonte: string;
  fonte_url: string;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "falha não identificada";
}

async function fetchJson(url: string) {
  const response = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`fonte respondeu HTTP ${response.status}`);
  return await response.json();
}

// O índice usa COALESCE(mes, 0) e COALESCE(semana_epidemiologica, 0).
// A leitura precisa reconhecer NULL e os antigos zeros, sem misturar semanas.
function indicatorQuery(sb: any, row: IndicatorRow) {
  let query = sb.from("saude_indicadores").select("id")
    .eq("categoria", row.categoria).eq("indicador", row.indicador).eq("ano", row.ano);
  for (const field of ["mes", "semana_epidemiologica"] as const) {
    query = row[field] == null || row[field] === 0
      ? query.or(`${field}.is.null,${field}.eq.0`)
      : query.eq(field, row[field]);
  }
  return query.limit(2);
}

async function upsertIndicador(sb: any, row: IndicatorRow, errors: string[]): Promise<boolean> {
  try {
    if (!Number.isFinite(row.valor) || row.valor < 0) throw new Error("valor inválido");
    // Repete a busca uma vez se outra execução inserir a mesma identidade.
    for (let attempt = 0; attempt < 2; attempt++) {
      let { data, error } = await indicatorQuery(sb, row);
      if (error) throw new Error(`leitura falhou (${error.code ?? "sem código"})`);
      if (!Array.isArray(data) || data.length > 1) throw new Error("identidade anual/mensal ambígua");
      if (data.length === 0 && row.categoria === "mortalidade_infantil" && row.indicador === "taxa_mortalidade_infantil") {
        // Reaproveita a identidade usada pelo cron antigo. A UI consome o nome
        // canônico; população da antiga fonte SIDRA é substituída pela taxa IBGE.
        const legacy = await indicatorQuery(sb, { ...row, indicador: "taxa_anual" });
        if (legacy.error) throw new Error("leitura da identidade legada falhou");
        if (!Array.isArray(legacy.data) || legacy.data.length > 1) throw new Error("identidade legada ambígua");
        data = legacy.data;
      }
      if (data.length === 1) {
        const result = await sb.from("saude_indicadores")
          .update({ ...row, updated_at: new Date().toISOString() }).eq("id", data[0].id).select("id");
        if (result.error) throw new Error(`atualização falhou (${result.error.code ?? "sem código"})`);
        if (result.data?.length !== 1) throw new Error("atualização não confirmou a gravação");
        return true;
      }
      const result = await sb.from("saude_indicadores").insert(row).select("id");
      if (result.error?.code === "23505" && attempt === 0) continue;
      if (result.error) throw new Error(`inserção falhou (${result.error.code ?? "sem código"})`);
      if (result.data?.length !== 1) throw new Error("inserção não confirmou a gravação");
      return true;
    }
    throw new Error("conflito de identidade após nova leitura");
  } catch (error) {
    errors.push(`${row.categoria} ${row.ano}: ${message(error)}`);
    return false;
  }
}

function monthlyAlerts(data: unknown) {
  if (!Array.isArray(data) || data.length === 0) throw new Error("resposta sem semanas publicadas");
  const months = new Map<string, { casos: number; nivel_max: number }>();
  const weeks = new Set<number>();
  for (const row of data) {
    if (typeof row?.data_iniSE !== "number" && typeof row?.data_iniSE !== "string") throw new Error("data semanal ausente");
    const date = new Date(row.data_iniSE);
    if (!Number.isFinite(date.getTime()) || !Number.isInteger(row.SE) || weeks.has(row.SE)
      || !Number.isInteger(row.casos) || row.casos < 0
      || !Number.isInteger(row.nivel) || row.nivel < 1 || row.nivel > 4) {
      throw new Error("semana inválida ou duplicada, série não gravada");
    }
    weeks.add(row.SE);
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
    const existing = months.get(key);
    months.set(key, {
      casos: (existing?.casos ?? 0) + row.casos,
      nivel_max: Math.max(existing?.nivel_max ?? row.nivel, row.nivel),
    });
  }
  return months;
}

async function syncInfoDengue(sb: any, startYear: number, endYear: number, errors: string[]) {
  let written = 0;
  for (const disease of DISEASES) {
    try {
      const url = `https://info.dengue.mat.br/api/alertcity?geocode=${GEOCODE}&disease=${disease}&format=json&ew_start=1&ew_end=53&ey_start=${startYear}&ey_end=${endYear}`;
      const months = monthlyAlerts(await fetchJson(url));
      for (const [key, value] of months) {
        const [ano, mes] = key.split("-").map(Number);
        if (await upsertIndicador(sb, {
          categoria: disease, indicador: "casos_mes", ano, mes, semana_epidemiologica: null,
          valor: value.casos, valor_texto: `Nível máx: ${value.nivel_max}; semanas agrupadas pela data inicial; sujeito a revisão`,
          fonte: "InfoDengue", fonte_url: url,
        }, errors)) written++;
      }
    } catch (error) { errors.push(`${disease}: ${message(error)}`); }
  }
  return written;
}

function annualValues(data: unknown, indicator: number) {
  if (!Array.isArray(data)) throw new Error("formato IBGE inválido");
  const series = data.filter(row => row?.id === indicator);
  if (series.length !== 1 || !Array.isArray(series[0].res)) throw new Error("indicador IBGE ausente ou duplicado");
  const locations = series[0].res.filter((row: any) => [String(GEOCODE), String(GEOCODE).slice(0, 6)].includes(String(row?.localidade)));
  if (locations.length !== 1 || !locations[0].res || typeof locations[0].res !== "object") throw new Error("resultados municipais ausentes ou ambíguos");
  const values: { ano: number; valor: number }[] = [];
  for (const [period, raw] of Object.entries(locations[0].res)) {
    // Símbolos de indisponibilidade e médias de vários anos não são taxas anuais.
    if (!/^\d{4}$/.test(period)) continue;
    if (raw == null || ["", "-", "..", "...", "X"].includes(String(raw).trim())) continue;
    const text = String(raw).trim();
    if (!/^\d+(?:[.,]\d+)?$/.test(text)) throw new Error(`valor IBGE inválido no período ${period}`);
    const valor = Number(text.replace(",", "."));
    if (!Number.isFinite(valor)) throw new Error(`valor IBGE não finito no período ${period}`);
    values.push({ ano: Number(period), valor });
  }
  if (!values.length) throw new Error("nenhum valor anual municipal publicado");
  return values;
}

async function syncIBGE(sb: any, category: string, indicator: number, metric: string, unit: string, errors: string[]) {
  let written = 0;
  try {
    const url = `https://servicodados.ibge.gov.br/api/v1/pesquisas/-/indicadores/${indicator}/resultados/N6[${GEOCODE}]`;
    for (const { ano, valor } of annualValues(await fetchJson(url), indicator)) {
      if (await upsertIndicador(sb, {
        categoria: category, indicador: metric, ano, mes: null, semana_epidemiologica: null,
        valor, valor_texto: unit, fonte: "IBGE Pesquisas / DATASUS", fonte_url: url,
      }, errors)) written++;
    }
  } catch (error) { errors.push(`${category}: ${message(error)}`); }
  return written;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  if (!hasCronOrServiceRoleAuth(req, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), Deno.env.get("CRON_SECRET"))) {
    return new Response(JSON.stringify({ success: false, error: "unauthorized" }), { status: 401, headers });
  }
  const url = new URL(req.url);
  const year = new Date().getUTCFullYear();
  const startYear = Number(url.searchParams.get("start_year") ?? year - 1);
  const endYear = Number(url.searchParams.get("end_year") ?? year);
  if (![startYear, endYear].every(Number.isInteger) || startYear < 2010 || endYear > year || startYear > endYear || endYear - startYear > 5) {
    return new Response(JSON.stringify({ success: false, error: "intervalo de anos inválido, máximo de seis anos" }), { status: 400, headers });
  }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let logId: string | undefined;
  const errors: string[] = [];
  try {
    const log = await sb.from("sync_log").insert({ tipo: "saude_indicadores", status: "running", detalhes: { startYear, endYear } }).select("id").single();
    if (log.error || !log.data?.id) throw new Error("não foi possível iniciar o log de saúde");
    logId = log.data.id;
    let totalInserted = await syncInfoDengue(sb, startYear, endYear, errors);
    // 30279 = taxa anual por mil nascidos vivos. SIDRA 793 mede população.
    totalInserted += await syncIBGE(sb, "mortalidade_infantil", 30279, "taxa_mortalidade_infantil", "óbitos por mil nascidos vivos", errors);
    totalInserted += await syncIBGE(sb, "dda", 60032, "internacoes_por_100mil", "internações por 100 mil habitantes", errors);
    errors.push("vacinacao: integração automática de cobertura municipal do PNI/DATASUS ainda não implementada; nenhum valor foi estimado");
    const status = errors.length ? (totalInserted > 0 ? "partial" : "error") : "success";
    const result = { totalInserted, totalWritten: totalInserted, errorCount: errors.length, errors: errors.slice(0, 30), startYear, endYear };
    const completed = await sb.from("sync_log").update({ status, detalhes: result, finished_at: new Date().toISOString() }).eq("id", logId).select("id");
    if (completed.error || completed.data?.length !== 1) throw new Error("não foi possível finalizar o log de saúde");
    return new Response(JSON.stringify({ success: status === "success", status, ...result }), { status: status === "error" ? 502 : status === "partial" ? 207 : 200, headers });
  } catch (error) {
    const details = { error: message(error), errors: errors.slice(0, 30) };
    if (logId) {
      const failed = await sb.from("sync_log").update({ status: "error", detalhes: details, finished_at: new Date().toISOString() }).eq("id", logId);
      if (failed.error) console.error("Falha ao finalizar sync_log de saúde");
    }
    return new Response(JSON.stringify({ success: false, ...details }), { status: 500, headers });
  }
});
