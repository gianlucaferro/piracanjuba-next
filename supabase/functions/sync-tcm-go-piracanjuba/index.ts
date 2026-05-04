// TCM-GO via FireCrawl com dedup: search (1 credit) -> filtra URLs novas -> extract apenas novas
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { firecrawlSearch, firecrawlExtract } from "../_shared/firecrawl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEARCH_QUERY = 'site:tcm.go.gov.br "Piracanjuba"';

const APONTAMENTO_SCHEMA = {
  type: "object",
  properties: {
    numero_processo: { type: "string" },
    ano: { type: "number" },
    orgao_alvo: { type: "string" },
    tipo: { type: "string" },
    status: { type: "string" },
    ementa: { type: "string" },
    data_publicacao: { type: "string", description: "YYYY-MM-DD" },
    valor_envolvido: { type: "number" },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";
  const limit = parseInt(url.searchParams.get("limit") || "10");

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "tcm_go", status: "running", detalhes: { query: SEARCH_QUERY, limit } })
    .select("id").single();

  let creditsUsed = 0;
  try {
    // 1) Search SEM scrape (1 credit)
    const search = await firecrawlSearch(SEARCH_QUERY, { limit, scrape: false });
    creditsUsed += 1;
    if (!search.success) throw new Error(search.error);
    const results = (search.data ?? []) as Array<{ url: string; title?: string }>;

    // 2) Dedup contra banco
    const urls = results.map(r => r.url).filter(Boolean);
    const { data: existing } = await sb.from("tcm_go_apontamentos").select("fonte_url").in("fonte_url", urls);
    const existingSet = new Set((existing ?? []).map(r => r.fonte_url));
    const novas = results.filter(r => r.url && !existingSet.has(r.url));

    // 3) Extract apenas das novas (1 credit cada)
    const upserted: string[] = [];
    for (const item of novas) {
      const extracted = await firecrawlExtract(
        item.url,
        APONTAMENTO_SCHEMA,
        "Extrair numero do processo, ano, orgao alvo (Prefeitura/Camara), tipo, status, ementa, data de publicacao no formato YYYY-MM-DD, e valor envolvido em reais.",
      );
      creditsUsed += 1;
      if (!extracted.success || !extracted.data?.json) continue;

      const j = extracted.data.json;
      if (!j.numero_processo) continue;

      const row = {
        numero_processo: String(j.numero_processo),
        ano: j.ano ?? null,
        orgao_alvo: j.orgao_alvo ?? null,
        tipo: j.tipo ?? null,
        status: j.status ?? null,
        ementa: j.ementa ?? item.title ?? null,
        data_publicacao: j.data_publicacao ?? null,
        valor_envolvido: j.valor_envolvido ?? null,
        fonte_url: item.url,
      };

      if (dryRun) { upserted.push(`${row.numero_processo} (dry)`); continue; }
      const { error } = await sb.from("tcm_go_apontamentos").upsert(row, { onConflict: "numero_processo,data_publicacao" });
      if (!error) upserted.push(row.numero_processo);
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
