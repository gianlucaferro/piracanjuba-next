import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Prestação de contas (indicadores fiscais) da Prefeitura e da Câmara de Piracanjuba,
// direto do SICONFI / Tesouro Nacional:
//  - RGF Anexo 01: despesa total com pessoal (DTP) vs limites da LRF (máximo, prudencial, alerta).
//    Filada por poder (Executivo limite 54% da RCL; Legislativo 6%).
//  - RREO Anexo 01 (Balanço Orçamentário): receita prevista vs realizada e despesa
//    dotação/empenhada/liquidada/paga. É filado no nível do ente (consolidado no Executivo).
const ENTE = "5217203"; // Piracanjuba-GO (código IBGE)
const BASE = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt";

async function fetchSiconfi(url: string): Promise<unknown[]> {
  const resp = await fetch(url, { headers: { "User-Agent": "piracanjuba.ai/1.0" } });
  if (!resp.ok) return [];
  const data = await resp.json().catch(() => ({}));
  return Array.isArray((data as { items?: unknown[] })?.items) ? (data as { items: unknown[] }).items : [];
}

type Row = Record<string, unknown>;
function pick(items: unknown[], cod: string, colMatch: (c: string) => boolean): number | null {
  for (const raw of items) {
    const it = raw as Row;
    if (String(it?.cod_conta ?? "") !== cod) continue;
    const col = String(it?.coluna ?? "");
    if (colMatch(col)) {
      const v = Number(it?.valor);
      return Number.isFinite(v) ? v : null;
    }
  }
  return null;
}

const isValor = (c: string) => c.trim().toLowerCase() === "valor";
const isPctRcl = (c: string) => c.toLowerCase().includes("% sobre a rcl");

function extractRGF(items: unknown[]) {
  const dtp = pick(items, "DespesaComPessoalTotal", isValor);
  const rcl = pick(items, "ReceitaCorrenteLiquidaAjustada", isValor);
  if (dtp == null || rcl == null) return null;
  return {
    rcl,
    dtp,
    dtp_pct: pick(items, "DespesaComPessoalTotal", isPctRcl),
    limite_max: pick(items, "LimiteMaximoDespesaComPessoalTotal", isValor),
    limite_max_pct: pick(items, "LimiteMaximoDespesaComPessoalTotal", isPctRcl),
    limite_prudencial: pick(items, "LimitePrudencialDespesaComPessoalTotal", isValor),
    limite_prudencial_pct: pick(items, "LimitePrudencialDespesaComPessoalTotal", isPctRcl),
    limite_alerta: pick(items, "LimiteDeAlertaDespesaComPessoalTotal", isValor),
    limite_alerta_pct: pick(items, "LimiteDeAlertaDespesaComPessoalTotal", isPctRcl),
  };
}

function extractRREO(items: unknown[]) {
  const up = (s: string) => (c: string) => c.toUpperCase().includes(s);
  const receita_realizada = pick(items, "TotalReceitas", (c) => c.includes("Até o Bimestre") && !c.includes("%"));
  const despesa_liquidada = pick(items, "TotalDespesas", up("LIQUIDADAS ATÉ"));
  if (receita_realizada == null && despesa_liquidada == null) return null;
  return {
    receita_prevista: pick(items, "TotalReceitas", up("PREVISÃO ATUALIZADA")),
    receita_realizada,
    despesa_dotacao: pick(items, "TotalDespesas", up("DOTAÇÃO ATUALIZADA")),
    despesa_empenhada: pick(items, "TotalDespesas", up("EMPENHADAS ATÉ")),
    despesa_liquidada,
    despesa_paga: pick(items, "TotalDespesas", up("PAGAS ATÉ")),
  };
}

async function getRGF(ano: number, poder: "E" | "L") {
  // Tenta quadrimestral (3,2,1); se nada, semestral (2,1).
  const tentativas: Array<[string, number]> = [["Q", 3], ["Q", 2], ["Q", 1], ["S", 2], ["S", 1]];
  for (const [periodicidade, nr] of tentativas) {
    const url = `${BASE}/rgf?an_exercicio=${ano}&in_periodicidade=${periodicidade}&nr_periodo=${nr}&co_tipo_demonstrativo=RGF&no_anexo=${encodeURIComponent("RGF-Anexo 01")}&co_poder=${poder}&id_ente=${ENTE}`;
    const items = await fetchSiconfi(url);
    if (!items.length) continue;
    const ext = extractRGF(items);
    if (ext) return { ext, periodo: nr, url };
  }
  return null;
}

async function getRREO(ano: number) {
  for (const nr of [6, 5, 4, 3, 2, 1]) {
    const url = `${BASE}/rreo?an_exercicio=${ano}&nr_periodo=${nr}&co_tipo_demonstrativo=RREO&no_anexo=${encodeURIComponent("RREO-Anexo 01")}&id_ente=${ENTE}`;
    const items = await fetchSiconfi(url);
    if (!items.length) continue;
    const ext = extractRREO(items);
    if (ext) return { ext, periodo: nr, url };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = { ...corsHeaders, "Content-Type": "application/json" };
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "prestacao-contas", status: "running", detalhes: {} })
    .select("id").single();
  const logId = log?.id;

  const currentYear = new Date().getFullYear();
  const errors: string[] = [];
  let upserts = 0;

  try {
    for (const [poder, codPoder] of [["executivo", "E"], ["legislativo", "L"]] as const) {
      for (let ano = 2021; ano <= currentYear; ano++) {
        try {
          const rgf = await getRGF(ano, codPoder);
          // RREO balanço orçamentário é do ente (consolidado); guardamos no executivo.
          const rreo = poder === "executivo" ? await getRREO(ano) : null;
          if (!rgf && !rreo) continue;

          const row: Record<string, unknown> = {
            poder,
            ano,
            updated_at: new Date().toISOString(),
          };
          if (rgf) {
            Object.assign(row, rgf.ext, { periodo_rgf: rgf.periodo, fonte_rgf_url: rgf.url });
          }
          if (rreo) {
            Object.assign(row, rreo.ext, { periodo_rreo: rreo.periodo, fonte_rreo_url: rreo.url });
          }
          const { error } = await sb.from("prestacao_contas_fiscal").upsert(row, { onConflict: "poder,ano" });
          if (error) errors.push(`${poder} ${ano}: ${error.message}`);
          else upserts++;
        } catch (e) {
          errors.push(`${poder} ${ano}: ${(e as Error).message?.slice(0, 100)}`);
        }
      }
    }

    const result = { upserts, errors: errors.slice(0, 10) };
    if (logId) {
      await sb.from("sync_log").update({
        status: errors.length ? "partial" : "success",
        detalhes: result,
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: true, ...result }), { headers: json });
  } catch (error) {
    if (logId) {
      await sb.from("sync_log").update({
        status: "error",
        detalhes: { error: (error as Error).message },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), { status: 500, headers: json });
  }
});
