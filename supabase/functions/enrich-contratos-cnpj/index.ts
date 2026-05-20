// enrich-contratos-cnpj — popula CNPJ + dados cadastrais nos contratos
// da Prefeitura (originalmente so com nome de empresa).
//
// LIMITACAO: APIs gratuitas (BrasilAPI, Compras.gov.br) so retornam dados
// por CNPJ — busca por nome confiavel exige BigData Corp ou similar pago.
// Por isso, esta funcao opera em 3 modos:
//   1) Se o texto do nome contem um CNPJ valido -> extrai e enriquece via BrasilAPI
//   2) Se contrato_camara ja tem CNPJ pra mesmo nome -> propaga para tabela contratos
//   3) Caso contrario -> marca como "sem_match" (manual ou API paga depois)
//
// Body: { limit?: number, force?: boolean }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkCentiAuth } from "../_shared/centi-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

const BRASILAPI = "https://brasilapi.com.br/api";
const COMPRAS = "https://compras.dados.gov.br";

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 &]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrai um CNPJ se estiver presente no texto do nome (raro mas acontece). */
function extractCnpjFromText(s: string): string | null {
  const m = s.match(/(\d{2})\D?(\d{3})\D?(\d{3})\D?(\d{4})\D?(\d{2})/);
  if (!m) return null;
  return `${m[1]}${m[2]}${m[3]}${m[4]}${m[5]}`;
}

type BrasilApiCnpj = {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string | null;
  situacao_cadastral?: number;
  descricao_situacao_cadastral?: string;
  cnae_fiscal_descricao?: string;
  data_inicio_atividade?: string;
};

async function buscarBrasilApiPorCnpj(cnpj: string): Promise<BrasilApiCnpj | null> {
  const ctl = new AbortController();
  const tid = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch(`${BRASILAPI}/cnpj/v1/${cnpj}`, {
      headers: { Accept: "application/json" },
      signal: ctl.signal,
    });
    if (!r.ok) return null;
    return (await r.json()) as BrasilApiCnpj;
  } catch {
    return null;
  } finally {
    clearTimeout(tid);
  }
}

type ComprasFornecedor = {
  cnpj?: string;
  cpf?: string;
  nome?: string;
  razao_social?: string;
};

/** Compras.gov.br: lista fornecedores cujo nome contém o termo. Retorna CNPJ + razao social. */
async function buscarCnpjPorNomeCompras(nome: string): Promise<string | null> {
  const ctl = new AbortController();
  const tid = setTimeout(() => ctl.abort(), 12000);
  try {
    const url = `${COMPRAS}/fornecedores/v1/fornecedores.json?nome=${encodeURIComponent(nome)}`;
    const r = await fetch(url, { headers: { Accept: "application/json" }, signal: ctl.signal });
    if (!r.ok) return null;
    const data = await r.json();
    const lista = (data?._embedded?.fornecedores ?? []) as ComprasFornecedor[];
    const target = normalize(nome);
    for (const f of lista) {
      const fNome = normalize(f.nome ?? f.razao_social ?? "");
      if (!fNome) continue;
      // Match exato ou contains
      if (fNome === target || fNome.includes(target) || target.includes(fNome)) {
        if (f.cnpj && /^\d{14}$/.test(f.cnpj)) return f.cnpj;
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(tid);
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
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: { limit?: number; force?: boolean } = {};
  try { body = req.method === "POST" ? await req.json() : {}; } catch { /* ok */ }
  const limit = Math.max(1, Math.min(body.limit ?? 50, 200));
  const force = Boolean(body.force);

  const startedAt = Date.now();

  // Pega nomes distintos sem CNPJ (group by — economiza chamadas)
  let query = supabase
    .from("contratos")
    .select("empresa")
    .not("empresa", "is", null);
  if (!force) query = query.is("empresa_cnpj", null);
  const { data: rows } = await query;
  const nomesUnicos = [...new Set((rows ?? []).map((r: { empresa: string }) => r.empresa.trim()))]
    .filter(Boolean)
    .slice(0, limit);

  // Carregar lookup CNPJ por nome a partir de contrato_camara (45 CNPJs unicos)
  const { data: camaraRows } = await supabase
    .from("contrato_camara")
    .select("fornecedor_nome, fornecedor_cnpj_limpo")
    .not("fornecedor_cnpj_limpo", "is", null);
  const camaraLookup = new Map<string, string>();
  for (const r of camaraRows ?? []) {
    const k = normalize(r.fornecedor_nome);
    if (k && r.fornecedor_cnpj_limpo && /^\d{14}$/.test(r.fornecedor_cnpj_limpo)) {
      camaraLookup.set(k, r.fornecedor_cnpj_limpo);
    }
  }

  let enriquecidos = 0;
  let semMatch = 0;
  const detalhes: Array<Record<string, unknown>> = [];

  for (const nome of nomesUnicos) {
    // 1) Tenta extrair CNPJ do nome direto (raros casos onde vem no texto)
    let cnpj = extractCnpjFromText(nome);
    let fonte = "regex_nome";

    // 2) Lookup em contrato_camara (mesma empresa pode ter contratado Camara + Prefeitura)
    if (!cnpj) {
      const norm = normalize(nome);
      cnpj = camaraLookup.get(norm) ?? null;
      if (cnpj) fonte = "camara_lookup";
    }

    // 3) Compras.gov.br busca por nome (atualmente quebrado, mantido pra futuro)
    if (!cnpj) {
      cnpj = await buscarCnpjPorNomeCompras(nome);
      fonte = "compras_gov";
      await new Promise((r) => setTimeout(r, 400));
    }

    if (!cnpj) {
      semMatch++;
      detalhes.push({ nome, cnpj: null, fonte: "nenhuma" });
      continue;
    }

    // 3) BrasilAPI/CNPJ pra detalhes
    const info = await buscarBrasilApiPorCnpj(cnpj);
    await new Promise((r) => setTimeout(r, 300));

    // 4) Persistir em todos os contratos com esse nome
    const update: Record<string, unknown> = {
      empresa_cnpj: cnpj,
      empresa_razao_social: info?.razao_social ?? null,
      empresa_situacao_cadastral: info?.descricao_situacao_cadastral ?? null,
      empresa_cnae_descricao: info?.cnae_fiscal_descricao ?? null,
      empresa_data_abertura: info?.data_inicio_atividade ?? null,
      empresa_enriquecido_em: new Date().toISOString(),
    };
    const { error, count } = await supabase
      .from("contratos")
      .update(update, { count: "exact" })
      .eq("empresa", nome);
    if (error) {
      detalhes.push({ nome, cnpj, fonte, erro: error.message });
    } else {
      enriquecidos++;
      detalhes.push({ nome, cnpj, fonte, contratos_atualizados: count ?? 0 });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      duration_ms: Date.now() - startedAt,
      nomes_processados: nomesUnicos.length,
      enriquecidos,
      sem_match: semMatch,
      detalhes: detalhes.slice(0, 30),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
