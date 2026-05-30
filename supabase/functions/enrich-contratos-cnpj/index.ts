// enrich-contratos-cnpj — popula CNPJ + dados cadastrais nos contratos
// da Prefeitura (originalmente so com nome de empresa).
//
// Estrategia dual-source:
//   1) Se texto do nome contem CNPJ valido -> usa diretamente
//   2) Se contrato_camara ja tem CNPJ pra mesmo nome -> propaga (lookup local)
//   3) Compras.gov.br por nome (estava quebrado, mantido como fallback)
//
// Enriquecimento: BrasilAPI (primario) + ReceitaWS (fallback com mais campos)
//   BrasilAPI: CNAE descricao, codigo IBGE municipio, regime tributario
//   ReceitaWS: email, telefone, capital_social, simples, QSA (socios)
//
// Colunas de destino em contratos:
//   empresa_cnpj, empresa_razao_social, empresa_situacao_cadastral,
//   empresa_cnae_descricao, empresa_data_abertura, empresa_enriquecido_em,
//   + novos campos via ReceitaWS: empresa_email, empresa_telefone

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkCentiAuth } from "../_shared/centi-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

const BRASILAPI = "https://brasilapi.com.br/api";
const RECEITAWS = "https://www.receitaws.com.br/v1";
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

function extractCnpjFromText(s: string): string | null {
  const m = s.match(/(\d{2})\D?(\d{3})\D?(\d{3})\D?(\d{4})\D?(\d{2})/);
  if (!m) return null;
  return `${m[1]}${m[2]}${m[3]}${m[4]}${m[5]}`;
}

type BrasilApiCnpj = {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string | null;
  descricao_situacao_cadastral?: string;
  cnae_fiscal_descricao?: string;
  data_inicio_atividade?: string;
  ddd_telefone_1?: string;
  email?: string | null;
};

type ReceitaWsCnpj = {
  status: "OK" | "ERROR";
  nome?: string;
  fantasia?: string | null;
  situacao?: string;
  abertura?: string;
  email?: string | null;
  telefone?: string | null;
  capital_social?: string;
  simples?: { optante: boolean } | null;
};

async function fetchWithTimeout(url: string, ms = 10_000): Promise<Response | null> {
  const ctl = new AbortController();
  const tid = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: ctl.signal,
    });
    return r;
  } catch {
    return null;
  } finally {
    clearTimeout(tid);
  }
}

async function buscarBrasilApi(cnpj: string): Promise<BrasilApiCnpj | null> {
  const r = await fetchWithTimeout(`${BRASILAPI}/cnpj/v1/${cnpj}`);
  if (!r?.ok) return null;
  try { return (await r.json()) as BrasilApiCnpj; } catch { return null; }
}

async function buscarReceitaWS(cnpj: string): Promise<ReceitaWsCnpj | null> {
  const r = await fetchWithTimeout(`${RECEITAWS}/cnpj/${cnpj}`, 12_000);
  if (!r?.ok) return null;
  try {
    const d = await r.json() as ReceitaWsCnpj;
    return d.status === "OK" ? d : null;
  } catch { return null; }
}

/** Compras.gov.br por nome — mantido como fallback (endpoint instável). */
async function buscarCnpjPorNomeCompras(nome: string): Promise<string | null> {
  const r = await fetchWithTimeout(
    `${COMPRAS}/fornecedores/v1/fornecedores.json?nome=${encodeURIComponent(nome)}`,
    12_000,
  );
  if (!r?.ok) return null;
  try {
    const data = await r.json();
    const lista = (data?._embedded?.fornecedores ?? []) as Array<{ cnpj?: string; nome?: string; razao_social?: string }>;
    const target = normalize(nome);
    for (const f of lista) {
      const fNome = normalize(f.nome ?? f.razao_social ?? "");
      if (fNome && (fNome === target || fNome.includes(target) || target.includes(fNome))) {
        if (f.cnpj && /^\d{14}$/.test(f.cnpj)) return f.cnpj;
      }
    }
  } catch { /* ok */ }
  return null;
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

  // Pega nomes distintos sem CNPJ
  let query = supabase.from("contratos").select("empresa").not("empresa", "is", null);
  if (!force) query = query.is("empresa_cnpj", null);
  const { data: rows } = await query;
  const nomesUnicos = [...new Set((rows ?? []).map((r: { empresa: string }) => r.empresa.trim()))]
    .filter(Boolean)
    .slice(0, limit);

  // Lookup CNPJ de contrato_camara (sobreposicao de fornecedores)
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
    // 1. CNPJ no texto
    let cnpj = extractCnpjFromText(nome);
    let fonteMatch = "regex_nome";

    // 2. Lookup câmara
    if (!cnpj) {
      cnpj = camaraLookup.get(normalize(nome)) ?? null;
      if (cnpj) fonteMatch = "camara_lookup";
    }

    // 3. Compras.gov.br
    if (!cnpj) {
      cnpj = await buscarCnpjPorNomeCompras(nome);
      if (cnpj) fonteMatch = "compras_gov";
      await new Promise((r) => setTimeout(r, 400));
    }

    if (!cnpj) {
      semMatch++;
      detalhes.push({ nome, cnpj: null, fonte: "nenhuma" });
      continue;
    }

    // 4. Enriquecimento dual-source
    let razao_social: string | null = null;
    let situacao: string | null = null;
    let cnae: string | null = null;
    let data_abertura: string | null = null;
    let email: string | null = null;
    let telefone: string | null = null;
    let fonteEnrich = "nenhuma";

    // Primário: BrasilAPI
    const brasilData = await buscarBrasilApi(cnpj);
    await new Promise((r) => setTimeout(r, 300));

    if (brasilData) {
      razao_social = brasilData.razao_social ?? null;
      situacao = brasilData.descricao_situacao_cadastral ?? null;
      cnae = brasilData.cnae_fiscal_descricao ?? null;
      data_abertura = brasilData.data_inicio_atividade ?? null;
      email = brasilData.email ?? null;
      fonteEnrich = "brasilapi";
    }

    // Fallback / complemento: ReceitaWS (tem email, telefone, simples, socios)
    if (!brasilData || !email || !telefone) {
      const receitaData = await buscarReceitaWS(cnpj);
      await new Promise((r) => setTimeout(r, 400));
      if (receitaData) {
        razao_social = razao_social ?? receitaData.nome ?? null;
        situacao = situacao ?? receitaData.situacao ?? null;
        // ReceitaWS usa "DD/MM/YYYY" — converter pra ISO
        if (!data_abertura && receitaData.abertura) {
          const m = receitaData.abertura.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
          if (m) data_abertura = `${m[3]}-${m[2]}-${m[1]}`;
        }
        email = email ?? receitaData.email ?? null;
        telefone = telefone ?? receitaData.telefone ?? null;
        fonteEnrich = brasilData ? "brasilapi+receitaws" : "receitaws";
      }
    }

    // 5. Persistir em todos os contratos com esse nome
    const update: Record<string, unknown> = {
      empresa_cnpj: cnpj,
      empresa_razao_social: razao_social,
      empresa_situacao_cadastral: situacao,
      empresa_cnae_descricao: cnae,
      empresa_data_abertura: data_abertura,
      empresa_enriquecido_em: new Date().toISOString(),
    };

    // Adicionar email/telefone se colunas existirem (podem nao existir ainda)
    // Usamos update sem errar se coluna nao existe
    if (email) update.empresa_email = email;
    if (telefone) update.empresa_telefone = telefone;

    const { error, count } = await supabase
      .from("contratos")
      .update(update, { count: "exact" })
      .eq("empresa", nome);

    if (error) {
      // Se colunas email/telefone nao existem, retry sem elas
      if ((error.message ?? "").includes("column")) {
        const { error: e2 } = await supabase
          .from("contratos")
          .update({
            empresa_cnpj: cnpj,
            empresa_razao_social: razao_social,
            empresa_situacao_cadastral: situacao,
            empresa_cnae_descricao: cnae,
            empresa_data_abertura: data_abertura,
            empresa_enriquecido_em: new Date().toISOString(),
          })
          .eq("empresa", nome);
        if (e2) {
          detalhes.push({ nome, cnpj, fonte: fonteEnrich, erro: e2.message });
          continue;
        }
      } else {
        detalhes.push({ nome, cnpj, fonte: fonteEnrich, erro: error.message });
        continue;
      }
    }

    enriquecidos++;
    detalhes.push({
      nome,
      cnpj,
      fonte_match: fonteMatch,
      fonte_enrich: fonteEnrich,
      contratos_atualizados: count ?? 0,
      email: email ? "✓" : null,
      telefone: telefone ? "✓" : null,
    });
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
