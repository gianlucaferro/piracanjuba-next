// Enriquece processos judiciais com:
// 1. Busca detalhes do Escavador (status_predito, movimentacoes top 30)
// 2. Detecta sentenca via classificacao_predita das movimentacoes
// 3. Gera resumo de IA via Gemini 2.5 Flash explicando o processo
// 4. Salva tudo no banco (resumo_ia + situacao + sentenca_resumo)
//
// Pode ser invocado com:
//   POST /enrich-processo-ia
//   body: { processo_id?: UUID, limit?: 20, force?: true }
//
// Sem body: processa ate 20 processos visiveis sem resumo_ia.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkCentiAuth } from "../_shared/centi-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

const ESCAVADOR_BASE = "https://api.escavador.com/api/v2";
// gemini-2.5-flash-lite: free tier 1000 req/dia (vs 20/dia do gemini-2.5-flash).
// Pra resumos curtos baseados em contexto rico do Escavador, lite tem qualidade ótima.
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type Movimentacao = {
  id: number;
  data: string;
  tipo: string;
  conteudo: string;
  classificacao_predita?: {
    nome?: string;
    descricao?: string;
    hierarquia?: string;
  };
};

const SENTENCA_KEYWORDS = [
  "senten", "julg", "trans", "homolog", "extincao", "extinto",
  "improcedente", "procedente", "absolv", "conden",
];

function detectarSentenca(movimentacoes: Movimentacao[]): { tem: boolean; resumo: string | null } {
  for (const m of movimentacoes) {
    const classif = (m.classificacao_predita?.hierarquia ?? "").toLowerCase();
    const conteudo = (m.conteudo ?? "").toLowerCase();
    if (classif.includes("sentença") || classif.includes("julgamento") ||
        classif.includes("trânsito em julgado") || conteudo.includes("sentença")) {
      const data = m.data ? new Date(m.data).toLocaleDateString("pt-BR") : "";
      return {
        tem: true,
        resumo: `${data} — ${m.classificacao_predita?.nome ?? m.conteudo ?? "Sentença"}`,
      };
    }
  }
  return { tem: false, resumo: null };
}

async function fetchMovimentacoes(token: string, numeroCnj: string): Promise<Movimentacao[]> {
  try {
    const url = `${ESCAVADOR_BASE}/processos/numero_cnj/${encodeURIComponent(numeroCnj)}/movimentacoes?limit=50`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.items ?? []) as Movimentacao[];
  } catch {
    return [];
  }
}

type ProcessoComContexto = {
  numero_processo: string;
  classe: string | null;
  assunto: string | null;
  tipo_categoria: string | null;
  polo: string | null;
  tribunal: string | null;
  comarca: string | null;
  data_distribuicao: string | null;
  data_ultima_movimentacao: string | null;
  raw_payload: Record<string, unknown> | null;
};

function buildPrompt(p: ProcessoComContexto, movimentacoes: Movimentacao[], nomePessoa: string, compact = false): string {
  // Truncar conteúdo de cada movimentação pra evitar prompt gigante.
  // Modo compact (fallback) reduz drasticamente o tamanho.
  const nMovs = compact ? 5 : 10;
  const maxLen = compact ? 240 : 500;
  const movResumo = movimentacoes.slice(0, nMovs).map((m) => {
    const conteudoTrunc = (m.conteudo ?? "").replace(/\s+/g, " ").trim().slice(0, maxLen);
    return `- ${m.data}: ${m.classificacao_predita?.nome ?? m.tipo} — ${conteudoTrunc}`;
  }).join("\n");

  const raw = p.raw_payload ?? {};
  const fonte = (raw.fontes as Array<Record<string, unknown>>)?.[0] ?? {};
  const capa = (fonte.capa as Record<string, unknown>) ?? {};

  const assuntoPrincipal = ((capa.assunto_principal_normalizado as Record<string, unknown>)?.path_completo as string) ?? p.assunto ?? "";
  const valorCausa = ((capa.valor_causa as Record<string, unknown>)?.valor_formatado as string) ?? "";

  const tituloAtivo = (raw.titulo_polo_ativo as string) ?? "";
  const tituloPassivo = (raw.titulo_polo_passivo as string) ?? "";

  return `Você é um analista jurídico explicando processos públicos a cidadãos.

CONTEXTO DO PROCESSO:
- Número CNJ: ${p.numero_processo}
- Pessoa pública: ${nomePessoa} (polo: ${p.polo})
- Classe: ${p.classe ?? "—"}
- Área: ${(capa.area as string) ?? p.tipo_categoria ?? "—"}
- Assunto principal: ${assuntoPrincipal}
- Polo Ativo: ${tituloAtivo}
- Polo Passivo: ${tituloPassivo}
- Valor da causa: ${valorCausa}
- Tribunal: ${p.tribunal} (${p.comarca})
- Distribuído em: ${p.data_distribuicao ?? "—"}
- Última movimentação: ${p.data_ultima_movimentacao ?? "—"}

ÚLTIMAS MOVIMENTAÇÕES (mais recentes primeiro):
${movResumo || "(sem movimentações disponíveis)"}

TAREFA: escreva um resumo CURTO em 3-4 frases (máx 80 palavras), em português brasileiro acessível, explicando:
1. O que é esse processo (natureza/objeto em linguagem simples)
2. Em que situação está (ativo, arquivado, julgado, fase atual)
3. Se houve sentença ou decisão importante
4. O que isso significa praticamente pra pessoa pública envolvida

REGRAS:
- NÃO especule. Use apenas dados acima.
- NÃO use jargão jurídico desnecessário.
- NÃO faça juízo de valor sobre culpa/inocência.
- Use voz ativa, frases curtas.
- Termine sem reticências, sem "etc".`;
}

async function gerarResumoGemini(apiKey: string, prompt: string): Promise<string | null> {
  try {
    const resp = await fetch(`${GEMINI_BASE}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          // Gemini 2.5 Flash usa "thinking tokens" que consomem maxOutputTokens.
          // Desativamos thinking pra tarefa simples de resumo + reservamos margem.
          maxOutputTokens: 1024,
          topP: 0.9,
          thinkingConfig: { thinkingBudget: 0 },
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        ],
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Gemini error:", resp.status, txt.slice(0, 200));
      return null;
    }
    const data = await resp.json();
    const cand = data.candidates?.[0];
    const finish = cand?.finishReason;
    const text = cand?.content?.parts?.[0]?.text;
    if (!text && finish) {
      console.warn("Gemini retornou sem texto. finishReason:", finish);
    }
    return text ? String(text).trim() : null;
  } catch (e) {
    console.error("Gemini fetch error:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!checkCentiAuth(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ESCAVADOR_TOKEN = Deno.env.get("ESCAVADOR_TOKEN");
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

  if (!ESCAVADOR_TOKEN || !GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "ESCAVADOR_TOKEN ou GEMINI_API_KEY ausentes" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown> = {};
  try { body = req.method === "POST" ? await req.json() : {}; } catch {}

  const processoId = body.processo_id as string | undefined;
  const limit = Math.min(Number(body.limit ?? 20), 50);
  const force = Boolean(body.force);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const startedAt = Date.now();

  // Selecionar processos a enriquecer
  let query = supabase
    .from("processo_judicial")
    .select("id, numero_processo, classe, assunto, tipo_categoria, polo, tribunal, comarca, data_distribuicao, data_ultima_movimentacao, raw_payload, pessoa_publica_id, resumo_ia")
    .eq("visivel_publico", true)
    .order("data_distribuicao", { ascending: false, nullsFirst: false });

  if (processoId) {
    query = query.eq("id", processoId);
  } else {
    if (!force) query = query.is("resumo_ia", null);
    query = query.limit(limit);
  }

  const { data: processos, error } = await query;
  if (error || !processos) {
    return new Response(JSON.stringify({ error: error?.message ?? "erro query" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Buscar dados das pessoas pra usar nos prompts
  const pessoaIds = [...new Set(processos.map((p) => p.pessoa_publica_id))];
  const { data: pessoas } = await supabase
    .from("pessoa_publica")
    .select("id, nome, nome_publico")
    .in("id", pessoaIds);
  const pessoaMap = new Map<string, string>();
  for (const p of pessoas ?? []) {
    pessoaMap.set(p.id, p.nome_publico ?? p.nome);
  }

  let enriquecidos = 0;
  let erros = 0;
  const detalhes: Array<Record<string, unknown>> = [];

  for (const proc of processos) {
    try {
      const nomePessoa = pessoaMap.get(proc.pessoa_publica_id) ?? "Vereador";

      // 1. Buscar movimentações
      const movimentacoes = await fetchMovimentacoes(ESCAVADOR_TOKEN, proc.numero_processo);

      // 2. Detectar sentença
      const { tem: temSentenca, resumo: sentencaResumo } = detectarSentenca(movimentacoes);

      // 3. Status_predito + última movimentação resumo
      const raw = proc.raw_payload ?? {};
      const fonteRaw = (raw as Record<string, unknown>).fontes as Array<Record<string, unknown>> | undefined;
      const statusPredito = (fonteRaw?.[0]?.status_predito as string | null | undefined) ?? null;
      const movRecente = movimentacoes[0];
      const movRecenteTxt = movRecente
        ? `${new Date(movRecente.data).toLocaleDateString("pt-BR")} — ${movRecente.classificacao_predita?.nome ?? movRecente.tipo}`
        : null;

      // 4. Gerar resumo IA — com retry em modo compact se o prompt grande falhar
      const prompt = buildPrompt(proc, movimentacoes, nomePessoa, false);
      let resumo = await gerarResumoGemini(GEMINI_API_KEY, prompt);
      if (!resumo) {
        await new Promise((r) => setTimeout(r, 700));
        const promptCompact = buildPrompt(proc, movimentacoes, nomePessoa, true);
        resumo = await gerarResumoGemini(GEMINI_API_KEY, promptCompact);
      }

      // 5. Salvar
      await supabase
        .from("processo_judicial")
        .update({
          status_predito: statusPredito,
          quantidade_movimentacoes: movimentacoes.length,
          data_ultima_movimentacao_full: proc.data_ultima_movimentacao,
          tem_sentenca: temSentenca,
          sentenca_resumo: sentencaResumo,
          movimentacao_recente: movRecenteTxt,
          resumo_ia: resumo,
          resumo_ia_modelo: resumo ? GEMINI_MODEL : null,
          resumo_ia_gerado_em: resumo ? new Date().toISOString() : null,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", proc.id);

      enriquecidos++;
      detalhes.push({
        numero: proc.numero_processo,
        movimentacoes: movimentacoes.length,
        tem_sentenca: temSentenca,
        resumo_ok: Boolean(resumo),
        resumo_chars: resumo?.length ?? 0,
      });

      // Rate limit: gemini-2.5-flash-lite free tier = 15 RPM.
      // 4500ms entre chamadas = ~13 RPM, com margem de seguranca.
      await new Promise((r) => setTimeout(r, 4500));
    } catch (e) {
      erros++;
      detalhes.push({ numero: proc.numero_processo, erro: String(e) });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      duration_ms: Date.now() - startedAt,
      total_consultados: processos.length,
      enriquecidos, erros,
      detalhes: detalhes.slice(0, 30),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
