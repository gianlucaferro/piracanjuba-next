import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hasCronOrServiceRoleAuth } from "../_shared/service-role-auth.ts";
import { AdminBodyTooLargeError, readAdminActionBody } from "../_shared/admin-session-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Pre-gera os resumos de salario de servidor em background (madrugada, cota fresca),
// pra que a visualizacao on-demand do cidadao seja sempre cache hit (instantanea, sem
// 429). Sem isso ~99% dos 1.639 servidores geram ao vivo e batem no rate limit do
// Gemini (o sintoma de "clico 3-4x ate aparecer").
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = { ...corsHeaders, "Content-Type": "application/json" };
  if (req.method !== "POST") return new Response(null, { status: 405, headers: { ...corsHeaders, Allow: "POST, OPTIONS" } });
  if (!hasCronOrServiceRoleAuth(req, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), Deno.env.get("CRON_SECRET"))) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: json });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let body: Record<string, unknown>;
    try {
      body = await readAdminActionBody(req, 8_192);
    } catch (error) {
      return new Response(JSON.stringify({ error: "Corpo da requisição inválido ou muito grande." }), {
        status: error instanceof AdminBodyTooLargeError ? 413 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.dry_run === true) return new Response(JSON.stringify({ success: true, dry_run: true }), { headers: json });
    const sb = createClient(supabaseUrl, serviceKey);
    const provider = body?.provider === "openrouter" ? "openrouter" : undefined;
    // OpenRouter (pago) aguenta batch maior e delay curto; Gemini free vai devagar.
    const requestedBatch = Number(body.batch_size);
    const batchSize = Number.isFinite(requestedBatch) && requestedBatch > 0
      ? Math.max(1, Math.min(Math.floor(requestedBatch), provider ? 50 : 25)) : (provider ? 40 : 12);
    const requestedDelay = Number(body.delay_ms);
    const delayMs = Number.isFinite(requestedDelay) && requestedDelay > 0
      ? Math.max(250, Math.min(requestedDelay, 10_000)) : (provider ? 400 : 4000);

    // servidores que ainda nao tem nenhum resumo em cache (prioriza quem nunca gerou)
    const { data: alvos, error } = await sb.rpc("servidores_sem_resumo", { lim: batchSize });
    if (error) throw error;

    if (!alvos?.length) {
      return new Response(
        JSON.stringify({ success: true, gerados: 0, restantes: 0, message: "Todos os servidores ja tem resumo." }),
        { headers: json }
      );
    }

    let gerados = 0;
    let cacheHits = 0;
    let erros = 0;
    let quotaParou = false;
    let quotaIndisponivel = false;
    // OpenRouter (pago) aguenta concorrencia; Gemini free vai 1 a 1 com delay.
    const conc = provider ? 6 : 1;

    const processOne = async (row: any) => {
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/summarize-servidor`, {
          method: "POST",
          headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": "application/json" },
          body: JSON.stringify({ servidor_id: row.id, ...(provider ? { provider } : {}) }),
          signal: AbortSignal.timeout(60000),
        });
        if (resp.ok) {
          const d = await resp.json().catch(() => ({}));
          if (d?.cached) cacheHits++;
          else gerados++;
        } else if (resp.status === 429 || resp.status === 402 || resp.status === 503) {
          quotaParou = true;
          if (resp.status === 503) quotaIndisponivel = true;
        } else {
          erros++;
        }
      } catch (_e) {
        erros++;
      }
    };

    for (let i = 0; i < alvos.length && !quotaParou; i += conc) {
      await Promise.all(alvos.slice(i, i + conc).map(processOne));
      if (!provider) await new Promise((r) => setTimeout(r, delayMs));
    }

    // quantos ainda faltam no total
    const { data: restantesRows } = await sb.rpc("servidores_sem_resumo", { lim: 100000 });
    const restantes = restantesRows?.length ?? null;

    return new Response(
      JSON.stringify({ success: !quotaIndisponivel, gerados, cacheHits, erros, quotaParou, quotaIndisponivel, restantes }),
      { status: quotaIndisponivel ? 503 : 200, headers: json }
    );
  } catch (e) {
    console.error("backfill-servidor-resumos error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "erro" }), {
      status: 500,
      headers: json,
    });
  }
});
