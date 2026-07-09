// Sync semanal de Indicações da Câmara Municipal de Piracanjuba.
// 2026-07: migrado do SAPL (acessoainformacao..., congelou em mar/2026) pro portal
// novo Centi (camarapiracanjuba.centi.com.br), código 24 = INDICAÇÃO, paginado.
// A listagem nova NÃO expõe autor; upsert com ignoreDuplicates preserva as linhas
// antigas (que têm autor da era SAPL) e insere só as faltantes.
//
// Cron: toda segunda-feira 06:00 UTC

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

const CENTI_BASE = "https://camarapiracanjuba.centi.com.br/transparencia/atosadministrativos";
const COD_INDICACAO = 24;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function isoDate(raw: string | undefined): string | null {
  const m = (raw ?? "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

type Row = { numero: string; numeroAno: number; ano: number; data: string | null; ementa: string; chave: string };

// rawCount = linhas cruas da página (a paginação para por ele, NÃO pelo filtrado:
// uma linha sem número no meio derrubava o count filtrado pra <10 e parava cedo).
async function pageRows(pagina: number): Promise<{ rows: Row[]; rawCount: number } | null> {
  const r = await fetch(`${CENTI_BASE}/${COD_INDICACAO}?pagina=${pagina}`, { headers: { "User-Agent": UA } });
  if (!r.ok) return null;
  const html = await r.text();
  const tb = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tb) return { rows: [], rawCount: 0 };
  const trs = tb[1].split(/<tr[^>]*>/i).filter((x) => x.includes("<td"));
  const out: Row[] = [];
  for (const tr of trs) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => decode(m[1]));
    const desc = cells[0] ?? "";
    const m = desc.match(/(\d+)\s*\/\s*(\d{4})/);
    if (!m) continue;
    const numeroAno = parseInt(m[1]);
    const ano = parseInt(m[2]);
    // chave estável: hash do link de download (mesmo formato da era anterior);
    // fallback determinístico quando a linha não tem documento.
    const hash = (tr.match(/\/download\/([^/"]+)\//i) ?? tr.match(/\/download\/([^"]+)"/i) ?? [])[1] ?? null;
    const chave = hash ? decode(hash) : `ind-${numeroAno}-${ano}`;
    out.push({
      numero: desc, numeroAno, ano,
      data: isoDate(cells.find((c) => /\d{2}\/\d{2}\/\d{4}/.test(c))),
      ementa: (cells[1] ?? "").slice(0, 2000),
      chave,
    });
  }
  return { rows: out, rawCount: trs.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({ tipo: "indicacoes_camara", status: "running" })
    .select("id").single();
  const logId = logEntry?.id;

  try {
    const rows: Row[] = [];
    for (let pg = 1; pg <= 120; pg++) {
      const page = await pageRows(pg);
      if (!page || page.rawCount === 0) break;
      rows.push(...page.rows);
      if (page.rawCount < 10) break;
      await delay(350);
    }

    if (rows.length < 20) {
      throw new Error(`poucas linhas raspadas (${rows.length}), abortado`);
    }

    // dedup por chave
    const seen = new Set<string>();
    const linhas = rows.filter((r) => {
      if (seen.has(r.chave)) return false;
      seen.add(r.chave);
      return true;
    }).map((r) => ({
      centi_chave: r.chave,
      numero: r.numero,
      numero_ano: r.numeroAno,
      ano: r.ano,
      tipo: "INDICAÇÃO",
      data_publicacao: r.data,
      ementa: r.ementa,
      raw_payload: { fonte: "centi-atosadministrativos", codigo: COD_INDICACAO },
    }));

    let inseridas = 0;
    for (let i = 0; i < linhas.length; i += 200) {
      const { error } = await supabase
        .from("indicacao_camara")
        .upsert(linhas.slice(i, i + 200), { onConflict: "centi_chave", ignoreDuplicates: true });
      if (error) throw new Error(`upsert: ${error.message}`);
      inseridas += 200;
    }

    if (logId) {
      await supabase.from("sync_log").update({
        status: "success", finished_at: new Date().toISOString(),
        detalhes: { raspadas: rows.length, dedup: linhas.length, fonte: "centi-novo" },
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: true, raspadas: rows.length, dedup: linhas.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    if (logId) {
      await supabase.from("sync_log").update({
        status: "error", finished_at: new Date().toISOString(),
        detalhes: { erro: (error as Error).message },
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
