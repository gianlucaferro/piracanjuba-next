// summarize-contrato — resumo IA cidadão pra contratos da Prefeitura.
//
// Pipeline (com tolerância a falhas em cada etapa):
//  1. Lê cache em contrato_resumo_ia. Se hit (mesmo contexto), retorna direto.
//  2. Busca contrato no banco.
//  3. (best-effort) Fetch página detalhe Centi + PDF — com AbortController.
//  4. Busca aditivos vinculados.
//  5. Chama Gemini (modelo primário). Se 429/erro, fallback pra modelo lite.
//  6. Persiste resumo no cache pra próximos acessos.
//
// Erros tratados:
//   - 429 quota: retorna { error_code: "quota", message: ... }
//   - 402 créditos: { error_code: "credits", ... }
//   - timeout: { error_code: "timeout", ... }
//   - sem dados: { error_code: "no_data", ... }
// Cliente usa error_code pra mostrar mensagem certa.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UA = "piracanjuba.ai/1.0 (transparencia municipal)";
const PROMPT_VERSAO = 2; // bump para invalidar cache em mudanças de prompt

// Modelos Gemini em ordem de preferência. Se primeiro falhar com 429/500, tenta próximo.
const GEMINI_MODELS_FALLBACK = [
  "gemini-3-flash-preview",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
] as const;

// Timeouts pra externals (em ms).
const TIMEOUT_CENTI_FETCH = 12000;
const TIMEOUT_PDF_DOWNLOAD = 12000;
const TIMEOUT_GEMINI = 40000;

// ============== UTIL ==============

function normalizarCredor(nome: string | null | undefined): string {
  if (!nome) return "";
  return nome
    .replace(/&amp;/gi, "&")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\b(SOCIEDADE SIMPLES|SOCIEDADE ANONIMA|SOCIEDADE LIMITADA|EIRELI-EPP|EIRELI-ME|EIRELI EPP|EIRELI ME|LTDA-EPP|LTDA-ME|LTDA EPP|LTDA ME|EIRELI|LTDA|S\.A\.|S\/A|S\.A|EPP|ME|MEI)\b\.?/gi, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractContratoOrigemIdFromContratoUrl(url: string | null | undefined): string | null {
  return url?.match(/\/contratos\/contrato\/(\d+)/i)?.[1] ?? null;
}

function extractContratoOrigemIdFromAditivoUrl(url: string | null | undefined): string | null {
  return url?.match(/\/contratos\/contratoaditivo\/(\d+)/i)?.[1] ?? null;
}

function filtrarAditivosDoContrato(aditivos: Array<Record<string, unknown>>, contrato: { empresa?: string | null; fonte_url?: string | null }) {
  const origemId = extractContratoOrigemIdFromContratoUrl(contrato.fonte_url);
  if (origemId) {
    const byOrigem = aditivos.filter((a) => {
      const aditivoOrigemId = (a.centi_id as string | undefined) || extractContratoOrigemIdFromAditivoUrl(a.fonte_url as string | undefined);
      return aditivoOrigemId === origemId;
    });
    if (byOrigem.length) return byOrigem;
  }
  const fornecedorNorm = normalizarCredor(contrato.empresa);
  if (fornecedorNorm) {
    const byCredor = aditivos.filter((a) => normalizarCredor(a.credor as string) === fornecedorNorm);
    if (byCredor.length) return byCredor;
  }
  const grupos = new Set(aditivos.map((a) => `${a.contrato_numero}::${normalizarCredor(a.credor as string)}`));
  return grupos.size === 1 ? aditivos : [];
}

/** Hash determinístico simples — captura contexto pra detectar invalidação de cache. */
async function hashContexto(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** fetch com AbortController — não pendura a função se externo travar. */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctl = new AbortController();
  const tid = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(tid);
  }
}

// ============== FETCH PÁGINA + PDF (best-effort) ==============

async function fetchContratoDetailPage(url: string): Promise<{ details: string; pdfUrls: string[] }> {
  try {
    const resp = await fetchWithTimeout(url, { headers: { "User-Agent": UA }, redirect: "follow" }, TIMEOUT_CENTI_FETCH);
    if (!resp.ok) return { details: "", pdfUrls: [] };
    const html = await resp.text();

    const pairs: string[] = [];
    const pairRegex = /<span class="dialog-label">([^<]+)<\/span>\s*<span class="dialog-text">([^<]*)<\/span>/g;
    let m;
    while ((m = pairRegex.exec(html)) !== null) {
      const label = m[1].trim();
      const value = m[2].trim();
      if (value) pairs.push(`${label}: ${value}`);
    }
    if (!pairs.some((p) => p.startsWith("Objeto"))) {
      const objMatch =
        html.match(/Objeto\s*<\/(?:b|strong|td|th|label|span)>\s*<[^>]*>([^<]+)/i) ||
        html.match(/dialog-text">\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][^<]{10,})/);
      if (objMatch?.[1]?.trim()) pairs.push(`Objeto: ${objMatch[1].trim()}`);
    }

    const pdfUrls: string[] = [];
    const linkRegex = /href="([^"]*\/download\/[^"]*\.PDF[^"]*)"/gi;
    while ((m = linkRegex.exec(html)) !== null) {
      let pdfUrl = m[1];
      if (!pdfUrl.startsWith("http")) pdfUrl = `https://piracanjuba.centi.com.br${pdfUrl}`;
      pdfUrls.push(pdfUrl);
    }
    return { details: pairs.join("\n"), pdfUrls };
  } catch (e) {
    console.warn("Centi fetch falhou:", (e as Error).message);
    return { details: "", pdfUrls: [] };
  }
}

function extractTextFromPdfBytes(bytes: Uint8Array): string | null {
  const rawText = new TextDecoder("latin1").decode(bytes);
  const chunks: string[] = [];
  const regex = /\(([^)]{2,})\)/g;
  let match;
  while ((match = regex.exec(rawText)) !== null) {
    const chunk = match[1]
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\")
      .trim();
    const readable = chunk.replace(/[^\x20-\x7E\xC0-\xFF]/g, "").length;
    if (readable > chunk.length * 0.5 && chunk.length > 1) chunks.push(chunk);
  }
  if (chunks.length === 0) return null;
  return chunks.join(" ").replace(/\s+/g, " ").trim().substring(0, 4000) || null;
}

async function fetchAndExtractPdf(pdfUrls: string[]): Promise<string | null> {
  for (const url of pdfUrls.slice(0, 2)) {
    try {
      const resp = await fetchWithTimeout(url, { headers: { "User-Agent": UA }, redirect: "follow" }, TIMEOUT_PDF_DOWNLOAD);
      if (!resp.ok) continue;
      const buffer = await resp.arrayBuffer();
      const text = extractTextFromPdfBytes(new Uint8Array(buffer));
      if (text && text.length > 50) return text;
    } catch (e) {
      console.warn("PDF download falhou:", (e as Error).message);
    }
  }
  return null;
}

// ============== GEMINI (com fallback de modelo) ==============

type GeminiResult =
  | { ok: true; resumo: string; modelo: string }
  | { ok: false; errorCode: "quota" | "credits" | "timeout" | "api_error"; modeloTentado: string };

async function chamarGemini(apiKey: string, prompt: string, model: string): Promise<GeminiResult> {
  try {
    const resp = await fetchWithTimeout(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "Você é um especialista em transparência pública municipal." },
            { role: "user", content: prompt },
          ],
        }),
      },
      TIMEOUT_GEMINI,
    );

    if (resp.status === 429) return { ok: false, errorCode: "quota", modeloTentado: model };
    if (resp.status === 402) return { ok: false, errorCode: "credits", modeloTentado: model };
    if (!resp.ok) {
      const txt = await resp.text();
      console.error(`Gemini ${model} ${resp.status}:`, txt.slice(0, 300));
      return { ok: false, errorCode: "api_error", modeloTentado: model };
    }
    const data = await resp.json();
    const resumo = data.choices?.[0]?.message?.content;
    if (!resumo) return { ok: false, errorCode: "api_error", modeloTentado: model };
    return { ok: true, resumo: String(resumo).trim(), modelo: model };
  } catch (e) {
    const msg = (e as Error).message || "";
    if (msg.includes("abort")) return { ok: false, errorCode: "timeout", modeloTentado: model };
    console.error(`Gemini ${model} exception:`, msg);
    return { ok: false, errorCode: "api_error", modeloTentado: model };
  }
}

/** Tenta cada modelo em ordem. Retorna o 1º sucesso, ou último erro. */
async function gerarComFallback(apiKey: string, prompt: string): Promise<GeminiResult> {
  let ultimoErro: GeminiResult | null = null;
  for (const model of GEMINI_MODELS_FALLBACK) {
    const r = await chamarGemini(apiKey, prompt, model);
    if (r.ok) return r;
    ultimoErro = r;
    // Só faz sentido tentar fallback se foi quota/api_error. Se foi credits, todos vão falhar.
    if (r.errorCode === "credits") break;
  }
  return ultimoErro!;
}

// ============== HANDLER ==============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { contrato_id, is_outlier, outlier_context, force_refresh } = await req.json();
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
      .from("contratos")
      .select("*")
      .eq("id", contrato_id)
      .single();
    if (error || !contrato) {
      return new Response(JSON.stringify({ error: "Contrato não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== 1) CHECK CACHE =====
    // Hash captura tudo que afeta o resumo. Se nada mudou, retorna cache.
    const contextoBase = JSON.stringify({
      valor: contrato.valor,
      objeto: contrato.objeto,
      numero: contrato.numero,
      vigencia: [contrato.vigencia_inicio, contrato.vigencia_fim],
      empresa: contrato.empresa,
      status: contrato.status,
      is_outlier: !!is_outlier,
      v: PROMPT_VERSAO,
    });
    const ctxHash = await hashContexto(contextoBase);

    if (!force_refresh) {
      const { data: cached } = await supabase
        .from("contrato_resumo_ia")
        .select("resumo, modelo, gerado_em, contexto_hash")
        .eq("contrato_id", contrato_id)
        .maybeSingle();
      if (cached && cached.contexto_hash === ctxHash) {
        return new Response(
          JSON.stringify({
            resumo: cached.resumo,
            cached: true,
            modelo: cached.modelo,
            gerado_em: cached.gerado_em,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY não configurada", error_code: "config" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ===== 2) BEST-EFFORT FETCH CONTEXTO EXTERNO =====
    let portalDetails = "";
    let pdfText: string | null = null;
    if (contrato.fonte_url && String(contrato.fonte_url).includes("centi.com.br/contratos/contrato/")) {
      const { details, pdfUrls } = await fetchContratoDetailPage(contrato.fonte_url);
      portalDetails = details;
      if (pdfUrls.length > 0) pdfText = await fetchAndExtractPdf(pdfUrls);
    }

    // ===== 3) ADITIVOS =====
    let aditivosSection = "";
    if (contrato.numero) {
      const { data: rawAditivos } = await supabase
        .from("contratos_aditivos")
        .select("*")
        .eq("contrato_numero", contrato.numero)
        .order("termo", { ascending: true });
      const aditivos = filtrarAditivosDoContrato(rawAditivos || [], contrato);
      if (aditivos.length > 0) {
        const totalAditivos = aditivos.reduce((s: number, a: Record<string, unknown>) => s + (Number(a.valor) || 0), 0);
        const lista = aditivos
          .map((a: Record<string, unknown>) => {
            const vl = a.valor
              ? Number(a.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              : "sem valor informado";
            return `  - Termo ${a.termo}: ${a.tipo ?? "Aditivo"} (${a.tipo_aditivo ?? "não especificado"}) — ${vl} — ${a.data_termo ?? "?"}`;
          })
          .join("\n");
        const totalAditivosStr = totalAditivos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        const valorOriginal = Number(contrato.valor) || 0;
        const valorTotalStr = (valorOriginal + totalAditivos).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        aditivosSection = `\n\n📋 TERMOS ADITIVOS (${aditivos.length} aditivo(s)):
${lista}
Valor total dos aditivos: ${totalAditivosStr}
Valor total do contrato com aditivos: ${valorTotalStr}
Inclua no resumo uma seção "📋 Aditivos" com o total e o valor consolidado.`;
      }
    }

    // ===== 4) PROMPT =====
    const valor = contrato.valor
      ? Number(contrato.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "não informado";

    let extra = "";
    if (portalDetails) extra += `\n\nInformações do portal de transparência:\n${portalDetails}`;
    if (pdfText) extra += `\n\nTexto extraído do PDF oficial:\n"""${pdfText}"""`;

    let outlierSection = "";
    if (is_outlier && outlier_context) {
      outlierSection = `\n\n⚠️ VALOR ATÍPICO: ${outlier_context}
Inclua seção "📊 Análise de valor" objetiva, sem acusação, considerando complexidade/duração/escopo como possíveis justificativas legítimas.`;
    }

    const hasExtras = is_outlier || aditivosSection;
    const prompt = `Você é assistente de transparência pública municipal de Piracanjuba, Goiás.
Resuma o contrato pra um cidadão comum, explicando:
1. Finalidade (PRIORIZE o PDF e detalhes do portal quando disponíveis)
2. Empresa contratada
3. Valor e vigência
4. Impacto/benefício pra população

Dados:
- Número: ${contrato.numero || "—"}
- Empresa: ${contrato.empresa || "—"}
- Objeto: ${contrato.objeto || "—"}
- Valor: ${valor}
- Status: ${contrato.status || "—"}
- Vigência: ${contrato.vigencia_inicio || "?"} a ${contrato.vigencia_fim || "?"}${extra}${aditivosSection}${outlierSection}

Português objetivo. ${hasExtras ? "Use até 10 frases pra incluir as seções." : "Use no máximo 4 frases."} Não invente.`;

    // ===== 5) GERAR COM FALLBACK =====
    const r = await gerarComFallback(GEMINI_API_KEY, prompt);
    if (!r.ok) {
      const msgs: Record<string, string> = {
        quota: "Limite gratuito de IA atingido neste momento. Tente novamente em alguns minutos.",
        credits: "Créditos de IA esgotados — contate o administrador.",
        timeout: "A geração demorou demais. Tente novamente em alguns segundos.",
        api_error: "O serviço de IA está indisponível no momento. Tente novamente em instantes.",
      };
      return new Response(
        JSON.stringify({
          error: msgs[r.errorCode],
          error_code: r.errorCode,
          modelo_tentado: r.modeloTentado,
        }),
        {
          status: r.errorCode === "quota" ? 429 : r.errorCode === "credits" ? 402 : 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ===== 6) PERSISTIR CACHE =====
    await supabase.from("contrato_resumo_ia").upsert(
      {
        contrato_id,
        resumo: r.resumo,
        modelo: r.modelo,
        contexto_hash: ctxHash,
        prompt_versao: PROMPT_VERSAO,
        gerado_em: new Date().toISOString(),
      },
      { onConflict: "contrato_id" },
    );

    return new Response(
      JSON.stringify({ resumo: r.resumo, cached: false, modelo: r.modelo }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("summarize-contrato error:", e);
    return new Response(
      JSON.stringify({
        error: "Erro inesperado ao gerar resumo. Tente novamente.",
        error_code: "internal",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
