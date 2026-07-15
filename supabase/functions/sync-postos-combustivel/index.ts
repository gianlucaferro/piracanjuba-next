// Sync dos postos de combustível de Piracanjuba via API oficial da ANP
// (API de Revendedores, sem autenticação): retorna os postos por município/UF
// com dados cadastrais, bandeira, produtos, coordenadas e sinais regulatórios
// (interdição Sigaf, inadimplência de qualidade PMQC). Roda mensalmente.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

const ANP_API = "https://revendedoresapi.anp.gov.br/v1/combustivel";
const MUNICIPIO = "PIRACANJUBA";
const UF = "GO";
const UA = "piracanjuba.ai/1.0 (transparencia municipal)";

// App "ANP com Você" (nota 0..5 por posto). A lista pública por município é
// protegida por checksum (cs), mas o cs é ESTÁVEL por município (não depende de
// sessão): um GET simples já devolve o HTML com o modelo do relatório APEX.
// Se a ANP mudar o app/checksum, o parse falha de forma segura (nota não atualiza,
// os dados cadastrais da API oficial continuam).
const ANP_NOTA_CS =
  "1diwAcw0Hj_KQP4JeZBLbfv3dv5qksMZOTDJe8L1d_KQW3F1faFZtt-lERd88JrWurti28uNbOTtjDKlNtGxPsQ";
const ANP_NOTA_URL =
  `https://anpcomvcpostos.anp.gov.br/ordsdw/r/sfi_apex/anpcomvcpostos/postos-lista` +
  `?p5_municipio=${MUNICIPIO}&p5_uf=${UF}&clear=1&cs=${ANP_NOTA_CS}`;

type NotaAnp = {
  nota: number;                    // 0..5
  infracoesQualidade: number | null;
  infracoesQuantidade: number | null;
  amostrasNaoConforme: number | null;
};

// Contagem oficial: inteiro >= 0 e razoável; senão null (fail-safe).
function contagem(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n < 10000 ? n : null;
}

// Extrai CNPJ(14) -> {nota, infrações} do modelo do relatório APEX, embutido no
// HTML como arrays JS por linha. Índices validados nos 11 postos contra o app:
// [1]=CNPJ, [29]=infrações qualidade, [30]=infrações quantidade,
// [33]=amostras não conforme, [38]=nota. Só aceita valores válidos (fail-safe).
function parseNotasAnp(html: string): Map<string, NotaAnp> {
  const map = new Map<string, NotaAnp>();
  const clean = html.replace(/\\\//g, "/");
  const re = /\b\d{14}\b/g;
  const vistos = new Set<number>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    const start = clean.lastIndexOf("[", m.index);
    if (start < 0 || vistos.has(start)) continue;
    let depth = 0, end = -1, inStr = false, esc = false;
    for (let j = start; j < Math.min(start + 6000, clean.length); j++) {
      const ch = clean[j];
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === "[") depth++;
      else if (ch === "]") { depth--; if (depth === 0) { end = j + 1; break; } }
    }
    if (end < 0) continue;
    vistos.add(start);
    try {
      const arr = JSON.parse(clean.slice(start, end));
      const cnpj = String(arr?.[1] ?? "");
      const nota = Number(arr?.[38]);
      if (/^\d{14}$/.test(cnpj) && Number.isInteger(nota) && nota >= 0 && nota <= 5) {
        map.set(cnpj, {
          nota,
          infracoesQualidade: contagem(arr?.[29]),
          infracoesQuantidade: contagem(arr?.[30]),
          amostrasNaoConforme: contagem(arr?.[33]),
        });
      }
    } catch { /* linha inválida, ignora */ }
  }
  return map;
}

async function fetchNotasAnp(): Promise<Map<string, NotaAnp>> {
  const resp = await fetch(ANP_NOTA_URL, {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  if (!resp.ok) throw new Error(`ANP lista ${resp.status}`);
  const html = await resp.text();
  if (html.includes("roteção de estado")) throw new Error("checksum de sessão inválido");
  return parseNotasAnp(html);
}

type AnpProduto = { produto?: string; tancagem?: number; unidMedidaTancagem?: string };
type AnpPosto = {
  codigoSIMP: string;
  autorizacao?: string;
  razaoSocial: string;
  cnpj?: string;
  endereco?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  uf?: string;
  municipio?: string;
  distribuidora?: string;
  produtos?: AnpProduto[];
  latitude?: string;
  longitude?: string;
  situacaoConstatada?: string;
  statusSIGAF?: string;
  inadimplenciaPMQC?: unknown[];
  dataPublicacao?: string;
  dataVinculacao?: string;
};

function toNum(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

async function fetchAnpPostos(): Promise<AnpPosto[]> {
  const all: AnpPosto[] = [];
  for (let pagina = 1; pagina <= 20; pagina++) {
    const url = `${ANP_API}?municipio=${encodeURIComponent(MUNICIPIO)}&uf=${UF}&numeropagina=${pagina}`;
    const resp = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!resp.ok) throw new Error(`ANP API ${resp.status} na página ${pagina}`);
    const json = await resp.json();
    const data: AnpPosto[] = Array.isArray(json?.data) ? json.data : [];
    all.push(...data);
    const totalPagina = json?.searchPageFilter?.totalPagina ?? 1;
    if (pagina >= totalPagina || data.length === 0) break;
  }
  return all;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth antes de qualquer efeito colateral (mesmo padrão dos outros syncs).
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CRON_SECRET = Deno.env.get("CRON_SECRET");
  const CENTI_INGEST_SECRET = Deno.env.get("CENTI_INGEST_SECRET");
  const isAuthorized =
    (CRON_SECRET && req.headers.get("x-cron-secret") === CRON_SECRET) ||
    (CENTI_INGEST_SECRET && req.headers.get("x-centi-ingest-secret") === CENTI_INGEST_SECRET) ||
    (req.headers.get("authorization") ?? "").includes(SERVICE_KEY);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY);
  const startedAt = Date.now();

  try {
    const postos = await fetchAnpPostos();
    if (postos.length === 0) {
      // Não apaga nada se a API voltou vazia (pode ser falha momentânea).
      return new Response(
        JSON.stringify({ success: true, upserted: 0, removed: 0, message: "API retornou 0 postos; nada alterado." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Notas do app "ANP com Você" (best-effort): se falhar, seguimos só com o
    // cadastral e NÃO tocamos na coluna nota (preserva a última conhecida).
    let notas = new Map<string, NotaAnp>();
    try {
      notas = await fetchNotasAnp();
    } catch (e) {
      console.warn("Notas ANP indisponíveis:", e instanceof Error ? e.message : e);
    }
    const temNotas = notas.size > 0;
    const agora = new Date().toISOString();

    const rows = postos
      .filter((p) => p.codigoSIMP)
      .map((p) => {
        const n = notas.get(p.cnpj ?? "");
        return {
        ...(temNotas
          ? {
              nota: n?.nota ?? null,
              infracoes_qualidade: n?.infracoesQualidade ?? null,
              infracoes_quantidade: n?.infracoesQuantidade ?? null,
              amostras_nao_conforme: n?.amostrasNaoConforme ?? null,
              nota_atualizada_em: agora,
            }
          : {}),
        codigo_simp: String(p.codigoSIMP),
        autorizacao: p.autorizacao ?? null,
        razao_social: p.razaoSocial ?? "Posto sem nome",
        cnpj: p.cnpj ?? null,
        endereco: p.endereco ?? null,
        complemento: p.complemento ?? null,
        bairro: p.bairro ?? null,
        cep: p.cep ?? null,
        uf: p.uf ?? UF,
        municipio: p.municipio ?? MUNICIPIO,
        distribuidora: (p.distribuidora ?? "").trim() || null,
        produtos: (p.produtos ?? []).map((x) => ({
          produto: x.produto ?? null,
          tancagem: x.tancagem ?? null,
          unidade: x.unidMedidaTancagem ?? null,
        })),
        latitude: toNum(p.latitude),
        longitude: toNum(p.longitude),
        situacao_constatada: p.situacaoConstatada ?? null,
        status_sigaf: (p.statusSIGAF ?? "").trim() || null,
        inadimplencia_pmqc: Array.isArray(p.inadimplenciaPMQC) ? p.inadimplenciaPMQC : [],
        data_publicacao: p.dataPublicacao ?? null,
        data_vinculacao: p.dataVinculacao ?? null,
        fonte_url: "https://anpcomvcpostos.anp.gov.br/",
        atualizado_em: new Date().toISOString(),
        };
      });

    const { error: upErr } = await supabase
      .from("postos_combustivel")
      .upsert(rows, { onConflict: "codigo_simp" });
    if (upErr) throw upErr;

    // Remove postos que não vêm mais na resposta (fechados/descredenciados),
    // apenas para o município sincronizado e só porque a API trouxe dados.
    const idsAtuais = new Set(rows.map((r) => r.codigo_simp));
    const { data: existentes } = await supabase
      .from("postos_combustivel")
      .select("codigo_simp")
      .eq("municipio", MUNICIPIO)
      .eq("uf", UF);
    const staleIds = (existentes ?? [])
      .map((r) => r.codigo_simp as string)
      .filter((id) => !idsAtuais.has(id));
    let removed = 0;
    if (staleIds.length > 0) {
      const { error: delErr } = await supabase
        .from("postos_combustivel")
        .delete()
        .in("codigo_simp", staleIds);
      if (delErr) throw delErr;
      removed = staleIds.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        upserted: rows.length,
        removed,
        notas: notas.size,
        duration_ms: Date.now() - startedAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("sync-postos-combustivel error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
