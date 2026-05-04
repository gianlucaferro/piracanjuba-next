// TCM-GO via Apify Website Content Crawler
//
// Por que Apify e nao FireCrawl:
// - TCM-GO usa SQL Server Reporting Services (ASP.NET) — paginas dinamicas
//   com cookies de sessao. FireCrawl pega so a casca HTML inicial (vazia).
// - Apify Actor 'apify/website-content-crawler' usa Playwright (Firefox)
//   com browser real, espera JS rodar, mantem cookies, faz paginacao.
// - FREE tier do Apify cobre essas ~50 paginas/run sem custo.
//
// Estrategia: crawler comeca em URL de busca filtrada por Piracanjuba,
// segue links internos ate maxDepth 2, retorna markdown + URL de cada pagina.
// Parse local extrai numero processo, ano, tipo, ementa, valor.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_BASE = "https://api.apify.com/v2";
const ACTOR_ID = "apify~website-content-crawler";

// URLs de partida — todas focadas em Piracanjuba
const START_URLS = [
  // Site institucional com busca de noticias/decisoes
  "https://www.tcm.go.gov.br/cidadao/?s=Piracanjuba",
  // Pagina de decisoes (acordaos)
  "https://www.tcm.go.gov.br/decisoes/",
  // Resultado de busca generica
  "https://www.tcm.go.gov.br/?s=Piracanjuba",
];

interface DatasetItem {
  url: string;
  title?: string;
  text?: string;
  markdown?: string;
  metadata?: Record<string, unknown>;
}

function parseApontamento(item: DatasetItem) {
  const md = item.markdown ?? item.text ?? "";
  const tit = item.title ?? "";
  const fullText = `${tit}\n${md}`;

  // numero processo: "12345/2023", "2023.12345", "Proc nº 12345"
  const numMatch =
    fullText.match(/(?:processo|proc\.?\s*n[º°.]?)\s*[:\-]?\s*([\d./]{4,20})/i) ||
    fullText.match(/\b(\d{4,6}[\/.-]\d{2,4})\b/);
  const numero_processo = numMatch
    ? numMatch[1].replace(/\.+$/, "")
    : `tcm_apify_${Date.now()}_${item.url.slice(-12)}`;

  // ano
  const anoMatch = fullText.match(/\b(20\d{2})\b/);
  const ano = anoMatch ? parseInt(anoMatch[1]) : null;

  // tipo de documento
  const tipoMatch = fullText.match(
    /\b(ac[oó]rd[aã]o|parecer|decis[aã]o|notifica[çc][aã]o|inspe[çc][aã]o|relat[oó]rio|tomada\s+de\s+contas)\b/i,
  );
  const tipo = tipoMatch ? tipoMatch[1].toLowerCase() : null;

  // status
  const statusMatch = fullText.match(
    /\b(aprovad[oa]|reprovad[oa]|julgad[oa]\s+regular|julgad[oa]\s+irregular|pendente|em\s+an[áa]lise|arquivad[oa])\b/i,
  );
  const status = statusMatch ? statusMatch[1].toLowerCase() : null;

  // orgao alvo
  const orgaoMatch = fullText.match(
    /\b(prefeitura|c[âa]mara|munic[íi]pio|secretaria|fundo)\s+(?:municipal\s+)?(?:de\s+)?piracanjuba/i,
  );
  const orgao_alvo = orgaoMatch ? orgaoMatch[1].toLowerCase() : "prefeitura";

  // ementa: primeiro paragrafo > 50 chars
  const ementa = (
    md.split(/\n+/).find((l) => l.trim().length > 50) ??
    md.slice(0, 500)
  ).slice(0, 500);

  // valor
  const valorMatch = fullText.match(/r\$\s*([\d.,]+)/i);
  const valor_envolvido = valorMatch
    ? parseFloat(valorMatch[1].replace(/\./g, "").replace(",", "."))
    : null;

  // data publicacao
  const dataMatch = fullText.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  const data_publicacao = dataMatch
    ? `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`
    : null;

  return {
    numero_processo,
    ano,
    orgao_alvo,
    tipo,
    status,
    ementa,
    data_publicacao,
    valor_envolvido,
    fonte_url: item.url,
  };
}

async function callApify(token: string, input: object): Promise<{ datasetId: string }> {
  const r = await fetch(
    `${APIFY_BASE}/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${token}&format=json&clean=true`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Apify HTTP ${r.status}: ${txt.slice(0, 300)}`);
  }
  const data = await r.json() as DatasetItem[];
  return { datasetId: r.headers.get("x-apify-dataset-id") ?? "", ...{ items: data } } as any;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";
  const maxPages = parseInt(url.searchParams.get("max") || "30");

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const apifyToken = Deno.env.get("APIFY_TOKEN");
  if (!apifyToken) {
    return new Response(JSON.stringify({ success: false, error: "APIFY_TOKEN missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: log } = await sb.from("sync_log")
    .insert({
      tipo: "tcm_go",
      status: "running",
      detalhes: { fonte: "apify-website-content-crawler", start_urls: START_URLS, maxPages },
    })
    .select("id").single();

  try {
    // Run Apify Actor sincronamente — espera ate terminar e retorna items
    const apifyInput = {
      startUrls: START_URLS.map((u) => ({ url: u })),
      crawlerType: "playwright:firefox",
      maxCrawlDepth: 2,
      maxCrawlPages: maxPages,
      maxResults: maxPages,
      saveMarkdown: true,
      removeCookieWarnings: true,
      blockMedia: true,
      htmlTransformer: "readableText",
      proxyConfiguration: { useApifyProxy: true },
      requestTimeoutSecs: 60,
      maxRequestRetries: 3,
      // Filtro pra pegar so paginas com Piracanjuba no body (otimiza credits)
      includeUrlGlobs: [
        "https://www.tcm.go.gov.br/**Piracanjuba**",
        "https://www.tcm.go.gov.br/**piracanjuba**",
        "https://www.tcm.go.gov.br/cidadao/**",
        "https://www.tcm.go.gov.br/decisoes/**",
        "https://www.tcm.go.gov.br/site/**",
      ],
    };

    const r = await fetch(
      `${APIFY_BASE}/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${apifyToken}&format=json&clean=true`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apifyInput),
      },
    );
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`Apify HTTP ${r.status}: ${txt.slice(0, 300)}`);
    }
    const items = (await r.json()) as DatasetItem[];

    // Filtrar so itens que mencionam Piracanjuba
    const relevantes = items.filter((it) => {
      const haystack = `${it.title ?? ""} ${it.text ?? ""} ${it.markdown ?? ""}`.toLowerCase();
      return haystack.includes("piracanjuba");
    });

    // Dedup por URL antes de inserir
    const urls = relevantes.map((r) => r.url).filter(Boolean);
    const { data: existing } = await sb
      .from("tcm_go_apontamentos")
      .select("fonte_url")
      .in("fonte_url", urls);
    const existingSet = new Set((existing ?? []).map((r) => r.fonte_url));
    const novas = relevantes.filter((r) => r.url && !existingSet.has(r.url));

    const upserted: string[] = [];
    for (const item of novas) {
      const row = parseApontamento(item);
      if (dryRun) { upserted.push(row.numero_processo); continue; }
      const { error } = await sb
        .from("tcm_go_apontamentos")
        .upsert(row, { onConflict: "numero_processo,data_publicacao" });
      if (!error) upserted.push(row.numero_processo);
    }

    const result = {
      crawled: items.length,
      relevantes_piracanjuba: relevantes.length,
      novas: novas.length,
      upserted: upserted.length,
      sample: upserted.slice(0, 5),
    };
    if (log?.id)
      await sb.from("sync_log").update({
        status: "success",
        detalhes: result,
        finished_at: new Date().toISOString(),
      }).eq("id", log.id);

    return new Response(JSON.stringify({ success: true, dry_run: dryRun, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (log?.id)
      await sb.from("sync_log").update({
        status: "error",
        detalhes: { error: msg },
        finished_at: new Date().toISOString(),
      }).eq("id", log.id);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
