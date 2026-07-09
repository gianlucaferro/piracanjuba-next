// Sync semanal de Atividades Legislativas da Câmara de Piracanjuba.
// 2026-07: a Câmara migrou do portal SAPL (acessoainformacao.piracanjuba.go.leg.br,
// que congelou/saiu do ar) para o Centi (camarapiracanjuba.centi.com.br). Esta função
// agora raspa o portal NOVO, paginado, cobrindo Projeto de Lei (Legislativo e Executivo),
// Resolução e Decreto Legislativo, e normaliza os autores para os nomes canônicos dos
// vereadores (pra o ranking por autor bater com a tabela `vereadores`).
//
// Estratégia de refresh sem janela vazia: faz upsert das linhas novas (chave sintética
// `novo-{codigo}-{numero}-{ano}`) e só depois apaga as linhas antigas do SAPL. Aborta se
// a raspagem trouxer poucas linhas (proteção contra portal fora do ar).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret, x-centi-ingest-secret",
};

const CENTI_BASE = "https://camarapiracanjuba.centi.com.br/transparencia/atosadministrativos";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const DESDE = "2025-01-01"; // legislatura atual

// codigo Centi -> tipo lógico + se é autoria do Executivo
const TIPOS: Record<number, { tipo: string; executivo: boolean }> = {
  21: { tipo: "Projeto de Lei do Executivo", executivo: true },
  22: { tipo: "Projeto de Lei do Legislativo", executivo: false },
  23: { tipo: "Projeto de Resolução", executivo: false },
  30: { tipo: "Projeto de Decreto Legislativo", executivo: false },
};

// primeiro nome (UPPER) -> nome canônico da tabela `vereadores`
const CANON: Record<string, string> = {
  ADRIANA: "Adriana Dias", APARECIDA: "Aparecida Cordeiro", DOUGLAS: "Douglas Miranda",
  EDIMAR: "Edimar Lopes", FERNANDO: "Fernando Silva", MARCO: "Marco Antônio",
  REGINALDO: "Reginaldo Silva", SIRLEY: "Sirley de Fatima", WELTON: "Welton da Silva",
  WENNDER: "Wennder Silva", YURI: "Yuri Santiago",
};

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

function parseAutores(desc: string, execTipo: boolean): { autores: string[]; executivo: boolean } {
  if (execTipo || /poder\s+executivo/i.test(desc)) return { autores: ["Poder Executivo"], executivo: true };
  if (/todos\s+(?:os\s+)?vereadores/i.test(desc)) return { autores: ["Todos os vereadores"], executivo: false };
  if (/mesa\s+diretora/i.test(desc)) return { autores: ["Mesa Diretora"], executivo: false };
  const tail = desc.replace(/^.*?\d+\/\d{4}\s*[-–]\s*/, "");
  const chunks = tail.split(/[,/]|VEREADORA?\.?|VER\.?/i).map((s) => s.trim()).filter(Boolean);
  const set = new Set<string>();
  for (const c of chunks) {
    const first = (c.split(/\s+/)[0] ?? "").toUpperCase().replace(/[^A-ZÀ-Ú]/g, "");
    if (CANON[first]) set.add(CANON[first]);
  }
  return { autores: [...set], executivo: false };
}

// id numérico estável e único por (codigo, ano, numero); sempre >= 2.1e9, bem acima
// dos ids pequenos do SAPL antigo (que serão apagados por < 2e9).
const CHAVE_MIN_NOVO = 2_000_000_000;
function chaveNova(cod: number, ano: number, num: number): number {
  return cod * 100_000_000 + ano * 10_000 + num;
}

type Linha = {
  centi_linha_id: number; modulo_id: number; modulo_nome: string; ato_tipo: string;
  numero: string; numero_int: number; ano: number; ato_completo: string;
  data_publicacao: string; parlamentar_raw: string; autores: string[];
  autoria_executivo: boolean; descricao_texto: string; descricao_html: string | null;
  relator: string | null; tramitacao_html: string | null; situacao: string;
  raw_payload: Record<string, unknown>;
};

async function pageRows(cod: number, pg: number): Promise<Array<{ desc: string; ementa: string; data: string | null; link: string | null }> | null> {
  const r = await fetch(`${CENTI_BASE}/${cod}?pagina=${pg}`, { headers: { "User-Agent": UA } });
  if (!r.ok) return null;
  const html = await r.text();
  const tb = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tb) return [];
  return tb[1].split(/<tr[^>]*>/i).filter((x) => x.includes("<td")).map((tr) => {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => decode(m[1]));
    const dateCell = cells.find((c) => /\d{2}\/\d{2}\/\d{4}/.test(c));
    const link = (tr.match(/href="([^"]+\/download\/[^"]+)"/i) ?? [])[1] ?? null;
    return { desc: cells[0] ?? "", ementa: cells[1] ?? "", data: isoDate(dateCell), link };
  });
}

async function scrapeTudo(): Promise<Linha[]> {
  const out: Linha[] = [];
  const seen = new Set<number>();
  for (const codStr of Object.keys(TIPOS)) {
    const cod = Number(codStr);
    const { tipo, executivo } = TIPOS[cod];
    for (let pg = 1; pg <= 15; pg++) {
      const rows = await pageRows(cod, pg);
      if (!rows || rows.length === 0) break;
      for (const r of rows) {
        if (!r.data || r.data < DESDE) continue;
        const m = r.desc.match(/(\d+)\/(\d{4})/);
        if (!m) continue;
        const num = parseInt(m[1]);
        const ano = parseInt(m[2]);
        const id = chaveNova(cod, ano, num);
        if (seen.has(id)) continue;
        seen.add(id);
        const { autores, executivo: exeAutor } = parseAutores(r.desc, executivo);
        out.push({
          centi_linha_id: id, modulo_id: cod, modulo_nome: tipo, ato_tipo: tipo,
          numero: String(num), numero_int: num, ano, ato_completo: `${tipo} ${num}/${ano}`,
          data_publicacao: r.data, parlamentar_raw: autores.join(", "), autores,
          autoria_executivo: exeAutor, descricao_texto: r.ementa, descricao_html: null,
          relator: null, tramitacao_html: null, situacao: "PROTOCOLADO",
          raw_payload: { fonte: "centi-atosadministrativos", codigo: cod, descricao: r.desc, documento_url: r.link },
        });
      }
      if (rows.length < 10) break;
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({ tipo: "atividades_legislativas", status: "running" })
    .select("id").single();
  const logId = logEntry?.id;

  try {
    const linhas = await scrapeTudo();

    // Proteção: se raspou pouco, não mexe na tabela (portal pode estar fora do ar).
    if (linhas.length < 40) {
      if (logId) {
        await supabase.from("sync_log").update({
          status: "error", finished_at: new Date().toISOString(),
          detalhes: { erro: "poucas linhas raspadas, abortado", total: linhas.length },
        }).eq("id", logId);
      }
      return new Response(JSON.stringify({ error: "poucas linhas, abortado", total: linhas.length }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert das linhas novas (sem janela vazia), em lotes.
    for (let i = 0; i < linhas.length; i += 100) {
      const lote = linhas.slice(i, i + 100).map((l) => ({ ...l, updated_at: new Date().toISOString() }));
      const { error } = await supabase.from("atividade_legislativa").upsert(lote, { onConflict: "centi_linha_id" });
      if (error) throw new Error(`upsert lote ${i}: ${error.message}`);
    }

    // Remove as linhas antigas do SAPL (ids pequenos, abaixo do range das chaves novas).
    const { error: delErr } = await supabase
      .from("atividade_legislativa").delete().lt("centi_linha_id", CHAVE_MIN_NOVO);
    if (delErr) throw new Error(`delete antigas: ${delErr.message}`);

    const porTipo: Record<string, number> = {};
    for (const l of linhas) porTipo[l.ato_tipo] = (porTipo[l.ato_tipo] ?? 0) + 1;

    if (logId) {
      await supabase.from("sync_log").update({
        status: "success", finished_at: new Date().toISOString(),
        detalhes: { total: linhas.length, por_tipo: porTipo, fonte: "centi-novo" },
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: true, total: linhas.length, por_tipo: porTipo }), {
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
