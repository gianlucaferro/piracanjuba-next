import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contrato_id } = await req.json();
    if (!contrato_id) {
      return new Response(JSON.stringify({ error: "contrato_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: contrato, error } = await supabase
      .from("camara_contratos")
      .select("*")
      .eq("id", contrato_id)
      .single();

    if (error || !contrato) {
      return new Response(JSON.stringify({ error: "Contrato não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valor = contrato.valor
      ? Number(contrato.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "não informado";

    // Cache por conteudo: a chave inclui os campos que alimentam o resumo (numero,
    // credor, objeto, valor, status, vigencia). Se qualquer um muda, a chave muda e o
    // resumo se regenera sozinho. Objeto pode ser longo: usa so os primeiros 80 chars.
    const cacheChave = `${contrato_id}:${contrato.numero ?? ""}:${contrato.credor ?? ""}:${String(contrato.objeto ?? "").slice(0, 80)}:${contrato.valor ?? ""}:${contrato.status ?? ""}:${contrato.vigencia_inicio ?? ""}:${contrato.vigencia_fim ?? ""}`;
    const cacheAno = contrato.vigencia_inicio
      ? Number(String(contrato.vigencia_inicio).slice(0, 4))
      : new Date().getFullYear();

    const { data: cached } = await supabase
      .from("resumos_ia_cache")
      .select("resumo")
      .eq("contexto", "camara_contrato")
      .eq("chave", cacheChave)
      .eq("ano", cacheAno)
      .maybeSingle();

    if (cached?.resumo) {
      return new Response(JSON.stringify({ resumo: cached.resumo, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Você é um assistente de transparência pública municipal de Piracanjuba, Goiás.
Analise o contrato da Câmara Municipal abaixo e gere um resumo claro e acessível para o cidadão comum, explicando:
1. Qual a finalidade do contrato (o que está sendo contratado)
2. Quem é a empresa contratada
3. Qual o valor e período de vigência
4. Qual o possível impacto ou benefício para a população

Dados do contrato:
- Número: ${contrato.numero || "não informado"}
- Credor/Empresa: ${contrato.credor || "não informado"}
- Objeto: ${contrato.objeto || "não informado"}
- Valor: ${valor}
- Status: ${contrato.status || "não informado"}
- Vigência: ${contrato.vigencia_inicio || "?"} a ${contrato.vigencia_fim || "?"}

Responda em português, de forma objetiva, em no máximo 4 frases. Não invente dados que não estão no contrato.`;

    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Você é um especialista em transparência pública municipal." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("Gemini API error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Erro ao gerar resumo" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const resumo = aiData.choices?.[0]?.message?.content || "Não foi possível gerar o resumo.";

    // Salva no cache (so quando gerou de verdade, nunca o fallback de erro)
    if (resumo && resumo !== "Não foi possível gerar o resumo.") {
      await supabase.from("resumos_ia_cache").upsert({
        contexto: "camara_contrato",
        chave: cacheChave,
        ano: cacheAno,
        resumo,
      }, { onConflict: "contexto,chave,ano" });
    }

    return new Response(JSON.stringify({ resumo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-camara-contrato error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
