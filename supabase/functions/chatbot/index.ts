import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  geminiChat,
  MODELS,
  GeminiUpstreamError,
  geminiErrorToResponse,
  jsonError,
} from "../_shared/ai.ts";

// Chatbot público do Piracanjuba.ai.
// Responde perguntas sobre o município usando SOMENTE os dados públicos do banco
// (grounding). Modelo barato (gemini-2.5-flash-lite), rate limit por IP, histórico
// curto (multi-turn) e máscara de qualquer CPF que escape ao contexto.

const RATE_MAX_PER_MIN = 12;
const MAX_PERGUNTA = 500;

type SB = ReturnType<typeof createClient>;
type Msg = { role: "user" | "assistant"; content: string };

const cur = (n: number | null | undefined): string =>
  n != null && !Number.isNaN(Number(n)) ? `R$ ${Number(n).toLocaleString("pt-BR")}` : "N/D";

function maskCpf(s: string): string {
  return s.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "***.***.***-**");
}

async function hashIp(ip: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("pba-chat::" + ip));
  return Array.from(new Uint8Array(buf)).slice(0, 10).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sanitizeHistory(raw: unknown): Msg[] {
  if (!Array.isArray(raw)) return [];
  const out: Msg[] = [];
  for (const m of raw.slice(-6)) {
    if (m && typeof m === "object" && "role" in m && "content" in m) {
      const role = (m as Record<string, unknown>).role;
      const content = (m as Record<string, unknown>).content;
      if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim()) {
        out.push({ role, content: content.slice(0, 1500) });
      }
    }
  }
  return out;
}

async function buildContext(sb: SB, pergunta: string): Promise<string> {
  const q = pergunta.toLowerCase();
  const has = (...ks: string[]) => ks.some((k) => q.includes(k));
  const blocks: string[] = [];

  // Núcleo (sempre presente): executivo, vereadores, secretarias, indicadores.
  const [exec, vers, secs, inds] = await Promise.all([
    sb.from("executivo").select("tipo, nome, partido, mandato_inicio, mandato_fim").limit(5),
    sb.from("vereadores").select("nome, partido, cargo_mesa, votos_eleicao").order("nome").limit(20),
    sb.from("secretarias").select("nome, secretario_nome, subsidio").limit(40),
    sb.from("indicadores_municipais").select("chave, valor_texto, valor, ano_referencia").limit(40),
  ]);

  const verList = vers.data || [];
  blocks.push(
    `### Poder Executivo\n${
      (exec.data || []).map((e) => `- ${e.tipo}: ${e.nome} (${e.partido || "s/partido"}), mandato ${e.mandato_inicio} a ${e.mandato_fim}`).join("\n") || "Sem dados"
    }`,
  );
  blocks.push(
    `### Câmara Municipal (Legislativo) - ${verList.length} vereadores\n${
      verList.map((v) => `- ${v.nome} (${v.partido || "s/partido"})${v.cargo_mesa ? `, ${v.cargo_mesa}` : ""}${v.votos_eleicao ? `, ${v.votos_eleicao} votos` : ""}`).join("\n") || "Sem dados"
    }`,
  );
  blocks.push(
    `### Secretarias e secretários\n${
      (secs.data || []).map((s) => `- ${s.nome}: ${s.secretario_nome || "N/D"}${s.subsidio ? `, subsídio ${cur(s.subsidio)}` : ""}`).join("\n") || "Sem dados"
    }`,
  );
  if (inds.data?.length) {
    blocks.push(`### Indicadores municipais\n${inds.data.map((i) => `- ${i.chave}: ${i.valor_texto ?? i.valor} (${i.ano_referencia})`).join("\n")}`);
  }

  // Blocos por palavra-chave.
  if (has("projeto", "lei", "ementa", "propos", "vereador")) {
    const { data } = await sb.from("projetos").select("tipo, numero, ano, ementa, autor_texto, status").order("data", { ascending: false }).limit(15);
    if (data?.length) {
      blocks.push(`### Projetos recentes\n${data.map((p) => `- ${p.tipo} nº ${p.numero}/${p.ano} (${p.status}), autor ${p.autor_texto}: ${(p.ementa || "").slice(0, 120)}`).join("\n")}`);
    }
  }
  if (has("contrato", "fornecedor", "empresa", "gasto", "gastou")) {
    const { data } = await sb.from("contratos").select("numero, objeto, empresa, valor, status").order("vigencia_inicio", { ascending: false }).limit(12);
    if (data?.length) {
      blocks.push(`### Contratos recentes\n${data.map((c) => `- Contrato ${c.numero} (${c.status}): ${(c.objeto || "").slice(0, 90)} — ${c.empresa || "N/D"} — ${cur(c.valor)}`).join("\n")}`);
    }
  }
  if (has("obra", "reforma", "construç", "pavimenta", "asfalto")) {
    const { data } = await sb.from("obras").select("nome, local, valor, empresa, status").limit(12);
    if (data?.length) {
      blocks.push(`### Obras\n${data.map((o) => `- ${o.nome} (${o.status || "N/D"}) em ${o.local || "N/D"} — ${cur(o.valor)} — ${o.empresa || "N/D"}`).join("\n")}`);
    }
  }
  if (has("licitaç", "licitac", "pregão", "pregao", "edital")) {
    const { data } = await sb.from("licitacoes").select("numero, modalidade, objeto, status, data_publicacao").order("data_publicacao", { ascending: false }).limit(10);
    if (data?.length) {
      blocks.push(`### Licitações\n${data.map((l) => `- ${l.modalidade || "N/D"} nº ${l.numero} (${l.status}): ${(l.objeto || "").slice(0, 90)}`).join("\n")}`);
    }
  }
  if (has("salário", "salario", "remuneraç", "remuneracao", "ganha", "recebe", "subsídio", "subsidio", "folha", "servidor")) {
    const { data: rem } = await sb.from("remuneracao_servidores").select("servidor_id, bruto, liquido, competencia").order("competencia", { ascending: false }).limit(120);
    if (rem?.length) {
      const seen = new Map<string, { bruto: number | null; liquido: number | null }>();
      for (const r of rem) if (!seen.has(r.servidor_id)) seen.set(r.servidor_id, { bruto: r.bruto, liquido: r.liquido });
      const ids = [...seen.keys()].slice(0, 60);
      const { data: ss } = await sb.from("servidores").select("id, nome, cargo, orgao_tipo").in("id", ids);
      if (ss?.length) {
        blocks.push(
          `### Remuneração de servidores (folha mais recente)\n${ss.map((s) => {
            const r = seen.get(s.id);
            return `- ${s.nome} (${s.cargo || "s/cargo"}, ${s.orgao_tipo === "camara" ? "Câmara" : "Prefeitura"}): bruto ${cur(r?.bruto)}, líquido ${cur(r?.liquido)}`;
          }).join("\n")}`,
        );
      }
    }
  }

  return blocks.join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const pergunta = typeof body.question === "string" ? body.question.trim() : "";
    if (pergunta.length < 2) return jsonError("Faça uma pergunta.", 400);
    if (pergunta.length > MAX_PERGUNTA) return jsonError("Pergunta muito longa (máx. 500 caracteres).", 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Rate limit por IP (janela de 60s) + log de uso.
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "0.0.0.0";
    const ipHash = await hashIp(ip);
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await sb
      .from("chatbot_consultas")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);
    if ((count ?? 0) >= RATE_MAX_PER_MIN) {
      return jsonError("Muitas perguntas em pouco tempo. Aguarde um minuto.", 429);
    }
    await sb.from("chatbot_consultas").insert({ ip_hash: ipHash, pergunta });

    const contexto = maskCpf(await buildContext(sb, pergunta));

    const systemPrompt = `Você é o assistente do Piracanjuba.ai, portal independente de transparência pública do município de Piracanjuba, Goiás, Brasil.

Regras:
- Responda APENAS com base nos dados abaixo. Se a informação não estiver nos dados, diga com franqueza que ainda não tem esse dado no portal e indique a aba mais provável (Prefeitura, Câmara, Vereadores, Contratos, etc.).
- Seja conciso e use português simples. Use markdown leve (negrito e listas) quando ajudar.
- Ao dar números, cite a origem (ex: "segundo o Portal da Transparência", "dados da Câmara", "IBGE").
- NUNCA invente nomes, valores, datas ou documentos. Nunca exiba CPF.
- Você não é órgão público e não dá aconselhamento jurídico. Para atos oficiais, oriente conferir a fonte.

## Dados disponíveis
${contexto}`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...sanitizeHistory(body.history),
      { role: "user" as const, content: pergunta },
    ];

    const resp = await geminiChat({ model: MODELS.flashLite, messages, temperature: 0.3, stream: true });
    if (!resp.ok) {
      return geminiErrorToResponse(new GeminiUpstreamError(resp.status, await resp.text()));
    }
    return new Response(resp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Erro interno.", 500);
  }
});
