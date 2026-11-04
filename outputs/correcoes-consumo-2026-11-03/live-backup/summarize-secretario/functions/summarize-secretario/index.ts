import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiGuard, guardBlockedResponse } from "../_shared/ratelimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { secretaria_id } = await req.json();
    if (!secretaria_id) {
      return new Response(JSON.stringify({ error: "secretaria_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: secretaria, error: sErr } = await sb
      .from("secretarias")
      .select("*")
      .eq("id", secretaria_id)
      .single();
    if (sErr || !secretaria) {
      return new Response(JSON.stringify({ error: "Secretaria não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache por conteudo: a chave inclui o que alimenta o resumo (nome + secretario +
    // subsidio + contato). Se qualquer um desses dados muda, a chave muda e o resumo se
    // regenera sozinho. Assim nunca servimos informacao desatualizada.
    const cacheChave = `${secretaria_id}:${secretaria.nome ?? ""}:${secretaria.secretario_nome ?? ""}:${secretaria.subsidio ?? 0}:${secretaria.email ?? ""}:${secretaria.telefone ?? ""}`;
    const cacheAno = new Date().getFullYear();

    const { data: cached } = await sb
      .from("resumos_ia_cache")
      .select("resumo")
      .eq("contexto", "secretario")
      .eq("chave", cacheChave)
      .eq("ano", cacheAno)
      .maybeSingle();

    if (cached?.resumo) {
      return new Response(
        JSON.stringify({ secretaria, resumo: cached.resumo, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Você é um assistente de transparência pública municipal de Piracanjuba, GO.
Gere um resumo curto (3-5 frases) sobre esta secretaria e seu(a) secretário(a), explicando de forma acessível ao cidadão:
- O que faz a "${secretaria.nome}"
- Qual a importância dessa secretaria para o município
- Informações sobre o(a) secretário(a) titular

Secretaria: ${secretaria.nome}
Secretário(a): ${secretaria.secretario_nome || "Não informado"}
Subsídio: ${secretaria.subsidio ? `R$ ${Number(secretaria.subsidio).toFixed(2)}` : "Não informado"}
Contato: ${secretaria.email || ""} ${secretaria.telefone || ""}

Responda em português, de forma clara e objetiva. Não invente dados.`;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");

    const _g = await aiGuard(sb, req, "summarize-secretario");

    if (!_g.allowed) return guardBlockedResponse(_g);


    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um assistente de transparência pública. Seja conciso e informativo." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const resumo = aiData.choices?.[0]?.message?.content || "Não foi possível gerar o resumo.";

    // Salva no cache (so quando gerou de verdade, nunca o fallback de erro)
    if (resumo && resumo !== "Não foi possível gerar o resumo.") {
      await sb.from("resumos_ia_cache").upsert({
        contexto: "secretario",
        chave: cacheChave,
        ano: cacheAno,
        resumo,
      }, { onConflict: "contexto,chave,ano" });
    }

    return new Response(
      JSON.stringify({ secretaria, resumo }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
