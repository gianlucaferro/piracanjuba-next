import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// 2026-06: o portal SAPL (piracanjuba.go.leg.br WP API) saiu do ar. A Camara migrou
// pro Centi. As listas de presenca ficam em /atosadministrativos/{10|11}, mas a
// presenca POR VEREADOR esta dentro do PDF (lista escaneada). Lemos o PDF com IA
// (OpenRouter gemini-2.5-flash-lite, ~US$0.0002/lista) pra extrair presentes/ausentes.
const CENTI_BASE = "https://camarapiracanjuba.centi.com.br/transparencia/atosadministrativos";
const TIPOS: Record<number, string> = { 10: "ordinária", 11: "extraordinária" };
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function toIsoDate(d: string | null): string | null {
  if (!d) return null;
  const m = d.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

interface Sessao {
  titulo: string;
  data: string | null;
  tipo: string;
  documento_url: string | null;
}

async function scrapeSessoes(tipoCodigo: number): Promise<Sessao[]> {
  const resp = await fetch(`${CENTI_BASE}/${tipoCodigo}`, { headers: { "User-Agent": UA } });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const html = await resp.text();
  const tbody = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbody) return [];
  const rows = tbody[1].split(/<tr[^>]*>/i).filter((r) => r.includes("<td"));
  const out: Sessao[] = [];
  for (const row of rows) {
    const cells: string[] = [];
    const re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let m;
    while ((m = re.exec(row)) !== null) {
      cells.push(decodeEntities(m[1].replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim());
    }
    if (cells.length < 3 || !cells[0]) continue;
    const link =
      row.match(/href="([^"]*\/download\/[^"]*)"/i) || row.match(/href="([^"]*\.(?:pdf|PDF)[^"]*)"/i);
    const data = cells.find((c) => /\d{2}\/\d{2}\/\d{4}/.test(c)) || null;
    out.push({
      titulo: cells[0],
      data: toIsoDate(data),
      tipo: TIPOS[tipoCodigo],
      documento_url: link ? decodeEntities(link[1]) : null,
    });
  }
  return out;
}

async function baixarPdfBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(25000) });
    if (!resp.ok) return null;
    const buf = new Uint8Array(await resp.arrayBuffer());
    if (buf.length < 100 || buf.length > 15_000_000) return null;
    if (!new TextDecoder("latin1").decode(buf.subarray(0, 5)).startsWith("%PDF")) return null;
    return toBase64(buf);
  } catch (_e) {
    return null;
  }
}

// Le o PDF da lista e extrai {presentes, ausentes} via OpenRouter (gemini-2.5-flash-lite).
async function extrairPresenca(
  b64: string,
  key: string
): Promise<{ presentes: string[]; ausentes: string[] } | null> {
  const body = {
    model: "google/gemini-2.5-flash-lite",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Esta e uma lista de presenca de uma sessao da Camara Municipal de Piracanjuba (pode ser escaneada). Extraia em JSON valido, sem markdown: {"presentes":["nome completo"],"ausentes":["nome completo"]}. Classifique cada vereador por assinatura/presenca. Use os nomes completos como aparecem. Responda SOMENTE o JSON.`,
          },
          { type: "file", file: { filename: "presenca.pdf", file_data: "data:application/pdf;base64," + b64 } },
        ],
      },
    ],
    plugins: [{ id: "file-parser", pdf: { engine: "native" } }],
  };
  try {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://piracanjuba.ai",
        "X-Title": "Piracanjuba.ai",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    });
    if (!resp.ok) return null;
    const d = await resp.json();
    let txt = (d?.choices?.[0]?.message?.content || "").replace(/```json|```/g, "").trim();
    const j = JSON.parse(txt);
    return { presentes: Array.isArray(j.presentes) ? j.presentes : [], ausentes: Array.isArray(j.ausentes) ? j.ausentes : [] };
  } catch (_e) {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const orKey = Deno.env.get("OPENROUTER_API_KEY");
  const body = await req.json().catch(() => ({}));
  const batchSize = Math.min(Number(body?.batch_size) || 6, 15);

  const { data: log } = await sb
    .from("sync_log")
    .insert({ tipo: "presenca-sessoes", status: "running", detalhes: {} })
    .select("id")
    .single();
  const logId = log?.id;

  const errors: string[] = [];
  let sessoesProcessadas = 0;
  let registros = 0;

  try {
    if (!orKey) throw new Error("OPENROUTER_API_KEY não configurada");

    // vereadores pra casar nome -> id/nome canonico
    const { data: vereadores } = await sb.from("vereadores").select("id, nome");
    const vlist = (vereadores || []) as { id: string; nome: string }[];
    const matchVereador = (raw: string): { id: string | null; nome: string } => {
      const up = raw.toUpperCase();
      const v = vlist.find((x) => {
        const toks = (x.nome || "").toUpperCase().split(/\s+/).filter((t) => t.length > 2);
        const hits = toks.filter((t) => up.includes(t)).length;
        return hits >= 2; // pelo menos 2 tokens do nome batem
      });
      return v ? { id: v.id, nome: v.nome } : { id: null, nome: raw };
    };

    // coleta sessoes do Centi (ordinarias + extraordinarias)
    let sessoes: Sessao[] = [];
    for (const codigo of Object.keys(TIPOS).map(Number)) {
      try {
        await delay(600);
        sessoes = sessoes.concat(await scrapeSessoes(codigo));
      } catch (e) {
        errors.push(`scrape tipo ${codigo}: ${(e as Error).message?.slice(0, 100)}`);
      }
    }

    // ja processadas: titulos que ja tem presenca por vereador real (ignora placeholders)
    const { data: jaProc } = await sb
      .from("presenca_sessoes")
      .select("sessao_titulo")
      .neq("vereador_nome", "SESSÃO")
      .not("vereador_id", "is", null);
    const processados = new Set((jaProc || []).map((r: any) => r.sessao_titulo));

    const pendentes = sessoes.filter((s) => s.documento_url && !processados.has(s.titulo)).slice(0, batchSize);

    for (const sessao of pendentes) {
      try {
        const b64 = await baixarPdfBase64(sessao.documento_url!);
        if (!b64) {
          errors.push(`PDF nao baixou: ${sessao.titulo.slice(0, 40)}`);
          continue;
        }
        const extr = await extrairPresenca(b64, orKey);
        if (!extr || (!extr.presentes.length && !extr.ausentes.length)) {
          errors.push(`IA sem dados: ${sessao.titulo.slice(0, 40)}`);
          continue;
        }

        const ano = sessao.data ? parseInt(sessao.data.slice(0, 4)) : new Date().getFullYear();
        const rowsMap = new Map<string, any>(); // dedup por vereador_nome
        const add = (raw: string, presente: boolean) => {
          const mv = matchVereador(raw);
          if (rowsMap.has(mv.nome)) return;
          rowsMap.set(mv.nome, {
            sessao_titulo: sessao.titulo,
            sessao_data: sessao.data,
            tipo_sessao: sessao.tipo,
            ano,
            vereador_id: mv.id,
            vereador_nome: mv.nome,
            presente,
            fonte_url: sessao.documento_url,
            fonte_tipo: "centi-ia",
            status_verificacao: "ia",
          });
        };
        extr.presentes.forEach((n) => add(n, true));
        extr.ausentes.forEach((n) => add(n, false));
        const rows = [...rowsMap.values()];

        // substitui as linhas dessa sessao (idempotente, limpa placeholder antigo)
        await sb.from("presenca_sessoes").delete().eq("sessao_titulo", sessao.titulo);
        const { error } = await sb.from("presenca_sessoes").insert(rows);
        if (error) {
          errors.push(`insert ${sessao.titulo.slice(0, 30)}: ${error.message}`);
        } else {
          sessoesProcessadas++;
          registros += rows.length;
        }
      } catch (e) {
        errors.push(`${sessao.titulo.slice(0, 30)}: ${(e as Error).message?.slice(0, 100)}`);
      }
      await delay(800);
    }

    const result = {
      sessoes_encontradas: sessoes.length,
      pendentes: sessoes.filter((s) => s.documento_url && !processados.has(s.titulo)).length,
      sessoes_processadas: sessoesProcessadas,
      registros,
      errors: errors.slice(0, 10),
    };
    if (logId) {
      await sb.from("sync_log").update({
        status: errors.length ? "partial" : "success",
        detalhes: result,
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    if (logId) {
      await sb.from("sync_log").update({
        status: "error",
        detalhes: { error: (error as Error).message, errors },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
