import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Orcamento da Camara Municipal (funcao Legislativa) via SICONFI/Tesouro Nacional.
// A camara nao tem receita propria no portal Centi (vive de duodecimo repassado pela
// Prefeitura). O duodecimo financia o orcamento da camara, declarado ao SICONFI no
// RREO Anexo 02 (Despesa por Funcao -> Legislativa). Usamos dotacao atualizada (orcado)
// e despesas liquidadas (executado), somando os blocos exceto-intra + intra.
const ENTE = "5217203"; // Piracanjuba-GO (codigo IBGE)
const SICONFI = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo";

async function fetchAnexo02(ano: number, periodo: number): Promise<unknown[]> {
  const url = `${SICONFI}?an_exercicio=${ano}&nr_periodo=${periodo}&co_tipo_demonstrativo=RREO&no_anexo=${encodeURIComponent("RREO-Anexo 02")}&id_ente=${ENTE}`;
  const resp = await fetch(url, { headers: { "User-Agent": "piracanjuba.ai/1.0" } });
  if (!resp.ok) return [];
  const data = await resp.json().catch(() => ({}));
  return Array.isArray((data as { items?: unknown[] })?.items) ? (data as { items: unknown[] }).items : [];
}

function extractLegislativa(items: unknown[]): { dotacao: number; liquidada: number } | null {
  let dotacao = 0, liquidada = 0, found = false;
  for (const raw of items) {
    const it = raw as Record<string, unknown>;
    if (String(it?.conta ?? "").trim().toLowerCase() !== "legislativa") continue;
    const cod = String(it?.cod_conta ?? "");
    if (cod !== "RREO2TotalDespesas" && cod !== "RREO2TotalDespesasIntra") continue;
    const col = String(it?.coluna ?? "").toUpperCase();
    const v = Number(it?.valor) || 0;
    if (col.includes("DOTAÇÃO ATUALIZADA")) { dotacao += v; found = true; }
    if (col.includes("LIQUIDADAS ATÉ")) { liquidada += v; found = true; }
  }
  return found ? { dotacao, liquidada } : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = { ...corsHeaders, "Content-Type": "application/json" };
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: log } = await sb
    .from("sync_log")
    .insert({ tipo: "camara-siconfi", status: "running", detalhes: {} })
    .select("id")
    .single();
  const logId = log?.id;

  const currentYear = new Date().getFullYear();
  const errors: string[] = [];
  let upserts = 0;

  try {
    for (let ano = 2021; ano <= currentYear; ano++) {
      try {
        let result: { dotacao: number; liquidada: number } | null = null;
        let periodoRef = 0;
        // Periodos bimestrais 6..1; usa o mais recente que tiver dado acumulado.
        for (const per of [6, 5, 4, 3, 2, 1]) {
          const items = await fetchAnexo02(ano, per);
          if (!items.length) continue;
          const ext = extractLegislativa(items);
          if (ext) { result = ext; periodoRef = per; break; }
        }
        if (!result || result.dotacao <= 0) continue;
        const fonteUrl = `${SICONFI}?an_exercicio=${ano}&nr_periodo=${periodoRef}&co_tipo_demonstrativo=RREO&no_anexo=RREO-Anexo%2002&id_ente=${ENTE}`;
        const { error } = await sb.from("camara_orcamento").upsert({
          ano,
          dotacao: result.dotacao,
          liquidada: result.liquidada,
          periodo_referencia: periodoRef,
          fonte: "SICONFI / Tesouro Nacional",
          fonte_url: fonteUrl,
          updated_at: new Date().toISOString(),
        }, { onConflict: "ano" });
        if (error) errors.push(`${ano}: ${error.message}`);
        else upserts++;
      } catch (e) {
        errors.push(`${ano}: ${(e as Error).message?.slice(0, 100)}`);
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
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: json,
    });
  }
});
