import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Pre-gera resumos de IA para atos da camara (default: Indicacoes, tipo 24) e guarda em
// camara_atos.resumo_ia, pra UI mostrar o resumo direto no card sem o cidadao clicar.
// Reutiliza summarize-generic (OpenRouter travado no modelo barato).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey;
    const sb = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const tipoCodigo = Number(body?.tipo_codigo) || 24; // 24 = Indicacoes
    const tipoNome = typeof body?.tipo_nome === "string" ? body.tipo_nome : "Indicações";
    const batchSize = Math.min(Number(body?.batch_size) || 40, 60);

    const { data: alvos, error } = await sb
      .from("camara_atos")
      .select("id, numero, ano, data_publicacao, descricao, documento_url")
      .eq("tipo_codigo", tipoCodigo)
      .is("resumo_ia", null)
      .limit(batchSize);
    if (error) throw error;

    if (!alvos?.length) {
      const { count } = await sb
        .from("camara_atos")
        .select("*", { count: "exact", head: true })
        .eq("tipo_codigo", tipoCodigo)
        .is("resumo_ia", null);
      return new Response(
        JSON.stringify({ success: true, gerados: 0, restantes: count ?? 0, message: "Nenhum ato pendente." }),
        { headers: json },
      );
    }

    let gerados = 0, erros = 0, quotaParou = false;
    const conc = 6;

    const processOne = async (a: Record<string, unknown>) => {
      try {
        const conteudo = `- Tipo: ${tipoNome}\n- Número: ${a.numero || "não informado"}\n- Ano: ${a.ano}\n- Data: ${a.data_publicacao || "não informada"}\n- Descrição: ${a.descricao || "não informada"}`;
        const payload: Record<string, unknown> = { tipo: tipoNome, conteudo };
        if (a.documento_url) payload.documento_url = a.documento_url; // le o PDF real (mais preciso)
        const resp = await fetch(`${supabaseUrl}/functions/v1/summarize-generic`, {
          method: "POST",
          headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(90000),
        });
        if (resp.ok) {
          const d = await resp.json().catch(() => ({}));
          const r = d?.resumo;
          if (r && typeof r === "string") {
            await sb.from("camara_atos").update({
              resumo_ia: r,
              resumo_ia_gerado_em: new Date().toISOString(),
              resumo_ia_modelo: d?.modelo || "openrouter",
            }).eq("id", a.id);
            gerados++;
          } else { erros++; }
        } else if (resp.status === 429 || resp.status === 402) {
          quotaParou = true;
        } else { erros++; }
      } catch (_e) { erros++; }
    };

    for (let i = 0; i < alvos.length && !quotaParou; i += conc) {
      await Promise.all(alvos.slice(i, i + conc).map(processOne));
    }

    const { count: restantes } = await sb
      .from("camara_atos")
      .select("*", { count: "exact", head: true })
      .eq("tipo_codigo", tipoCodigo)
      .is("resumo_ia", null);

    return new Response(
      JSON.stringify({ success: true, gerados, erros, quotaParou, restantes: restantes ?? null }),
      { headers: json },
    );
  } catch (e) {
    console.error("backfill-atos-resumos error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "erro" }), {
      status: 500,
      headers: json,
    });
  }
});
