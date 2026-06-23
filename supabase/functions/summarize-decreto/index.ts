import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiGuard, guardBlockedResponse } from "../_shared/ratelimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// Modelos em ordem de preferencia. Cada um do free tier tem cota separada, entao se
// o flash satura caimos no lite/2.0 e o resumo continua funcionando. Todos aceitam PDF.
const MODELOS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];

// Versao da estrategia de resumo. Bump invalida o cache antigo (resumos sucintos so
// da ementa) e forca a regeneracao rica lendo o PDF.
const RESUMO_VERSAO = "pdf2";

// As URLs do Centi vem com entities HTML (&#xC7; etc). Precisam ser decodificadas
// antes do fetch (mesmo tratamento do backfill-contrato-objeto).
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Baixa o PDF do Centi (precisa User-Agent de browser, senao 403) e valida que e
// PDF de verdade (a fonte serve com content-type errado). Retorna base64 ou null.
async function fetchPdfBase64(rawUrl: string): Promise<string | null> {
  try {
    const url = decodeEntities(rawUrl);
    const origin = new URL(url).origin;
    const resp = await fetch(url, {
      headers: { "User-Agent": UA, Referer: origin + "/" },
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) return null;
    const buf = new Uint8Array(await resp.arrayBuffer());
    if (buf.length < 100 || buf.length > 15_000_000) return null; // erro HTML ou gigante
    const magic = new TextDecoder("latin1").decode(buf.subarray(0, 5));
    if (!magic.startsWith("%PDF")) return null;
    return toBase64(buf);
  } catch (_e) {
    return null;
  }
}

// OpenRouter (provider padrao quando ha saldo): modelo unico travado, sem fallback de
// provider/modelo, pra nao escalar custo. Mesmo formato OpenAI-compat (texto e file).
const OR_URL = "https://openrouter.ai/api/v1/chat/completions";
const OR_MODELO = "google/gemini-2.5-flash-lite";

async function chamarOpenRouter(content: unknown, multimodal: boolean): Promise<{ resumo: string } | { erro: number }> {
  const key = Deno.env.get("OPENROUTER_API_KEY")!;
  try {
    const resp = await fetch(OR_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
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

// Resumo lendo o PDF (OpenRouter multimodal por padrao; Gemini nativo no fallback).
async function resumirComPdf(
  apiKey: string,
  b64: string,
  prompt: string
): Promise<{ resumo: string } | { erro: number }> {
  if (Deno.env.get("OPENROUTER_API_KEY")) {
    return chamarOpenRouter([
      { type: "text", text: prompt },
      { type: "file", file: { filename: "documento.pdf", file_data: "data:application/pdf;base64," + b64 } },
    ], true);
  }
  let ultimo = 0;
  for (const model of MODELOS) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { parts: [{ inline_data: { mime_type: "application/pdf", data: b64 } }, { text: prompt }] },
            ],
            generationConfig: { temperature: 0.3, maxOutputTokens: 700 },
          }),
          signal: AbortSignal.timeout(45000),
        }
      );
      if (resp.ok) {
        const d = await resp.json();
        const txt = (d?.candidates?.[0]?.content?.parts ?? [])
          .map((p: any) => p?.text ?? "")
          .join("")
          .trim();
        if (txt) return { resumo: txt };
      }
      ultimo = resp.status;
      if (resp.status === 402) break;
    } catch (_e) {
      ultimo = 503; // timeout/abort -> tenta proximo modelo
    }
  }
  return { erro: ultimo || 500 };
}

// Resumo so com os metadados/ementa (fallback quando nao ha PDF acessivel).
async function resumirComTexto(
  apiKey: string,
  prompt: string
): Promise<{ resumo: string } | { erro: number }> {
  if (Deno.env.get("OPENROUTER_API_KEY")) {
    return chamarOpenRouter(prompt, false);
  }
  let ultimo = 0;
  for (const model of MODELOS) {
    try {
      const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (resp.ok) {
        const d = await resp.json();
        const txt = d?.choices?.[0]?.message?.content?.trim();
        if (txt) return { resumo: txt };
      }
      ultimo = resp.status;
      if (resp.status === 402) break;
    } catch (_e) {
      ultimo = 503;
    }
  }
  return { erro: ultimo || 500 };
}

function respostaErro(status: number, headers: HeadersInit) {
  const msg =
    status === 402
      ? "Créditos de IA esgotados."
      : "Muitas requisições no momento. Tente novamente em instantes.";
  return new Response(JSON.stringify({ error: msg }), {
    status: status === 402 ? 402 : 429,
    headers,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = { ...corsHeaders, "Content-Type": "application/json" };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("GEMINI_API_KEY")!;
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

    // Cache por conteudo + versao da estrategia. fonte_url entra na chave: se o PDF
    // muda, regenera. RESUMO_VERSAO invalida os resumos antigos (so ementa).
    const cacheChave = `${decreto_id}:${decreto.numero ?? ""}:${decreto.data_publicacao ?? ""}:${decreto.fonte_url ?? "sem"}:${RESUMO_VERSAO}`;
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
      return new Response(JSON.stringify({ success: true, resumo: cached.resumo, cached: true }), { headers: json });
    }

    const promptPdf = `Você é um assistente de transparência pública municipal de Piracanjuba, GO.
Leia o decreto municipal em anexo (PDF) e gere um resumo claro para o cidadão comum, em 3 a 4 frases, explicando:
1. O que o decreto determina NA PRÁTICA (seja específico: cite nomes, cargos, valores, datas e leis quando aparecerem no texto)
2. Quem é afetado
3. A relevância para a população

Use linguagem acessível, sem juridiquês. Não invente nada além do que está no documento.
Responda em texto corrido, sem markdown, sem títulos e sem negrito.
Referência: Decreto ${decreto.numero || "s/n"}, de ${decreto.data_publicacao || "data não informada"}. Ementa oficial: ${decreto.ementa || "não informada"}.`;

    const promptTexto = `Você é um assistente que explica documentos legais para cidadãos comuns.

Decreto: ${decreto.numero}
Data: ${decreto.data_publicacao || "não informada"}
Ementa: ${decreto.ementa}

Gere um resumo em 2-3 frases simples explicando o que este decreto faz na prática, quem é afetado e a relevância para os cidadãos. Linguagem acessível, sem jargão. Máximo 150 palavras.`;

    // 1. Tenta o caminho rico (PDF). Se nao houver PDF acessivel, cai pro texto.
    const _g = await aiGuard(supabase, req, "summarize-decreto");
    if (!_g.allowed) return guardBlockedResponse(_g);

    let resumo = "";
    let erroQuota = 0;
    const b64 = decreto.fonte_url ? await fetchPdfBase64(decreto.fonte_url) : null;

    if (b64) {
      const r = await resumirComPdf(apiKey, b64, promptPdf);
      if ("resumo" in r) resumo = r.resumo;
      else if (r.erro === 429 || r.erro === 402) erroQuota = r.erro; // cota: nao adianta cair pro texto
    }

    if (!resumo && !erroQuota) {
      const r = await resumirComTexto(apiKey, promptTexto);
      if ("resumo" in r) resumo = r.resumo;
      else erroQuota = r.erro;
    }

    if (!resumo) return respostaErro(erroQuota || 500, json);

    await supabase.from("decretos").update({ resumo_ia: resumo }).eq("id", decreto_id);
    await supabase.from("resumos_ia_cache").upsert(
      { contexto: "decreto", chave: cacheChave, ano: cacheAno, resumo },
      { onConflict: "contexto,chave,ano" }
    );

    return new Response(JSON.stringify({ success: true, resumo }), { headers: json });
  } catch (error) {
    console.error("summarize-decreto error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }), {
      status: 500,
      headers: json,
    });
  }
});
