import { hasCronOrServiceRoleAuth } from "../_shared/service-role-auth.ts";
// TCM-GO via Apify Website Content Crawler, execução assíncrona.
// O callback e a reconciliação consultam o estado real da execução no Apify.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tcm-secret",
};
const APIFY_BASE = "https://api.apify.com/v2";
const ACTOR_ID = "apify~website-content-crawler";
const START_URLS = [
  "https://www.tcmgo.tc.br/site/processos/",
  "https://www.tcmgo.tc.br/site/jurisprudencia/",
  "https://www.tcmgo.tc.br/ecs/s/tcmjuris?guest=true&pesquisa=Piracanjuba",
  "https://www.tcmgo.tc.br/doc/",
  "https://www.tcmgo.tc.br/site/?s=Piracanjuba",
];

interface DatasetItem { url: string; title?: string; text?: string; markdown?: string; }
interface SyncLog { id: string; status: string; detalhes: Record<string, unknown>; }

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function message(error: unknown) { return error instanceof Error ? error.message : "falha não identificada"; }

async function apifyJson(path: string, token: string, init: RequestInit = {}) {
  // Não guardar a URL autenticada nem o corpo de erros do provedor em logs.
  const url = `${APIFY_BASE}${path}${path.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
  const result = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  if (!result.ok) throw new Error(`Apify HTTP ${result.status}`);
  return { data: await result.json(), headers: result.headers };
}

function parseApontamento(item: DatasetItem) {
  const url = new URL(item.url);
  if (url.protocol !== "https:" || !["www.tcmgo.tc.br", "tcmgo.tc.br", "www.tcm.go.gov.br", "virtual.tcmgo.tc.br"].includes(url.hostname)) return null;
  const text = `${item.title ?? ""}\n${item.markdown ?? item.text ?? ""}`;
  if (!/\bpiracanjuba\b/i.test(text)) return null;
  // Uma página de pesquisa não é um processo. Exigir identidade explícita e única.
  const numbers = [...text.matchAll(/\b(?:processo|proc\.)\s*(?:n[º°.o]?\s*)?[:#-]?\s*(\d{4,8}\/\d{2,4})\b/gi)].map(match => match[1]);
  if (new Set(numbers).size !== 1) return null;
  const numero_processo = numbers[0];
  const orgao = text.match(/\b(prefeitura|c[âa]mara|munic[íi]pio|secretaria|fundo)\s+(?:municipal\s+)?(?:de\s+)?piracanjuba\b/i)?.[1].toLowerCase();
  // Data, status e valor só são importados de campos declarados do documento.
  const date = text.match(/\b(?:data\s+(?:de\s+)?publica[çc][aã]o|publicad[oa]\s+em)\s*[:\-]?\s*(\d{2})\/(\d{2})\/(\d{4})\b/i);
  const data_publicacao = date ? `${date[3]}-${date[2]}-${date[1]}` : null;
  if (!data_publicacao) return null;
  if (data_publicacao && (Number.isNaN(Date.parse(data_publicacao)) || new Date(data_publicacao).toISOString().slice(0, 10) !== data_publicacao)) return null;
  const status = text.match(/\b(?:situa[çc][aã]o|status)\s*:\s*(aprovad[oa]|reprovad[oa]|julgad[oa]\s+(?:irregular|regular)|pendente|em\s+an[áa]lise|arquivad[oa])\b/i)?.[1].toLowerCase() ?? null;
  const tipo = text.match(/\b(?:tipo|natureza)\s*:\s*(ac[oó]rd[aã]o|parecer|decis[aã]o|notifica[çc][aã]o|inspe[çc][aã]o|relat[oó]rio|tomada\s+de\s+contas)\b/i)?.[1].toLowerCase() ?? null;
  const amount = text.match(/\bvalor\s+envolvido\s*:\s*r\$\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\b/i)?.[1];
  const ementa = text.match(/\bementa\s*:\s*([^\n]+)/i)?.[1].trim().slice(0, 2000) ?? null;
  if (!ementa || !orgao) return null;
  const processYear = numero_processo.split("/")[1];
  return {
    numero_processo, ano: processYear.length === 4 ? Number(processYear) : null,
    orgao_alvo: orgao, tipo, status, ementa, data_publicacao,
    valor_envolvido: amount ? Number(amount.replace(/\./g, "").replace(",", ".")) : null,
    fonte_url: item.url,
  };
}

async function finishLog(sb: any, log: SyncLog, status: string, details: Record<string, unknown>) {
  const result = await sb.from("sync_log").update({
    status, detalhes: { ...log.detalhes, ...details }, finished_at: new Date().toISOString(),
  }).eq("id", log.id).select("id");
  if (result.error || result.data?.length !== 1) throw new Error("não foi possível finalizar sync_log do TCM");
}

async function processRun(sb: any, token: string, runId: string, knownLog?: SyncLog) {
  let log = knownLog;
  if (!log) {
    const result = await sb.from("sync_log").select("id,status,detalhes").eq("tipo", "tcm_go")
      .filter("detalhes->>runId", "eq", runId).order("started_at", { ascending: false }).limit(1).maybeSingle();
    if (result.error) throw new Error("consulta do log TCM falhou");
    if (!result.data) throw new Error("execução TCM sem log correspondente");
    log = result.data as SyncLog;
  }
  if (log.status === "success") return { success: true, status: "success", runId, replay: true };
  try {
    const { data: payload } = await apifyJson(`/actor-runs/${encodeURIComponent(runId)}`, token);
    const run = payload?.data;
    if (run?.id !== runId || typeof run.status !== "string") throw new Error("resposta inválida do estado Apify");
    if (["READY", "RUNNING", "TIMING-OUT", "ABORTING"].includes(run.status)) return { success: false, status: "running", runId };
    if (run.status !== "SUCCEEDED") throw new Error(`execução Apify terminou ${run.status}`);
    const datasetId = run.defaultDatasetId;
    if (typeof datasetId !== "string" || !/^[a-zA-Z0-9]+$/.test(datasetId)) throw new Error("dataset Apify ausente");
    if (log.detalhes.datasetId && log.detalhes.datasetId !== datasetId) throw new Error("dataset diverge do registro da execução");
    const downloaded = await apifyJson(`/datasets/${datasetId}/items?format=json&clean=true&limit=1000`, token);
    const items = downloaded.data;
    if (!Array.isArray(items)) throw new Error("dataset Apify não é uma lista");
    const advertised = Number(downloaded.headers.get("x-apify-pagination-total") ?? items.length);
    if (advertised > items.length || items.length >= 1000) throw new Error("dataset incompleto, limite de paginação atingido");
    const relevant = items.filter((item: DatasetItem) => /\bpiracanjuba\b/i.test(`${item?.title ?? ""} ${item?.text ?? ""} ${item?.markdown ?? ""}`));
    const errors: string[] = [];
    let written = 0, existing = 0, rejected = 0;
    for (const item of relevant) {
      let row;
      try { row = typeof item?.url === "string" ? parseApontamento(item) : null; } catch { row = null; }
      if (!row) { rejected++; continue; }
      // A restrição com data NULL não deduplica. A fonte também precisa ser verificada.
      const found = await sb.from("tcm_go_apontamentos").select("id").eq("fonte_url", row.fonte_url).limit(2);
      if (found.error) { errors.push("falha ao consultar apontamento existente"); continue; }
      if (found.data?.length) { existing++; continue; }
      const saved = await sb.from("tcm_go_apontamentos").upsert(row, { onConflict: "numero_processo,data_publicacao" }).select("id");
      if (saved.error || saved.data?.length !== 1) { errors.push("falha ao gravar apontamento"); continue; }
      written++;
    }
    if (!written && !existing) errors.push("nenhum processo municipal verificável no conteúdo coletado; revisar integração com a consulta processual/Diário Oficial do TCM");
    if (rejected) errors.push(`${rejected} páginas municipais sem documento individual identificável`);
    const status = errors.length ? "partial" : "success";
    const result = { coverage: "amostra de navegação pública, não exaustiva", crawled: items.length, relevantes_piracanjuba: relevant.length, upserted: written, existing, rejected, errorCount: errors.length, errors: errors.slice(0, 20) };
    await finishLog(sb, log, status, { datasetId, providerStatus: run.status, result });
    return { success: status === "success", status, runId, ...result };
  } catch (error) {
    await finishLog(sb, log, "error", { error: message(error) });
    return { success: false, status: "error", runId, error: message(error) };
  }
}

async function actionTrigger(req: Request, sb: any, token: string | undefined) {
  const maxPages = Number(new URL(req.url).searchParams.get("max") ?? 50);
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 50) return response({ success: false, error: "max deve estar entre 1 e 50" }, 400);
  const created = await sb.from("sync_log").insert({ tipo: "tcm_go", status: "running", detalhes: { fonte: "apify-async", start_urls: START_URLS, maxPages } }).select("id,status,detalhes").single();
  if (created.error || !created.data) throw new Error("não foi possível iniciar sync_log do TCM");
  const log = created.data as SyncLog;
  try {
    if (!token) throw new Error("APIFY_TOKEN missing");
    const webhookSecret = Deno.env.get("APIFY_WEBHOOK_SECRET") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhooks = btoa(JSON.stringify([{
      eventTypes: ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED", "ACTOR.RUN.TIMED_OUT", "ACTOR.RUN.ABORTED"],
      requestUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-tcm-go-piracanjuba?action=fetch`,
      headersTemplate: JSON.stringify({ "x-tcm-secret": webhookSecret, "Content-Type": "application/json" }),
    }]));
    const input = {
      startUrls: START_URLS.map(url => ({ url })), crawlerType: "playwright:adaptive",
      maxCrawlDepth: 2, maxCrawlPages: maxPages, maxResults: maxPages, saveMarkdown: true,
      removeCookieWarnings: true, blockMedia: true, htmlTransformer: "readableText",
      proxyConfiguration: { useApifyProxy: true }, requestTimeoutSecs: 30, maxRequestRetries: 2,
      saveContentTypes: "application/pdf", includeUrlGlobs: ["https://www.tcmgo.tc.br/**", "https://tcmgo.tc.br/**", "https://www.tcm.go.gov.br/**", "https://virtual.tcmgo.tc.br/**"],
    };
    // Preserva memória, tempo máximo e limites de custo da execução existente.
    const { data } = await apifyJson(`/acts/${ACTOR_ID}/runs?memory=2048&timeout=600&webhooks=${encodeURIComponent(webhooks)}`, token, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    });
    const runId = data?.data?.id, datasetId = data?.data?.defaultDatasetId;
    if (typeof runId !== "string" || typeof datasetId !== "string") throw new Error("Apify não confirmou os identificadores da execução");
    log.detalhes = { ...log.detalhes, runId, datasetId };
    const updated = await sb.from("sync_log").update({ detalhes: log.detalhes }).eq("id", log.id).select("id");
    if (updated.error || updated.data?.length !== 1) throw new Error("execução iniciada, mas não foi possível vincular o runId ao log");
    return response({ success: true, status: "running", mode: "async", runId, datasetId, syncLogId: log.id }, 202);
  } catch (error) {
    await finishLog(sb, log, "error", { error: message(error) });
    return response({ success: false, status: "error", error: message(error) }, 502);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const privileged = hasCronOrServiceRoleAuth(req, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), Deno.env.get("CRON_SECRET"));
  const expected = Deno.env.get("APIFY_WEBHOOK_SECRET") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookAuthorized = Boolean(expected && req.headers.get("x-tcm-secret") === expected);
  if (!privileged && !webhookAuthorized) return response({ error: "unauthorized" }, 401);
  let bodyAction: unknown;
  if (req.method === "POST" && !new URL(req.url).searchParams.has("action")) {
    try { bodyAction = (await req.clone().json())?.action; }
    catch { return response({ error: "invalid JSON body" }, 400); }
  }
  const action = new URL(req.url).searchParams.get("action") ?? bodyAction ?? "trigger";
  if (action === "trigger" && !privileged) return response({ error: "unauthorized" }, 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = Deno.env.get("APIFY_TOKEN");
  try {
    if (action === "trigger") return await actionTrigger(req, sb, token);
    if (!token) throw new Error("APIFY_TOKEN missing");
    if (action === "fetch") {
      const body = await req.json();
      const runId = body?.resource?.id ?? body?.runId;
      if (typeof runId !== "string" || !/^[a-zA-Z0-9]+$/.test(runId)) return response({ error: "missing or invalid runId" }, 400);
      const result = await processRun(sb, token, runId);
      // Erro do provedor já está registrado. Falha ao gravar o log gera 500 e retry.
      return response(result, result.status === "running" ? 202 : result.status === "partial" ? 207 : 200);
    }
    if (action === "reconcile") {
      // Recupera callbacks perdidos sem iniciar um novo crawler ou ampliar gastos.
      const found = await sb.from("sync_log").select("id,status,detalhes").eq("tipo", "tcm_go").eq("status", "running")
        .lt("started_at", new Date(Date.now() - 15 * 60 * 1000).toISOString()).order("started_at", { ascending: true }).limit(25);
      if (found.error) throw new Error("consulta dos logs pendentes falhou");
      const results = [];
      const deadline = Date.now() + 90000;
      for (const log of (found.data ?? []) as SyncLog[]) {
        if (Date.now() > deadline) break;
        const runId = log.detalhes?.runId;
        if (typeof runId !== "string" || !/^[a-zA-Z0-9]+$/.test(runId)) {
          await finishLog(sb, log, "error", { error: "execução antiga sem runId verificável" });
          results.push({ status: "error", error: "runId ausente" });
        } else results.push(await processRun(sb, token, runId, log));
      }
      const success = results.length === (found.data?.length ?? 0) && results.every(result => result.status === "success");
      return response({ success, processed: results.length, pendingInBatch: (found.data?.length ?? 0) - results.length, results }, success ? 200 : 207);
    }
    return response({ error: "unknown action" }, 400);
  } catch (error) { return response({ success: false, action, error: message(error) }, 500); }
});
