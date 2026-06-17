import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// Modelos com cota free separada por modelo: se um satura, cai no proximo. Todos leem PDF.
const MODELOS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];

// Bump invalida o cache antigo (resumos pobres do parser de PDF artesanal) e forca
// a regeneracao lendo o PDF inteiro com o Gemini multimodal.
const RESUMO_VERSAO = "pdf2";

// Hash simples (djb2) pra encurtar conteudo longo numa chave de cache estavel.
function hashContent(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

// URLs do Centi vem com entities HTML (&#xC7; etc) que precisam ser decodificadas.
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

// Baixa o PDF (User-Agent de browser obrigatorio, senao 403) e valida assinatura.
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
    if (buf.length < 100 || buf.length > 15_000_000) return null;
    const magic = new TextDecoder("latin1").decode(buf.subarray(0, 5));
    if (!magic.startsWith("%PDF")) return null;
    return toBase64(buf);
  } catch (_e) {
    return null;
  }
}

async function resumirComPdf(
  apiKey: string,
  b64: string,
  prompt: string
): Promise<{ resumo: string } | { erro: number }> {
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
            generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
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
      ultimo = 503;
    }
  }
  return { erro: ultimo || 500 };
}

async function resumirComTexto(
  apiKey: string,
  prompt: string
): Promise<{ resumo: string } | { erro: number }> {
  let ultimo = 0;
  for (const model of MODELOS) {
    try {
      const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
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
      ultimo = resp.status;
      if (resp.status === 402) break;
    } catch (_e) {
      ultimo = 503;
    }
  }
  return { erro: ultimo || 500 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const { tipo, conteudo, documento_url } = await req.json();
    if (!tipo || !conteudo) {
      return new Response(JSON.stringify({ error: "tipo e conteudo são obrigatórios" }), { status: 400, headers: json });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada" }), { status: 500, headers: json });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const cacheChave = `${tipo}:${hashContent(conteudo)}:${documento_url ?? "sem"}:${RESUMO_VERSAO}`;
    const cacheAno = new Date().getFullYear();

    const { data: cached } = await sb
      .from("resumos_ia_cache")
      .select("resumo")
      .eq("contexto", "generic")
      .eq("chave", cacheChave)
      .eq("ano", cacheAno)
      .maybeSingle();

    if (cached?.resumo) {
      return new Response(JSON.stringify({ resumo: cached.resumo, cached: true }), { headers: json });
    }

    const isPautaOuAta = ["Pautas das Sessões", "Atas das Sessões", "Pauta das Sessões", "Ata das Sessões"].includes(tipo);

    const promptPdf = `Você é um assistente de transparência pública municipal de Piracanjuba, GO.
Leia o documento "${tipo}" da Câmara Municipal em anexo (PDF) e gere um resumo claro e acessível para o cidadão comum.
${
  isPautaOuAta
    ? `Destaque: data e tipo da sessão; principais assuntos/projetos discutidos ou votados; decisões e resultados de votações; destaques relevantes para a população. Máximo 6 frases.`
    : `Explique: do que se trata o documento NA PRÁTICA (cite nomes, cargos, valores, datas e leis quando aparecerem); quem é afetado; a relevância para a população. Máximo 5 frases.`
}
Use linguagem acessível, sem juridiquês. Não invente nada além do que está no documento.
Responda em texto corrido, sem markdown, sem títulos e sem negrito.
Metadados do registro: ${conteudo}`;

    const promptTexto = `Você é um assistente de transparência pública municipal de Piracanjuba, GO.
Analise o seguinte registro do tipo "${tipo}" e gere um resumo claro e acessível para o cidadão comum, explicando do que se trata, o impacto ou relevância para a população, e informações importantes (valores, datas, pessoas).

Dados do registro:
${conteudo}

Responda em português, de forma objetiva, em no máximo 4 frases. Não invente dados que não estão nos dados fornecidos.`;

    // 1. Caminho rico (PDF). Se nao houver PDF acessivel, cai pro texto/metadados.
    let resumo = "";
    let erroQuota = 0;
    const b64 = documento_url ? await fetchPdfBase64(documento_url) : null;

    if (b64) {
      const r = await resumirComPdf(apiKey, b64, promptPdf);
      if ("resumo" in r) resumo = r.resumo;
      else if (r.erro === 429 || r.erro === 402) erroQuota = r.erro;
    }

    if (!resumo && !erroQuota) {
      const r = await resumirComTexto(apiKey, promptTexto);
      if ("resumo" in r) resumo = r.resumo;
      else erroQuota = r.erro;
    }

    if (!resumo) {
      const status = erroQuota === 402 ? 402 : 429;
      const msg = status === 402 ? "Créditos de IA esgotados." : "Limite de requisições excedido. Tente novamente em instantes.";
      return new Response(JSON.stringify({ error: msg }), { status, headers: json });
    }

    await sb.from("resumos_ia_cache").upsert(
      { contexto: "generic", chave: cacheChave, ano: cacheAno, resumo },
      { onConflict: "contexto,chave,ano" }
    );

    return new Response(JSON.stringify({ resumo, cached: false }), { headers: json });
  } catch (e) {
    console.error("summarize-generic error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: json,
    });
  }
});
