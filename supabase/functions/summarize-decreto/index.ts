import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableKey = Deno.env.get("GEMINI_API_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { decreto_id } = await req.json();
    if (!decreto_id) throw new Error("decreto_id is required");

    const { data: decreto, error } = await supabase
      .from("decretos")
      .select("*")
      .eq("id", decreto_id)
      .single();

    if (error || !decreto) throw new Error("Decreto não encontrado");

    // Cache por conteudo: a chave inclui o que alimenta o resumo (numero + data + ementa).
    // Ementa e texto longo, entao usamos so os primeiros 80 chars. Se qualquer um desses
    // dados muda, a chave muda e o resumo se regenera sozinho.
    const cacheChave = `${decreto_id}:${decreto.numero ?? ""}:${decreto.data_publicacao ?? ""}:${(decreto.ementa ?? "").slice(0, 80)}`;
    const cacheAno = decreto.data_publicacao
      ? Number(String(decreto.data_publicacao).slice(0, 4))
      : new Date().getFullYear();

    const { data: cached } = await supabase
      .from("resumos_ia_cache")
      .select("resumo")
      .eq("contexto", "decreto")
      .eq("chave", cacheChave)
      .eq("ano", cacheAno)
      .maybeSingle();

    if (cached?.resumo) {
      return new Response(
        JSON.stringify({ success: true, resumo: cached.resumo, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Você é um assistente que explica documentos legais para cidadãos comuns.

Decreto: ${decreto.numero}
Data: ${decreto.data_publicacao || "não informada"}
Ementa: ${decreto.ementa}

Gere um resumo em 2-3 frases simples explicando:
1. O que este decreto faz na prática
2. Quem é afetado
3. Qual a importância para os cidadãos

Use linguagem acessível, sem jargão jurídico. Máximo 150 palavras.`;

    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`AI error: ${resp.status} - ${errText.slice(0, 200)}`);
    }

    const data = await resp.json();
    const resumo = data.choices?.[0]?.message?.content?.trim() || "Não foi possível gerar resumo.";

    await supabase.from("decretos").update({ resumo_ia: resumo }).eq("id", decreto_id);

    // Salva no cache (so quando gerou de verdade, nunca o fallback de erro)
    if (resumo && resumo !== "Não foi possível gerar resumo.") {
      await supabase.from("resumos_ia_cache").upsert({
        contexto: "decreto",
        chave: cacheChave,
        ano: cacheAno,
        resumo,
      }, { onConflict: "contexto,chave,ano" });
    }

    return new Response(
      JSON.stringify({ success: true, resumo }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
