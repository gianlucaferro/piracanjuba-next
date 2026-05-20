// Sync CEIS + CNEP do Portal da Transparencia Federal.
// Secret necessario: PORTAL_TRANSPARENCIA_TOKEN
// (gere gratuitamente em https://api.portaldatransparencia.gov.br/swagger-ui.html)
//
// Estrategia: percorre paginas dos endpoints /ceis e /cnep, salvando
// todas as sancoes ativas. O cruzamento com contratos municipais e feito
// via JOIN cnpj_digitos = digitos do CNPJ do contrato (na hora de consultar).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkCentiAuth } from "../_shared/centi-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

const PORTAL_BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";

type CeisItem = {
  id: number;
  dataInicioSancao?: string;
  dataFimSancao?: string;
  dataPublicacaoSancao?: string;
  tipoSancao?: { descricaoResumida?: string; descricaoPortal?: string };
  fundamentacao?: Array<{ descricao?: string }>;
  orgaoSancionador?: { nome?: string; siglaUf?: string };
  sancionado?: { nome?: string; codigoFormatado?: string; tipoPessoa?: "F" | "J" };
};

type CnepItem = CeisItem & { valorMulta?: number | string };

async function fetchPagina(
  token: string,
  endpoint: "ceis" | "cnep",
  pagina: number,
): Promise<(CeisItem | CnepItem)[]> {
  const url = `${PORTAL_BASE}/${endpoint}?pagina=${pagina}`;
  const resp = await fetch(url, {
    headers: { "chave-api-dados": token, Accept: "application/json" },
  });
  if (!resp.ok) {
    if (resp.status === 429) {
      // rate-limit; espera 5s e retorna vazio pra interromper o loop
      await new Promise((r) => setTimeout(r, 5000));
      return [];
    }
    throw new Error(`PortalTransparencia ${endpoint} p${pagina} ${resp.status}`);
  }
  return (await resp.json()) as (CeisItem | CnepItem)[];
}

/**
 * Numero brasileiro -> Number. "3.633.606,84" -> 3633606.84, "0,00" -> 0, "" -> null.
 */
function parseNumeroBR(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const trimmed = String(v).trim();
  if (!trimmed) return null;
  // Remove pontos de milhar e troca virgula decimal por ponto
  const limpo = trimmed.replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normaliza datas vindas do Portal da Transparencia:
 * - "31/12/2026" (DD/MM/YYYY) -> "2026-12-31"
 * - "Sem informacao" / "" / null -> null
 * - Datas com ano absurdo (>9999) -> null (proteção contra "31/12/9999" sentinela)
 */
function parseDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const trimmed = String(s).trim();
  if (!trimmed) return null;
  // Rejeita placeholders nao-data
  if (/sem\s+informa|n\/?a|nao\s+inform/i.test(trimmed)) return null;
  // DD/MM/YYYY
  const m = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const ano = Number(m[3]);
    if (ano < 1900 || ano > 2200) return null;
    return `${m[3]}-${m[2]}-${m[1]}`;
  }
  // Ja em YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  return null;
}

function normRow(
  item: CeisItem | CnepItem,
  cadastro: "CEIS" | "CNEP",
): Record<string, unknown> | null {
  const cnpj = item.sancionado?.codigoFormatado ?? "";
  const nome = item.sancionado?.nome ?? "";
  if (!cnpj || !nome) return null;
  // Pula sancao de pessoa fisica
  if (item.sancionado?.tipoPessoa === "F") return null;
  return {
    cnpj,
    nome,
    cadastro,
    tipo_sancao:
      item.tipoSancao?.descricaoPortal ?? item.tipoSancao?.descricaoResumida ?? null,
    data_inicio_sancao: parseDate(item.dataInicioSancao),
    data_fim_sancao: parseDate(item.dataFimSancao),
    orgao_sancionador: item.orgaoSancionador?.nome ?? null,
    fundamentacao:
      item.fundamentacao?.map((f) => f.descricao).filter(Boolean).join("; ") || null,
    valor_multa: parseNumeroBR((item as CnepItem).valorMulta ?? null),
    id_externo: String(item.id),
    raw_payload: item as Record<string, unknown>,
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
  const TOKEN = Deno.env.get("PORTAL_TRANSPARENCIA_TOKEN");

  if (!TOKEN) {
    return new Response(
      JSON.stringify({
        error: "Secret PORTAL_TRANSPARENCIA_TOKEN ausente.",
        cadastro:
          "Cadastre em https://api.portaldatransparencia.gov.br/swagger-ui.html e adicione o token via supabase secrets set",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: { maxPaginas?: number; cadastros?: Array<"CEIS" | "CNEP"> } = {};
  try {
    body = req.method === "POST" ? await req.json() : {};
  } catch {
    // body vazio ok
  }
  const maxPaginas = Math.max(1, Math.min(body.maxPaginas ?? 10, 50));
  const cadastros = body.cadastros ?? (["CEIS", "CNEP"] as const);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const startedAt = Date.now();
  let totalInseridos = 0;
  const detalhes: Array<Record<string, unknown>> = [];

  for (const cadastro of cadastros) {
    let pagina = 1;
    let vaziaConsecutiva = 0;
    while (pagina <= maxPaginas && vaziaConsecutiva < 2) {
      const items = await fetchPagina(TOKEN, cadastro.toLowerCase() as "ceis" | "cnep", pagina);
      if (items.length === 0) {
        vaziaConsecutiva++;
        pagina++;
        continue;
      }
      vaziaConsecutiva = 0;
      const rows = items
        .map((i) => normRow(i, cadastro))
        .filter((r): r is Record<string, unknown> => r !== null);
      if (rows.length > 0) {
        const { error } = await supabase
          .from("empresa_sancionada")
          .upsert(rows, { onConflict: "cadastro,id_externo", ignoreDuplicates: false });
        if (!error) totalInseridos += rows.length;
        detalhes.push({ cadastro, pagina, recebidos: items.length, salvos: rows.length, erro: error?.message });
      }
      pagina++;
      // Respeita rate-limit ~30 req/min
      await new Promise((r) => setTimeout(r, 2200));
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      duration_ms: Date.now() - startedAt,
      total_upserts: totalInseridos,
      detalhes: detalhes.slice(-30),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
