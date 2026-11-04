import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey;
    const sb = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const provider = body?.provider === "openrouter" ? "openrouter" : undefined;
    // OpenRouter (pago) aguenta batch maior e delay curto; Gemini free vai devagar.
    const batchSize = Math.min(Number(body?.batch_size) || (provider ? 40 : 12), provider ? 50 : 25);
    const delayMs = Number(body?.delay_ms) || (provider ? 400 : 4000);

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
    // OpenRouter (pago) aguenta concorrencia; Gemini free vai 1 a 1 com delay.
    const conc = provider ? 6 : 1;

    const processOne = async (row: any) => {
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/summarize-servidor`, {
          method: "POST",
          headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey, "Content-Type": "application/json" },
          body: JSON.stringify({ servidor_id: row.id, ...(provider ? { provider } : {}) }),
          signal: AbortSignal.timeout(60000),
        });
        if (resp.ok) {
          const d = await resp.json().catch(() => ({}));
          if (d?.cached) cacheHits++;
          else gerados++;
        } else if (resp.status === 429 || resp.status === 402) {
          quotaParou = true;
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
      JSON.stringify({ success: true, gerados, cacheHits, erros, quotaParou, restantes }),
      { headers: json }
    );
  } catch (e) {
    console.error("backfill-servidor-resumos error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "erro" }), {
      status: 500,
      headers: json,
    });
  }
});
