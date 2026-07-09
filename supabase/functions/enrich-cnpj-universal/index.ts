// enrich-cnpj-universal — enriquece QUALQUER tabela com dados de CNPJ.
//
// Suporta:
//   - contratos                  (Prefeitura)
//   - contrato_camara            (Camara)
//   - contratos_aditivos         (aditivos)
//   - obras                      (resolve CNPJ via match em contratos primeiro)
//   - fornecedores_cnpj          (refresh cache central)
//
// Estrategia:
//   1) Cache-first: checa fornecedores_cnpj (180 dias TTL)
//   2) Se cache miss/stale: BrasilAPI + ReceitaWS em paralelo (Promise.allSettled)
//   3) Merge dual-source (BrasilAPI = primario; ReceitaWS = fallback + email/telefone/socios)
//   4) Atualiza/cria entrada em fornecedores_cnpj
//   5) Propaga para tabela alvo
//
// Special case "obras":
//   - Resolve CNPJ via JOIN com contratos.empresa por nome normalizado
//   - Se nao achar, pula (nao chama API por nome — endpoint Compras.gov.br instavel)
//
// Body: { tabela: string, limit?: number (default 50, max 200), force?: boolean }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Inline checkCentiAuth (evita dependencia de _shared no deploy via MCP)
function checkCentiAuth(req: Request): boolean {
  const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
  const INGEST = Deno.env.get("CENTI_INGEST_SECRET") ?? "";
  const cron = req.headers.get("x-cron-secret") ?? "";
  const ingest = req.headers.get("x-centi-ingest-secret") ?? "";
  const auth = req.headers.get("authorization") ?? "";
  return (
    (CRON_SECRET !== "" && cron === CRON_SECRET) ||
    (INGEST !== "" && ingest === INGEST) ||
    (SR !== "" && auth.includes(SR))
  );
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

const BRASILAPI = "https://brasilapi.com.br/api";
const RECEITAWS = "https://www.receitaws.com.br/v1";

const TABELAS_SUPORTADAS = [
  "contratos",
  "contrato_camara",
  "contratos_aditivos",
  "obras",
  "fornecedores_cnpj",
] as const;
type Tabela = typeof TABELAS_SUPORTADAS[number];

type DadosCnpj = {
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  situacao_cadastral: string | null;
  cnae_descricao: string | null;
  cnae_codigo: string | null;
  data_abertura: string | null;
  email: string | null;
  telefone: string | null;
  capital_social: number | null;
  porte: string | null;
  natureza_juridica: string | null;
  municipio: string | null;
  uf: string | null;
  socios: unknown;
  fonte: string; // brasilapi | receitaws | brasilapi+receitaws | cache
};

type BrasilApiCnpj = {
  cnpj: string;
  razao_social?: string;
  nome_fantasia?: string | null;
  descricao_situacao_cadastral?: string;
  cnae_fiscal?: string;
  cnae_fiscal_descricao?: string;
  data_inicio_atividade?: string;
  ddd_telefone_1?: string;
  email?: string | null;
  capital_social?: number;
  porte?: string;
  natureza_juridica?: string;
  municipio?: string;
  uf?: string;
};

type ReceitaWsCnpj = {
  status: "OK" | "ERROR";
  message?: string;
  nome?: string;
  fantasia?: string | null;
  situacao?: string;
  abertura?: string;
  email?: string | null;
  telefone?: string | null;
  capital_social?: string;
  porte?: string;
  natureza_juridica?: string;
  municipio?: string;
  uf?: string;
  qsa?: Array<{ nome: string; qual: string }>;
};

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

async function fetchWithTimeout(url: string, ms = 10_000): Promise<Response | null> {
  const ctl = new AbortController();
  const tid = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { headers: { Accept: "application/json" }, signal: ctl.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(tid);
  }
}

async function buscarBrasilApi(cnpj: string): Promise<BrasilApiCnpj | null> {
  const r = await fetchWithTimeout(`${BRASILAPI}/cnpj/v1/${cnpj}`);
  if (!r?.ok) return null;
  try {
    return (await r.json()) as BrasilApiCnpj;
  } catch {
    return null;
  }
}

async function buscarReceitaWS(cnpj: string): Promise<ReceitaWsCnpj | null> {
  const r = await fetchWithTimeout(`${RECEITAWS}/cnpj/${cnpj}`, 12_000);
  if (!r?.ok) return null;
  try {
    const d = (await r.json()) as ReceitaWsCnpj;
    return d.status === "OK" ? d : null;
  } catch {
    return null;
  }
}

function parseBrDate(s?: string): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

function parseNumber(s?: string | number | null): number | null {
  if (s == null) return null;
  if (typeof s === "number") return Number.isFinite(s) ? s : null;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function mergeDualSource(
  cnpj: string,
  brasil: BrasilApiCnpj | null,
  receita: ReceitaWsCnpj | null,
): DadosCnpj | null {
  if (!brasil && !receita) return null;
  const fonte = brasil && receita ? "brasilapi+receitaws" : brasil ? "brasilapi" : "receitaws";

  return {
    cnpj,
    razao_social: brasil?.razao_social ?? receita?.nome ?? null,
    nome_fantasia: brasil?.nome_fantasia ?? receita?.fantasia ?? null,
    situacao_cadastral: brasil?.descricao_situacao_cadastral ?? receita?.situacao ?? null,
    cnae_descricao: brasil?.cnae_fiscal_descricao ?? null,
    cnae_codigo: brasil?.cnae_fiscal ?? null,
    data_abertura: brasil?.data_inicio_atividade ?? parseBrDate(receita?.abertura) ?? null,
    email: brasil?.email ?? receita?.email ?? null,
    telefone: brasil?.ddd_telefone_1 ?? receita?.telefone ?? null,
    capital_social: brasil?.capital_social ?? parseNumber(receita?.capital_social) ?? null,
    porte: brasil?.porte ?? receita?.porte ?? null,
    natureza_juridica: brasil?.natureza_juridica ?? receita?.natureza_juridica ?? null,
    municipio: brasil?.municipio ?? receita?.municipio ?? null,
    uf: brasil?.uf ?? receita?.uf ?? null,
    socios: receita?.qsa ?? null,
    fonte,
  };
}

async function consultarCnpj(
  supabase: ReturnType<typeof createClient>,
  cnpj: string,
  force = false,
): Promise<DadosCnpj | null> {
  // 1) Cache check (180 dias TTL)
  if (!force) {
    const { data: cache } = await supabase
      .from("fornecedores_cnpj")
      .select("*")
      .eq("cnpj", cnpj)
      .gt("consultado_em", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
      .single();
    if (cache) {
      return {
        cnpj,
        razao_social: cache.razao_social,
        nome_fantasia: cache.nome_fantasia,
        situacao_cadastral: cache.situacao_cadastral,
        cnae_descricao: cache.cnae_descricao,
        cnae_codigo: cache.cnae_principal,
        data_abertura: cache.data_abertura,
        email: cache.email,
        telefone: cache.telefone,
        capital_social: cache.capital_social,
        porte: cache.porte,
        natureza_juridica: cache.natureza_juridica,
        municipio: cache.municipio,
        uf: cache.uf,
        socios: cache.socios,
        fonte: "cache",
      };
    }
  }

  // 2) Dual-source paralelo
  const [brasilR, receitaR] = await Promise.allSettled([
    buscarBrasilApi(cnpj),
    buscarReceitaWS(cnpj),
  ]);
  const brasil = brasilR.status === "fulfilled" ? brasilR.value : null;
  const receita = receitaR.status === "fulfilled" ? receitaR.value : null;
  const merged = mergeDualSource(cnpj, brasil, receita);
  if (!merged) return null;

  // 3) Upsert no cache central
  await supabase.from("fornecedores_cnpj").upsert(
    {
      cnpj,
      razao_social: merged.razao_social,
      nome_fantasia: merged.nome_fantasia,
      situacao_cadastral: merged.situacao_cadastral,
      cnae_principal: merged.cnae_codigo,
      cnae_descricao: merged.cnae_descricao,
      data_abertura: merged.data_abertura,
      email: merged.email,
      telefone: merged.telefone,
      capital_social: merged.capital_social,
      porte: merged.porte,
      natureza_juridica: merged.natureza_juridica,
      municipio: merged.municipio,
      uf: merged.uf,
      socios: merged.socios,
      consultado_em: new Date().toISOString(),
    },
    { onConflict: "cnpj" },
  );

  return merged;
}

// Monta UPDATE generico para qualquer tabela alvo
function buildUpdate(dados: DadosCnpj): Record<string, unknown> {
  return {
    empresa_razao_social: dados.razao_social,
    empresa_situacao_cadastral: dados.situacao_cadastral,
    empresa_cnae_descricao: dados.cnae_descricao,
    empresa_data_abertura: dados.data_abertura,
    empresa_email: dados.email,
    empresa_telefone: dados.telefone,
    empresa_capital_social: dados.capital_social,
    empresa_porte: dados.porte,
    empresa_natureza_juridica: dados.natureza_juridica,
    empresa_municipio: dados.municipio,
    empresa_uf: dados.uf,
    empresa_enriquecido_em: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!checkCentiAuth(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: { tabela?: string; limit?: number; force?: boolean } = {};
  try {
    body = req.method === "POST" ? await req.json() : {};
  } catch { /* ok */ }

  const tabela = body.tabela as Tabela;
  const limit = Math.max(1, Math.min(body.limit ?? 50, 200));
  const force = Boolean(body.force);

  if (!TABELAS_SUPORTADAS.includes(tabela)) {
    return new Response(
      JSON.stringify({
        error: `tabela invalida. Use: ${TABELAS_SUPORTADAS.join(", ")}`,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const startedAt = Date.now();
  let processados = 0;
  let enriquecidos = 0;
  let cache_hits = 0;
  let sem_match = 0;
  const detalhes: Array<Record<string, unknown>> = [];

  // ===================== contrato_camara =====================
  if (tabela === "contrato_camara") {
    let q = supabase
      .from("contrato_camara")
      .select("id, fornecedor_cnpj_limpo, fornecedor_nome")
      .not("fornecedor_cnpj_limpo", "is", null)
      .limit(limit);
    if (!force) q = q.is("empresa_enriquecido_em", null);
    const { data: rows } = await q;

    for (const row of rows ?? []) {
      processados++;
      const cnpj = row.fornecedor_cnpj_limpo;
      if (!cnpj || !/^\d{14}$/.test(cnpj)) {
        sem_match++;
        continue;
      }

      const dados = await consultarCnpj(supabase, cnpj, force);
      if (!dados) {
        sem_match++;
        detalhes.push({ id: row.id, cnpj, status: "api_falhou" });
        continue;
      }
      if (dados.fonte === "cache") cache_hits++;

      const { error } = await supabase
        .from("contrato_camara")
        .update(buildUpdate(dados))
        .eq("id", row.id);
      if (!error) enriquecidos++;
      detalhes.push({
        id: row.id,
        cnpj,
        razao: dados.razao_social,
        situacao: dados.situacao_cadastral,
        fonte: dados.fonte,
      });

      if (dados.fonte !== "cache") {
        await new Promise((r) => setTimeout(r, 350));
      }
    }
  }

  // ===================== contratos_aditivos =====================
  if (tabela === "contratos_aditivos") {
    let q = supabase
      .from("contratos_aditivos")
      .select("id, cnpj")
      .not("cnpj", "is", null)
      .limit(limit);
    if (!force) q = q.is("empresa_enriquecido_em", null);
    const { data: rows } = await q;

    for (const row of rows ?? []) {
      processados++;
      const cnpj = String(row.cnpj).replace(/\D/g, "");
      if (cnpj.length !== 14) {
        sem_match++;
        continue;
      }

      const dados = await consultarCnpj(supabase, cnpj, force);
      if (!dados) {
        sem_match++;
        continue;
      }
      if (dados.fonte === "cache") cache_hits++;

      const { error } = await supabase
        .from("contratos_aditivos")
        .update(buildUpdate(dados))
        .eq("id", row.id);
      if (!error) enriquecidos++;
      detalhes.push({
        id: row.id,
        cnpj,
        razao: dados.razao_social,
        situacao: dados.situacao_cadastral,
        fonte: dados.fonte,
      });

      if (dados.fonte !== "cache") {
        await new Promise((r) => setTimeout(r, 350));
      }
    }
  }

  // ===================== contratos (Prefeitura) =====================
  if (tabela === "contratos") {
    // Pega nomes unicos sem enriquecimento ou sem CNPJ
    let q = supabase.from("contratos").select("empresa, empresa_cnpj_digitos").not("empresa", "is", null);
    if (!force) q = q.or("empresa_cnpj.is.null,empresa_enriquecido_em.is.null");
    const { data: rows } = await q;
    // CNPJ ja gravado no proprio contrato (backfill do portal) = fonte primaria de resolucao,
    // antes de qualquer lookup por nome. Antes a funcao ignorava esse campo.
    const ownCnpjByNome = new Map<string, string>();
    for (const r of (rows ?? []) as { empresa: string; empresa_cnpj_digitos: string | null }[]) {
      const nm = r.empresa?.trim();
      const cd = r.empresa_cnpj_digitos;
      if (nm && cd && /^\d{14}$/.test(cd) && !ownCnpjByNome.has(nm)) ownCnpjByNome.set(nm, cd);
    }
    const todosNomes = [...new Set((rows ?? []).map((r: { empresa: string }) => r.empresa.trim()))].filter(Boolean);
    // prioriza quem ja tem CNPJ resolvivel, pra o lote nao ser desperdicado em contratos sem CNPJ
    const nomesUnicos = todosNomes
      .sort((a, b) => (ownCnpjByNome.has(b) ? 1 : 0) - (ownCnpjByNome.has(a) ? 1 : 0))
      .slice(0, limit);

    // Lookup combinado: fornecedores_cnpj (cache) + contrato_camara
    const camaraLookup = new Map<string, string>();

    const { data: cacheRows } = await supabase
      .from("fornecedores_cnpj")
      .select("cnpj, razao_social, nome_fantasia")
      .not("razao_social", "is", null);
    for (const r of cacheRows ?? []) {
      if (!r.cnpj) continue;
      if (r.razao_social) {
        const k1 = normalize(r.razao_social);
        if (k1) camaraLookup.set(k1, r.cnpj);
      }
      if (r.nome_fantasia) {
        const k2 = normalize(r.nome_fantasia);
        if (k2 && !camaraLookup.has(k2)) camaraLookup.set(k2, r.cnpj);
      }
    }

    const { data: camaraRows } = await supabase
      .from("contrato_camara")
      .select("fornecedor_nome, fornecedor_cnpj_limpo")
      .not("fornecedor_cnpj_limpo", "is", null);
    for (const r of camaraRows ?? []) {
      const k = normalize(r.fornecedor_nome);
      if (k && r.fornecedor_cnpj_limpo && /^\d{14}$/.test(r.fornecedor_cnpj_limpo)) {
        if (!camaraLookup.has(k)) camaraLookup.set(k, r.fornecedor_cnpj_limpo);
      }
    }

    // Match relaxado (ignora sufixos LTDA/EIRELI/SA/ME/EPP)
    function stripSuffixContratos(s: string): string {
      let prev = "";
      let cur = s;
      while (prev !== cur) {
        prev = cur;
        cur = cur
          .replace(/\b(LTDA|EIRELI|S\s*A|S\s*\/\s*A|ME|EPP|MEI|EI)\b\.?\s*$/i, "")
          .replace(/[-]\s*$/, "")
          .replace(/\s+/g, " ")
          .trim();
      }
      return cur;
    }
    const camaraRelaxed = new Map<string, string>();
    for (const [k, v] of camaraLookup) {
      camaraRelaxed.set(stripSuffixContratos(k), v);
    }

    for (const nome of nomesUnicos) {
      processados++;
      // 0) CNPJ ja gravado no proprio contrato (backfill do portal, fonte oficial)
      let cnpj = ownCnpjByNome.get(nome) ?? null;
      let fonteMatch = "cnpj_do_contrato";
      // 1) CNPJ no texto
      if (!cnpj) { cnpj = extractCnpjFromText(nome); if (cnpj) fonteMatch = "regex_nome"; }
      // 2) Lookup exato (cache + camara)
      if (!cnpj) {
        cnpj = camaraLookup.get(normalize(nome)) ?? null;
        if (cnpj) fonteMatch = "lookup_exato";
      }
      // 3) Lookup relaxado
      if (!cnpj) {
        cnpj = camaraRelaxed.get(stripSuffixContratos(normalize(nome))) ?? null;
        if (cnpj) fonteMatch = "lookup_relaxado";
      }
      if (!cnpj) {
        sem_match++;
        continue;
      }

      const dados = await consultarCnpj(supabase, cnpj, force);
      if (!dados) {
        sem_match++;
        continue;
      }
      if (dados.fonte === "cache") cache_hits++;

      const { error, count } = await supabase
        .from("contratos")
        .update({ empresa_cnpj: cnpj, ...buildUpdate(dados) }, { count: "exact" })
        .eq("empresa", nome);
      if (!error) enriquecidos += count ?? 0;
      detalhes.push({
        nome,
        cnpj,
        fonte_match: fonteMatch,
        fonte_dados: dados.fonte,
        razao: dados.razao_social,
        situacao: dados.situacao_cadastral,
        rows_atualizadas: count ?? 0,
      });

      if (dados.fonte !== "cache") {
        await new Promise((r) => setTimeout(r, 350));
      }
    }
  }

  // ===================== obras =====================
  if (tabela === "obras") {
    let q = supabase.from("obras").select("id, empresa");
    if (!force) q = q.is("empresa_enriquecido_em", null);
    const { data: rows } = await q.limit(limit);

    // Lookup em fornecedores_cnpj (cache central — 103 entradas com razao_social)
    const { data: cacheRows } = await supabase
      .from("fornecedores_cnpj")
      .select("cnpj, razao_social, nome_fantasia")
      .not("razao_social", "is", null);
    const contratoLookup = new Map<string, string>();
    for (const r of cacheRows ?? []) {
      if (!r.cnpj) continue;
      if (r.razao_social) {
        const k1 = normalize(r.razao_social);
        if (k1) contratoLookup.set(k1, r.cnpj);
      }
      if (r.nome_fantasia) {
        const k2 = normalize(r.nome_fantasia);
        if (k2 && !contratoLookup.has(k2)) contratoLookup.set(k2, r.cnpj);
      }
    }

    // Lookup em contratos por nome (Prefeitura ja enriquecidos)
    const { data: contratosRows } = await supabase
      .from("contratos")
      .select("empresa, empresa_cnpj")
      .not("empresa_cnpj", "is", null);
    for (const r of contratosRows ?? []) {
      const k = normalize(r.empresa ?? "");
      if (k && r.empresa_cnpj && !contratoLookup.has(k)) {
        contratoLookup.set(k, r.empresa_cnpj);
      }
    }
    // Lookup em contrato_camara por nome
    const { data: camaraRows } = await supabase
      .from("contrato_camara")
      .select("fornecedor_nome, fornecedor_cnpj_limpo")
      .not("fornecedor_cnpj_limpo", "is", null);
    for (const r of camaraRows ?? []) {
      const k = normalize(r.fornecedor_nome ?? "");
      if (k && r.fornecedor_cnpj_limpo && !contratoLookup.has(k)) {
        contratoLookup.set(k, r.fornecedor_cnpj_limpo);
      }
    }

    // Match relaxado: remove sufixos comuns repetidamente (LTDA, EIRELI, S.A., ME, EPP)
    // Ex: "BRASIL ILUMINACAO EIRELI ME" → "BRASIL ILUMINACAO"
    function stripSuffix(s: string): string {
      let prev = "";
      let cur = s;
      while (prev !== cur) {
        prev = cur;
        cur = cur
          .replace(/\b(LTDA|EIRELI|S\s*A|S\s*\/\s*A|ME|EPP|MEI|EI)\b\.?\s*$/i, "")
          .replace(/[-]\s*$/, "")
          .replace(/\s+/g, " ")
          .trim();
      }
      return cur;
    }
    const relaxedLookup = new Map<string, string>();
    for (const [k, v] of contratoLookup) {
      relaxedLookup.set(stripSuffix(k), v);
    }

    for (const row of rows ?? []) {
      processados++;
      if (!row.empresa) {
        sem_match++;
        continue;
      }
      // 1) CNPJ no texto
      let cnpj = extractCnpjFromText(row.empresa);
      let fonteMatch = "regex_nome";
      // 2) Lookup exato em fornecedores_cnpj + contratos + camara
      if (!cnpj) {
        const k = normalize(row.empresa);
        cnpj = contratoLookup.get(k) ?? null;
        if (cnpj) fonteMatch = "lookup_exato";
      }
      // 3) Lookup relaxado (ignora LTDA/EIRELI/SA/ME/EPP)
      if (!cnpj) {
        const k = stripSuffix(normalize(row.empresa));
        cnpj = relaxedLookup.get(k) ?? null;
        if (cnpj) fonteMatch = "lookup_relaxado";
      }
      if (!cnpj) {
        sem_match++;
        detalhes.push({ id: row.id, empresa: row.empresa, status: "sem_cnpj" });
        continue;
      }

      const dados = await consultarCnpj(supabase, cnpj, force);
      if (!dados) {
        sem_match++;
        continue;
      }
      if (dados.fonte === "cache") cache_hits++;

      const { error } = await supabase
        .from("obras")
        .update({ empresa_cnpj: cnpj, ...buildUpdate(dados) })
        .eq("id", row.id);
      if (!error) enriquecidos++;
      detalhes.push({
        id: row.id,
        cnpj,
        fonte_match: fonteMatch,
        fonte_dados: dados.fonte,
        razao: dados.razao_social,
        situacao: dados.situacao_cadastral,
      });

      if (dados.fonte !== "cache") {
        await new Promise((r) => setTimeout(r, 350));
      }
    }
  }

  // ===================== fornecedores_cnpj (refresh cache) =====================
  if (tabela === "fornecedores_cnpj") {
    let q = supabase.from("fornecedores_cnpj").select("cnpj, consultado_em");
    if (!force) {
      const corte = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
      q = q.lt("consultado_em", corte);
    }
    const { data: rows } = await q.limit(limit);

    for (const row of rows ?? []) {
      processados++;
      const dados = await consultarCnpj(supabase, row.cnpj, true);
      if (!dados) {
        sem_match++;
        continue;
      }
      enriquecidos++;
      detalhes.push({
        cnpj: row.cnpj,
        razao: dados.razao_social,
        situacao: dados.situacao_cadastral,
        fonte: dados.fonte,
      });
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      tabela,
      duration_ms: Date.now() - startedAt,
      processados,
      enriquecidos,
      cache_hits,
      sem_match,
      detalhes: detalhes.slice(0, 30),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
