import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiGuard, guardBlockedResponse } from "../_shared/ratelimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const OR_URL = "https://openrouter.ai/api/v1/chat/completions";
const OR_MODELO = "google/gemini-2.5-flash-lite"; // unico, travado (sem fallback de modelo)

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&");
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

async function fetchPdfBase64(rawUrl: string): Promise<string | null> {
  try {
    const url = decodeEntities(rawUrl);
    const resp = await fetch(url, {
      headers: { "User-Agent": UA, Referer: "https://camarapiracanjuba.centi.com.br/" },
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) return null;
    const buf = new Uint8Array(await resp.arrayBuffer());
    if (buf.length < 100 || buf.length > 15_000_000) return null;
    if (!new TextDecoder("latin1").decode(buf.subarray(0, 5)).startsWith("%PDF")) return null;
    return toBase64(buf);
  } catch (_e) {
    return null;
  }
}

// OpenRouter (provider padrao): modelo unico travado, sem fallback de provider/modelo.
async function chamarOpenRouter(orKey: string, content: unknown, multimodal: boolean): Promise<{ resumo: string } | { erro: number }> {
  try {
    const resp = await fetch(OR_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${orKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://piracanjuba.ai",
        "X-Title": "Piracanjuba.ai",
      },
      body: JSON.stringify({
        model: OR_MODELO,
        messages: [{ role: "user", content }],
        provider: { allow_fallbacks: false }, // trava de custo
        ...(multimodal ? { plugins: [{ id: "file-parser", pdf: { engine: "native" } }] } : {}),
        max_tokens: 700,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (resp.ok) {
      const d = await resp.json();
      const txt = d?.choices?.[0]?.message?.content?.trim();
      if (txt) return { resumo: txt };
      return { erro: 500 };
    }
    return { erro: resp.status };
  } catch (_e) {
    return { erro: 503 };
  }
}

// Fallback Gemini free (texto) quando nao ha OPENROUTER_API_KEY.
async function resumirGeminiTexto(geminiKey: string, prompt: string): Promise<{ resumo: string } | { erro: number }> {
  try {
    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${geminiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Você é um especialista em transparência pública municipal." },
          { role: "user", content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (resp.ok) {
      const d = await resp.json();
      const txt = d?.choices?.[0]?.message?.content?.trim();
      if (txt) return { resumo: txt };
    }
    return { erro: resp.status };
  } catch (_e) {
    return { erro: 503 };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const { contrato_id } = await req.json();
    if (!contrato_id) {
      return new Response(JSON.stringify({ error: "contrato_id é obrigatório" }), { status: 400, headers: json });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!GEMINI_API_KEY && !OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({ error: "Nenhuma chave de IA configurada" }), { status: 500, headers: json });
    }

    const { data: contrato, error } = await supabase
      .from("camara_contratos")
      .select("*")
      .eq("id", contrato_id)
      .single();
    if (error || !contrato) {
      return new Response(JSON.stringify({ error: "Contrato não encontrado" }), { status: 404, headers: json });
    }

    const valor = contrato.valor
      ? Number(contrato.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "não informado";

    // Cache por conteudo. documento_url entra na chave: quando o sync captura o PDF, a
    // chave muda e o resumo se regenera lendo o teor real (antes era so metadados).
    const cacheChave = `${contrato_id}:${contrato.numero ?? ""}:${contrato.credor ?? ""}:${String(contrato.objeto ?? "").slice(0, 80)}:${contrato.valor ?? ""}:${contrato.status ?? ""}:${contrato.documento_url ?? "sem"}`;
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
      return new Response(JSON.stringify({ resumo: cached.resumo, cached: true }), { headers: json });
    }

    const metadados = `Número: ${contrato.numero || "não informado"}
Credor/Empresa: ${contrato.credor || "não informado"}
Objeto: ${contrato.objeto || "não informado"}
Valor: ${valor}
Status: ${contrato.status || "não informado"}
Vigência: ${contrato.vigencia_inicio || "?"} a ${contrato.vigencia_fim || "?"}`;

    const promptPdf = `Você é um assistente de transparência pública municipal de Piracanjuba, GO.
Leia o contrato da Câmara Municipal em anexo (PDF, pode ser escaneado) e gere um resumo claro para o cidadão, explicando NA PRÁTICA:
1. A finalidade (o que foi contratado), citando nomes, valores, datas e condições do documento
2. A empresa contratada
3. Valor e período de vigência
4. Impacto/benefício para a população
Linguagem acessível, sem juridiquês, texto corrido sem markdown, no máximo 5 frases. Não invente.
Metadados do registro:
${metadados}`;

    const promptTexto = `Você é um assistente de transparência pública municipal de Piracanjuba, Goiás.
Analise o contrato da Câmara Municipal abaixo e gere um resumo claro para o cidadão, explicando a finalidade, a empresa contratada, o valor/vigência e o impacto para a população.

Dados do contrato:
${metadados}

Responda em português, objetivo, máximo 4 frases, sem markdown. Não invente dados.`;

    // 1) Caminho rico: le o PDF do contrato via OpenRouter. 2) senao, metadados.
    const _g = await aiGuard(supabase, req, "summarize-camara-contrato");
    if (!_g.allowed) return guardBlockedResponse(_g);

    let resumo = "";
    let erro = 0;
    const b64 = OPENROUTER_API_KEY && contrato.documento_url ? await fetchPdfBase64(contrato.documento_url) : null;

    if (OPENROUTER_API_KEY && b64) {
      const r = await chamarOpenRouter(OPENROUTER_API_KEY, [
        { type: "text", text: promptPdf },
        { type: "file", file: { filename: "contrato.pdf", file_data: "data:application/pdf;base64," + b64 } },
      ], true);
      if ("resumo" in r) resumo = r.resumo;
      else if (r.erro === 429 || r.erro === 402) erro = r.erro;
    }

    if (!resumo && !erro) {
      const r = OPENROUTER_API_KEY
        ? await chamarOpenRouter(OPENROUTER_API_KEY, promptTexto, false)
        : await resumirGeminiTexto(GEMINI_API_KEY!, promptTexto);
      if ("resumo" in r) resumo = r.resumo;
      else erro = r.erro;
    }

    if (!resumo) {
      const status = erro === 402 ? 402 : 429;
      const msg = status === 402 ? "Créditos de IA esgotados." : "Limite de requisições excedido. Tente novamente em instantes.";
      return new Response(JSON.stringify({ error: msg }), { status, headers: json });
    }

    await supabase.from("resumos_ia_cache").upsert(
      { contexto: "camara_contrato", chave: cacheChave, ano: cacheAno, resumo },
      { onConflict: "contexto,chave,ano" }
    );

    return new Response(JSON.stringify({ resumo, cached: false }), { headers: json });
  } catch (e) {
    console.error("summarize-camara-contrato error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: json,
    });
  }
});
