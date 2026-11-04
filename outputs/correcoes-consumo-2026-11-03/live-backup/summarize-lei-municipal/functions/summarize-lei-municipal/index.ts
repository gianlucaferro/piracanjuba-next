import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiGuard, guardBlockedResponse } from "../_shared/ratelimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIAS = [
  "Orçamento e Finanças",
  "Tributação",
  "Administração Pública",
  "Educação",
  "Saúde",
  "Urbanismo e Obras",
  "Meio Ambiente",
  "Cultura e Esporte",
  "Assistência Social",
  "Transporte e Trânsito",
  "Segurança Pública",
  "Denominação e Homenagens",
  "Outros",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableKey = Deno.env.get("GEMINI_API_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { lei_id } = await req.json();
    if (!lei_id) throw new Error("lei_id required");

    const { data: lei, error } = await supabase
      .from("leis_municipais")
      .select("*")
      .eq("id", lei_id)
      .single();
    if (error || !lei) throw new Error("Lei não encontrada");

    // If both resumo and categoria already exist, return cached
    if (lei.resumo_ia && lei.categoria) {
      return new Response(JSON.stringify({ resumo: lei.resumo_ia, categoria: lei.categoria }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache por conteudo: a chave inclui os campos que alimentam o resumo (numero,
    // data, ementa). Se qualquer um muda, a chave muda e o resumo se regenera sozinho.
    // Ementa pode ser longa: usa so os primeiros 80 chars.
    const cacheChave = `${lei_id}:${lei.numero ?? ""}:${lei.data_publicacao ?? ""}:${String(lei.ementa ?? "").slice(0, 80)}`;
    const cacheAno = lei.data_publicacao
      ? Number(String(lei.data_publicacao).slice(0, 4))
      : new Date().getFullYear();

    const { data: cached } = await supabase
      .from("resumos_ia_cache")
      .select("resumo")
      .eq("contexto", "lei_municipal")
      .eq("chave", cacheChave)
      .eq("ano", cacheAno)
      .maybeSingle();

    if (cached?.resumo) {
      return new Response(
        JSON.stringify({ resumo: cached.resumo, categoria: lei.categoria || "Outros", cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Você é um assistente que analisa leis municipais de Piracanjuba-GO.

Lei Municipal: ${lei.numero}
Data: ${lei.data_publicacao || "não informada"}
Ementa: ${lei.ementa}

Faça duas coisas:
1. Escreva um resumo de 2-3 frases em linguagem simples, explicando o que esta lei muda na prática e como ela afeta os moradores. Seja direto e objetivo.
2. Classifique esta lei em UMA das seguintes categorias: ${CATEGORIAS.join(", ")}

Responda EXATAMENTE neste formato:
RESUMO: [seu resumo aqui]
CATEGORIA: [categoria escolhida]`;

    const _g = await aiGuard(supabase, req, "summarize-lei-municipal");

    if (!_g.allowed) return guardBlockedResponse(_g);


    const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
      }),
    });

    if (!aiResp.ok) throw new Error(`AI error: ${aiResp.status}`);
    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content?.trim() || "";

    // Parse response
    let resumo = lei.resumo_ia || "";
    let categoria = lei.categoria || "";

    const resumoMatch = content.match(/RESUMO:\s*([\s\S]*?)(?=\nCATEGORIA:|$)/i);
    if (resumoMatch) resumo = resumoMatch[1].trim();

    const catMatch = content.match(/CATEGORIA:\s*(.+)/i);
    if (catMatch) {
      const parsed = catMatch[1].trim();
      // Match to closest valid category
      const found = CATEGORIAS.find(c => parsed.toLowerCase().includes(c.toLowerCase()));
      categoria = found || parsed;
    }

    if (!resumo) resumo = "Não foi possível gerar o resumo.";
    if (!categoria) categoria = "Outros";

    // Salva no cache (so quando gerou de verdade, nunca o fallback de erro)
    if (resumo && resumo !== "Não foi possível gerar o resumo.") {
      await supabase.from("resumos_ia_cache").upsert({
        contexto: "lei_municipal",
        chave: cacheChave,
        ano: cacheAno,
        resumo,
      }, { onConflict: "contexto,chave,ano" });
    }

    await supabase.from("leis_municipais").update({ resumo_ia: resumo, categoria }).eq("id", lei_id);

    return new Response(JSON.stringify({ resumo, categoria }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
