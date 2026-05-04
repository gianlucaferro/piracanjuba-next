// TCM-GO via FireCrawl: search com scrape inline (1 round trip por URL)
// + parse manual do markdown (mais rapido que firecrawlExtract)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { firecrawlSearch } from "../_shared/firecrawl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEARCH_QUERY = 'site:tcm.go.gov.br "Piracanjuba"';

// Heuristicas de parse — fallback robusto se layout variar
function parseApontamento(item: { url: string; title?: string; markdown?: string }) {
  const md = item.markdown ?? "";
  const tit = item.title ?? "";

  // numero processo: padroes "12345/2023", "12345-2023", "Processo nº 12345/2023"
  const numMatch = md.match(/(?:processo|proc(?:esso)?\.?\s*n[º°.]?\s*)\s*[:.]?\s*([\d.\-/]+)/i)
    || tit.match(/([\d]{2,}[\d.\-/]{2,})/);
  const numero_processo = numMatch ? numMatch[1].replace(/\.$/, "") : null;

  // ano
  const anoMatch = md.match(/\b(20\d{2})\b/);
  const ano = anoMatch ? parseInt(anoMatch[1]) : null;

  // tipo
  const tipoMatch = md.match(/\b(ac[oó]rd[aã]o|parecer|decis[aã]o|notifica[çc][aã]o|inspe[çc][aã]o|relat[oó]rio)\b/i);
  const tipo = tipoMatch ? tipoMatch[1].toLowerCase() : null;

  // status
  const statusMatch = md.match(/\b(aprovad[oa]|reprovad[oa]|julgad[oa]|pendente|em\s+an[áa]lise|arquivad[oa])\b/i);
  const status = statusMatch ? statusMatch[1].toLowerCase() : null;

  // orgao alvo
  const orgaoMatch = md.match(/\b(prefeitura|c[âa]mara|munic[íi]pio)\s+(?:municipal\s+)?(?:de\s+)?piracanjuba/i);
  const orgao_alvo = orgaoMatch ? orgaoMatch[1].toLowerCase() : "prefeitura";

  // ementa: primeiros 500 chars do markdown ou title
  const ementa = (md.split(/\n+/).find((l) => l.trim().length > 50) ?? tit ?? "").slice(0, 500);

  // valor envolvido
  const valorMatch = md.match(/r\$\s*([\d.,]+)/i);
  const valor_envolvido = valorMatch
    ? parseFloat(valorMatch[1].replace(/\./g, "").replace(",", "."))
    : null;

  // data publicacao
  const dataMatch = md.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  const data_publicacao = dataMatch ? `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}` : null;

  return {
    numero_processo: numero_processo || `tcm_${item.url.split("/").pop() || Date.now()}`,
    ano,
    orgao_alvo,
    tipo,
    status,
    ementa,
    data_publicacao,
    valor_envolvido,
    fonte_url: item.url,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";
  const limit = parseInt(url.searchParams.get("limit") || "5");

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "tcm_go", status: "running", detalhes: { query: SEARCH_QUERY, limit } })
    .select("id").single();

  let creditsUsed = 0;
  try {
    // Search COM scrape inline — 1 round trip, mais rapido
    const search = await firecrawlSearch(SEARCH_QUERY, { limit, scrape: true });
    creditsUsed += 1 + limit; // 1 search + N scrapes
    if (!search.success) throw new Error(search.error);
    const results = (search.data ?? []) as Array<{ url: string; title?: string; markdown?: string }>;

    // Dedup
    const urls = results.map((r) => r.url).filter(Boolean);
    const { data: existing } = await sb.from("tcm_go_apontamentos").select("fonte_url").in("fonte_url", urls);
    const existingSet = new Set((existing ?? []).map((r) => r.fonte_url));
    const novas = results.filter((r) => r.url && !existingSet.has(r.url));

    const upserted: string[] = [];
    for (const item of novas) {
      const row = parseApontamento(item);
      if (dryRun) { upserted.push(row.numero_processo); continue; }
      const { error } = await sb.from("tcm_go_apontamentos")
        .upsert(row, { onConflict: "numero_processo,data_publicacao" });
      if (!error) upserted.push(row.numero_processo);
      else console.error(`upsert: ${error.message}`);
    }

    const result = { search_results: results.length, novas: novas.length, upserted: upserted.length, credits_used: creditsUsed, sample: upserted.slice(0, 5) };
    if (log?.id) await sb.from("sync_log").update({ status: "success", detalhes: result, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: true, dry_run: dryRun, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error).message;
    if (log?.id) await sb.from("sync_log").update({ status: "error", detalhes: { error: msg, credits_used: creditsUsed }, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
