// INMET clima diario — API publica REST sem auth
// Estacao A035 = Goiania (a mais proxima de Piracanjuba com serie historica continua)
// Docs: https://portal.inmet.gov.br/manual
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ESTACAO = "A035"; // Goiania — proxima de Piracanjuba
const BASE = "https://apitempo.inmet.gov.br";

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";
  const days = parseInt(url.searchParams.get("days") || "7");

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "inmet_clima", status: "running", detalhes: { estacao: ESTACAO, days } })
    .select("id").single();

  try {
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    const u = `${BASE}/estacao/diaria/${isoDate(start)}/${isoDate(end)}/${ESTACAO}`;
    const r = await fetch(u);
    if (!r.ok) throw new Error(`INMET HTTP ${r.status}`);
    const data = await r.json() as Array<Record<string, any>>;

    let upserted = 0;
    for (const d of data) {
      const dataDia = d.DT_MEDICAO; // YYYY-MM-DD
      if (!dataDia) continue;
      const row = {
        data: dataDia,
        estacao_codigo: ESTACAO,
        temperatura_max: d.TEMP_MAX ? parseFloat(d.TEMP_MAX) : null,
        temperatura_min: d.TEMP_MIN ? parseFloat(d.TEMP_MIN) : null,
        temperatura_media: d.TEMP_MED ? parseFloat(d.TEMP_MED) : null,
        precipitacao_mm: d.CHUVA ? parseFloat(d.CHUVA) : null,
        umidade_media: d.UMID_MED ? parseFloat(d.UMID_MED) : null,
        vento_velocidade_max: d.VEL_VENTO_MAX ? parseFloat(d.VEL_VENTO_MAX) : null,
        raw_json: d,
      };
      if (dryRun) { upserted++; continue; }
      const { error } = await sb.from("inmet_clima_diario").upsert(row, { onConflict: "data,estacao_codigo" });
      if (!error) upserted++;
    }

    const result = { fetched: data.length, upserted };
    if (log?.id) await sb.from("sync_log").update({ status: "success", detalhes: result, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: true, dry_run: dryRun, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error).message;
    if (log?.id) await sb.from("sync_log").update({ status: "error", detalhes: { error: msg }, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
