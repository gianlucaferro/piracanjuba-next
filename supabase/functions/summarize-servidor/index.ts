import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const servidor_id = body?.servidor_id;
    // Modelo parametrizavel. Default gemini-2.5-flash (estavel e rapido; o preview
    // tinha cota free apertada). Override por body.model permite teste A/B.
    const model = typeof body?.model === "string" ? body.model : "gemini-2.5-flash";
    if (!servidor_id) {
      return new Response(JSON.stringify({ error: "servidor_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch servidor
    const { data: servidor, error: sErr } = await sb
      .from("servidores")
      .select("*")
      .eq("id", servidor_id)
      .single();
    if (sErr || !servidor) {
      return new Response(JSON.stringify({ error: "Servidor não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch latest remuneração
    const { data: remuneracoes } = await sb
      .from("remuneracao_servidores")
      .select("*")
      .eq("servidor_id", servidor_id)
      .order("competencia", { ascending: false })
      .limit(3);

    const latestRem = remuneracoes?.[0];
    const remInfo = latestRem
      ? `Competência mais recente (${latestRem.competencia}): Bruto R$ ${latestRem.bruto?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | Líquido R$ ${latestRem.liquido?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
      : "Sem dados de remuneração disponíveis.";

    // Cache por conteudo: a chave inclui o que alimenta o resumo (cargo + competencia +
    // valores). Se o salario muda (nova competencia ou correcao do mesmo mes), a chave
    // muda e o resumo se regenera sozinho. Assim nunca servimos salario desatualizado.
    const cacheChave = `${servidor_id}:${servidor.cargo ?? ""}:${latestRem?.competencia ?? "sem"}:${latestRem?.bruto ?? 0}:${latestRem?.liquido ?? 0}`;
    const cacheAno = latestRem?.competencia
      ? Number(String(latestRem.competencia).slice(0, 4))
      : new Date().getFullYear();

    const { data: cached } = await sb
      .from("resumos_ia_cache")
      .select("resumo")
      .eq("contexto", "servidor")
      .eq("chave", cacheChave)
      .eq("ano", cacheAno)
      .maybeSingle();

    if (cached?.resumo) {
      return new Response(
        JSON.stringify({
          servidor: { nome: servidor.nome, cargo: servidor.cargo },
          remuneracoes: remuneracoes || [],
          resumo: cached.resumo,
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Você é um assistente de transparência pública municipal de Piracanjuba, GO.
Gere um resumo curto (3-5 frases) sobre este servidor público, explicando de forma acessível ao cidadão:
- O que faz o cargo "${servidor.cargo || "não informado"}"
- Qual a importância dessa função para o município
- Dados de remuneração MAIS RECENTES (use APENAS os dados abaixo, não invente valores)

Servidor: ${servidor.nome}
Cargo: ${servidor.cargo || "Não informado"}
Remuneração mais recente:
${remInfo}

Responda em português, de forma clara e objetiva. Não invente dados. Sempre mencione a competência (mês/ano) ao citar valores.`;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

    // Provider por chamada: body.provider="openrouter" usa o saldo pago do OpenRouter
    // (sem rate limit apertado), pro backfill manual. Sem isso, Gemini free tier (o que
    // o cron e o on-demand usam por padrao).
    const useOR = body?.provider === "openrouter" && OPENROUTER_API_KEY;
    const aiUrl = useOR
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    const aiKey = useOR ? OPENROUTER_API_KEY! : GEMINI_API_KEY;
    if (!aiKey) throw new Error("Nenhuma chave de IA configurada");

    // Fallback de modelo no Gemini free (cota por modelo). No OpenRouter, 1 modelo barato.
    const modelos = useOR
      ? ["google/gemini-2.5-flash-lite"]
      : body?.model
        ? [model]
        : ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];

    let resumo = "";
    let ultimoStatus = 0;
    for (const m of modelos) {
      const aiResponse = await fetch(aiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiKey}`,
          "Content-Type": "application/json",
          ...(useOR ? { "HTTP-Referer": "https://piracanjuba.ai", "X-Title": "Piracanjuba.ai" } : {}),
        },
        body: JSON.stringify({
          model: m,
          messages: [
            { role: "system", content: "Você é um assistente de transparência pública. Seja conciso e informativo." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        resumo = aiData.choices?.[0]?.message?.content || "";
        if (resumo) break;
      }
      ultimoStatus = aiResponse.status;
      // 429 (cota) e 503 (sobrecarga) -> tenta o proximo modelo. 402 (creditos) -> aborta.
      if (aiResponse.status === 402) break;
    }

    if (!resumo) {
      if (ultimoStatus === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em instantes." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Salva no cache (so quando gerou de verdade, nunca o fallback de erro)
    if (resumo && resumo !== "Não foi possível gerar o resumo.") {
      await sb.from("resumos_ia_cache").upsert({
        contexto: "servidor",
        chave: cacheChave,
        ano: cacheAno,
        resumo,
      }, { onConflict: "contexto,chave,ano" });
    }

    return new Response(
      JSON.stringify({
        servidor: {
          nome: servidor.nome,
          cargo: servidor.cargo,
        },
        remuneracoes: remuneracoes || [],
        resumo,
      }),
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
