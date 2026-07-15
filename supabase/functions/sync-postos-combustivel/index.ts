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

    const rows = postos
      .filter((p) => p.codigoSIMP)
      .map((p) => ({
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
      }));

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
