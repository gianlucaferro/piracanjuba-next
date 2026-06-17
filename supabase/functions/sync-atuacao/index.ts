import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// 2026-06: o portal SAPL (acessoainformacao / piracanjuba.go.leg.br) saiu do ar (404).
// A Camara migrou pro Centi. Indicacoes/Mocoes/Requerimentos ficam em
// /transparencia/atosadministrativos/{codigo}: tabela [Descricao, Observacao, Publicacao, Documento].
const CENTI_BASE = "https://camarapiracanjuba.centi.com.br/transparencia/atosadministrativos";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// codigo Centi -> tipo logico (atuacao_parlamentar.tipo)
const TIPOS: Record<number, string> = {
  24: "Indicação",
  26: "Moção",
  9: "Requerimento",
};

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
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.split("T")[0];
  return null;
}

function extrairAutor(descricao: string): string | null {
  const m = descricao.match(/[-–]\s*(VER(?:EADOR|EADORA)?\.?\s*.+)$/i);
  if (m) return m[1].replace(/^VER(?:EADOR|EADORA)?\.?\s*/i, "").trim() || null;
  return null;
}

interface AtoRow {
  descricao: string;
  observacao: string;
  data: string | null;
  documento_url: string | null;
}

async function scrapeCenti(tipoCodigo: number): Promise<AtoRow[]> {
  const resp = await fetch(`${CENTI_BASE}/${tipoCodigo}`, { headers: { "User-Agent": UA } });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const html = await resp.text();
  const tbody = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbody) return [];
  const rows = tbody[1].split(/<tr[^>]*>/i).filter((r) => r.includes("<td"));
  const out: AtoRow[] = [];
  for (const row of rows) {
    const cells: string[] = [];
    const re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let m;
    while ((m = re.exec(row)) !== null) {
      cells.push(decodeEntities(m[1].replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim());
    }
    if (cells.length < 3) continue;
    const link =
      row.match(/href="([^"]*\/download\/[^"]*)"/i) || row.match(/href="([^"]*\.(?:pdf|PDF)[^"]*)"/i);
    const data =
      cells[2] && /\d{2}\/\d{2}\/\d{4}/.test(cells[2])
        ? cells[2]
        : cells.find((c) => /\d{2}\/\d{2}\/\d{4}/.test(c)) || null;
    out.push({
      descricao: cells[0] || "",
      observacao: cells[1] || "",
      data,
      documento_url: link ? decodeEntities(link[1]) : null,
    });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({ tipo: "atuacao", status: "running", detalhes: {} })
    .select()
    .single();
  const logId = logEntry?.id;

  const errors: string[] = [];
  let total = 0;

  try {
    const { data: vereadores } = await supabase.from("vereadores").select("id, nome");
    const vlist = (vereadores || []) as { id: string; nome: string }[];
    const matchVereador = (autor: string | null): string | null => {
      if (!autor) return null;
      const a = autor.toUpperCase();
      const found = vlist.find((v) => {
        const tokens = (v.nome || "").toUpperCase().split(/\s+/).filter((t) => t.length > 2);
        return tokens.some((t) => a.includes(t));
      });
      return found?.id ?? null;
    };

    for (const [codigoStr, tipo] of Object.entries(TIPOS)) {
      const codigo = Number(codigoStr);
      try {
        await delay(800);
        const atos = await scrapeCenti(codigo);
        const batch: any[] = [];
        for (const ato of atos) {
          // "INDICAÇÃO Nº 551/2025" -> numero 551, ano 2025
          const numMatch = ato.descricao.match(/(\d+)\s*\/\s*(\d{4})/);
          if (!numMatch) continue;
          const numero = parseInt(numMatch[1]);
          const ano = parseInt(numMatch[2]);
          const autorTexto = extrairAutor(ato.descricao) || extrairAutor(ato.observacao);
          batch.push({
            tipo,
            numero,
            ano,
            data: toIsoDate(ato.data),
            descricao: (ato.observacao || ato.descricao).slice(0, 2000),
            autor_texto: autorTexto || "Não identificado",
            autor_vereador_id: matchVereador(autorTexto),
            fonte_url: ato.documento_url,
          });
        }
        // dedup por chave unica (tipo,numero,ano): a fonte pode repetir a linha
        const seen = new Set<string>();
        const deduped = batch.filter((b) => {
          const k = `${b.tipo}|${b.numero}|${b.ano}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        if (deduped.length) {
          const { error } = await supabase
            .from("atuacao_parlamentar")
            .upsert(deduped, { onConflict: "tipo,numero,ano" });
          if (error) errors.push(`${tipo}: ${error.message}`);
          else total += deduped.length;
        }
      } catch (e) {
        errors.push(`tipo ${codigo}: ${(e as Error).message?.slice(0, 120)}`);
      }
    }

    if (logId) {
      await supabase.from("sync_log").update({
        status: errors.length ? "partial" : "success",
        detalhes: { upserted: total, errors: errors.slice(0, 20) },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    return new Response(JSON.stringify({ success: true, upserted: total, errors: errors.slice(0, 10) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (logId) {
      await supabase.from("sync_log").update({
        status: "error",
        detalhes: { error: (e as Error).message },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    console.error("sync-atuacao error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
