// sync-bolsa-familia — popula bolsa_familia_municipio com dados do Portal
// da Transparencia Federal (Bolsa Familia + Auxilio Brasil quando aplicavel).
//
// Cron mensal recomendado. Invocacao manual:
//   curl -X POST $URL -H "x-centi-ingest-secret: $INGEST" -d '{"meses": 24}'

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkCentiAuth } from "../_shared/centi-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

const PORTAL_BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";
const COD_IBGE_PIRACANJUBA = "5217005";

type BFItem = {
  dataReferencia: string;
  valor: number;
  quantidadeBeneficiados: number;
  municipio?: { codigoIBGE: string; nomeIBGE: string };
};

async function fetchProgramaMes(
  token: string,
  endpoint: "bolsa-familia-por-municipio" | "auxilio-brasil-por-municipio",
  mesAno: string,
): Promise<BFItem[]> {
  const url = new URL(`${PORTAL_BASE}/${endpoint}`);
  url.searchParams.set("codigoIbge", COD_IBGE_PIRACANJUBA);
  url.searchParams.set("mesAno", mesAno);
  url.searchParams.set("pagina", "1");

  const resp = await fetch(url.toString(), {
    headers: { "chave-api-dados": token, Accept: "application/json" },
  });
  if (resp.status === 404 || resp.status === 204) return [];
  if (!resp.ok) {
    if (resp.status === 429) {
      await new Promise((r) => setTimeout(r, 5000));
      return [];
    }
    return [];
  }
  return (await resp.json()) as BFItem[];
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
    return new Response(JSON.stringify({ error: "PORTAL_TRANSPARENCIA_TOKEN ausente" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { meses?: number } = {};
  try { body = req.method === "POST" ? await req.json() : {}; } catch { /* ok */ }
  const totalMeses = Math.max(1, Math.min(body.meses ?? 12, 36));

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const startedAt = Date.now();
  const hoje = new Date();
  const inseridos: Array<Record<string, unknown>> = [];
  let upserts = 0;

  // Portal tem ~2 meses de defasagem; comecamos -2
  for (let i = 2; i < totalMeses + 2; i++) {
    const dt = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const ano = dt.getFullYear();
    const mes = dt.getMonth() + 1;
    const mesAno = `${ano}${String(mes).padStart(2, "0")}`;

    // 1) Tenta Bolsa Familia (endpoint atual)
    let resp = await fetchProgramaMes(TOKEN, "bolsa-familia-por-municipio", mesAno);
    let programa = "BOLSA_FAMILIA";
    // 2) Se vazio (mes anterior a 2023 — Auxilio Brasil), tenta esse
    if (resp.length === 0) {
      resp = await fetchProgramaMes(TOKEN, "auxilio-brasil-por-municipio", mesAno);
      programa = "AUXILIO_BRASIL";
    }

    const item = resp[0];
    if (item && item.valor > 0) {
      const { error } = await supabase
        .from("bolsa_familia_municipio")
        .upsert({
          mes_ano: mesAno,
          ano,
          mes,
          programa,
          valor: item.valor,
          beneficiados: item.quantidadeBeneficiados,
          codigo_ibge: COD_IBGE_PIRACANJUBA,
          raw_payload: item as Record<string, unknown>,
          consultado_em: new Date().toISOString(),
        }, { onConflict: "mes_ano" });
      if (!error) upserts++;
      inseridos.push({ mes_ano: mesAno, programa, valor: item.valor, beneficiados: item.quantidadeBeneficiados });
    } else {
      inseridos.push({ mes_ano: mesAno, vazio: true });
    }

    // Rate limit ~30 req/min
    await new Promise((r) => setTimeout(r, 1200));
  }

  return new Response(
    JSON.stringify({
      success: true,
      duration_ms: Date.now() - startedAt,
      upserts,
      detalhes: inseridos,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
