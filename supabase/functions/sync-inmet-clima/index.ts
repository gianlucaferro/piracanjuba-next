// Clima Piracanjuba via Open-Meteo (gratuita, sem auth, mais robusta que INMET)
// Coordenadas Piracanjuba-GO: -17.302, -49.022
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LAT = -17.302;
const LNG = -49.022;
const ESTACAO = "OPENMETEO_PIRACANJUBA"; // pseudo-codigo unico para Open-Meteo

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";
  const days = parseInt(url.searchParams.get("days") || "7");

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "inmet_clima", status: "running", detalhes: { fonte: "open-meteo", lat: LAT, lng: LNG, days } })
    .select("id").single();

  try {
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    const u = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LNG}&start_date=${isoDate(start)}&end_date=${isoDate(end)}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_max&timezone=America%2FSao_Paulo`;
    const r = await fetch(u);
    if (!r.ok) throw new Error(`Open-Meteo HTTP ${r.status}`);
    const json = await r.json() as {
      daily?: {
        time: string[];
        temperature_2m_max: (number|null)[];
        temperature_2m_min: (number|null)[];
        temperature_2m_mean: (number|null)[];
        precipitation_sum: (number|null)[];
        relative_humidity_2m_mean: (number|null)[];
        wind_speed_10m_max: (number|null)[];
      };
    };
    const d = json.daily;
    if (!d) throw new Error("Resposta sem daily.time");

    let upserted = 0;
    for (let i = 0; i < d.time.length; i++) {
      const row = {
        data: d.time[i],
        estacao_codigo: ESTACAO,
        temperatura_max: d.temperature_2m_max[i],
        temperatura_min: d.temperature_2m_min[i],
        temperatura_media: d.temperature_2m_mean[i],
        precipitacao_mm: d.precipitation_sum[i],
        umidade_media: d.relative_humidity_2m_mean[i],
        vento_velocidade_max: d.wind_speed_10m_max[i],
        raw_json: { source: "open-meteo", lat: LAT, lng: LNG, day_idx: i },
      };
      if (dryRun) { upserted++; continue; }
      const { error } = await sb.from("inmet_clima_diario").upsert(row, { onConflict: "data,estacao_codigo" });
      if (!error) upserted++;
    }

    const result = { fonte: "open-meteo", fetched: d.time.length, upserted, periodo: `${isoDate(start)} a ${isoDate(end)}` };
    if (log?.id) await sb.from("sync_log").update({ status: "success", detalhes: result, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: true, dry_run: dryRun, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error).message;
    if (log?.id) await sb.from("sync_log").update({ status: "error", detalhes: { error: msg }, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
