// Clima Piracanjuba via Open-Meteo Forecast API (atualizado de hora em hora)
// Coordenadas Piracanjuba-GO: -17.302, -49.022
//
// Estrategia: a cada hora, capturar:
// 1. current_weather (temp + chuva + umidade + vento agora)
// 2. daily forecast (max/min/precipitacao para o dia atual + proximos 7)
// Upsert em (data, estacao_codigo). A row de "hoje" e' atualizada toda
// hora com a media corrente; rows historicas (ontem, anteontem...) tem
// fechamento do dia.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchWeatherSnapshot, WeatherFetchError, type WeatherAttempt } from "../_shared/open-meteo-fetch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LAT = -17.302;
const LNG = -49.022;
const ESTACAO = "OPENMETEO_PIRACANJUBA";
const TZ = "America/Sao_Paulo";

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "inmet_clima", status: "running", detalhes: { fonte: "open-meteo-forecast", lat: LAT, lng: LNG, estacao: ESTACAO } })
    .select("id").single();

  let attempts: WeatherAttempt[] = [];
  let upserted = 0;
  try {
    // Forecast API: current + daily (hoje + proximos 7 dias)
    const params = new URLSearchParams({
      latitude: String(LAT),
      longitude: String(LNG),
      timezone: TZ,
      current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code",
      daily: "temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_mean",
      past_days: "2", // pra cobrir gaps caso cron tenha falhado
      forecast_days: "7",
    });
    const fetched = await fetchWeatherSnapshot(`https://api.open-meteo.com/v1/forecast?${params}`);
    attempts = fetched.attempts;
    const json = fetched.data;

    const cur = json.current;
    const d = json.daily;
    if (!d || !cur) throw new Error("Resposta Open-Meteo sem current/daily");

    // Upsert dia a dia (past_days + hoje + forecast_days = 9 rows max)
    const today = isoDate(new Date());
    for (let i = 0; i < d.time.length; i++) {
      const dia = d.time[i];
      const isToday = dia === today;

      // Pra "hoje", usamos o current (mais fresco) na temperatura_media
      const tempMedia = isToday ? cur.temperature_2m : d.temperature_2m_mean[i];
      const umidMed = isToday ? cur.relative_humidity_2m : d.relative_humidity_2m_mean[i];
      const chuva = isToday ? Math.max(d.precipitation_sum[i] ?? 0, cur.precipitation) : d.precipitation_sum[i];

      const row = {
        data: dia,
        estacao_codigo: ESTACAO,
        temperatura_max: d.temperature_2m_max[i],
        temperatura_min: d.temperature_2m_min[i],
        temperatura_media: tempMedia,
        precipitacao_mm: chuva,
        umidade_media: umidMed,
        vento_velocidade_max: d.wind_speed_10m_max[i],
        raw_json: {
          source: "open-meteo-forecast",
          lat: LAT,
          lng: LNG,
          dia,
          is_today: isToday,
          current_at_sync: isToday ? {
            time: cur.time,
            temperature: cur.temperature_2m,
            humidity: cur.relative_humidity_2m,
            precipitation: cur.precipitation,
            wind: cur.wind_speed_10m,
            weather_code: cur.weather_code,
          } : null,
        },
      };
      if (dryRun) { upserted++; continue; }
      const { error } = await sb.from("inmet_clima_diario").upsert(row, { onConflict: "data,estacao_codigo" });
      if (error) throw new Error(`Falha ao gravar clima diário (${error.code ?? "erro banco"})`);
      upserted++;
    }

    const result = {
      fonte: "open-meteo-forecast",
      atualizado_as: cur.time,
      temperatura_atual: cur.temperature_2m,
      umidade_atual: cur.relative_humidity_2m,
      precipitacao_acumulada_dia: cur.precipitation,
      dias_processados: d.time.length,
      upserted,
      tentativas: attempts,
    };
    if (log?.id) await sb.from("sync_log").update({ status: "success", detalhes: result, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: true, dry_run: dryRun, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha na sincronização de clima";
    if (e instanceof WeatherFetchError) attempts = e.attempts;
    if (log?.id) await sb.from("sync_log").update({ status: "error", detalhes: { error: msg, tentativas: attempts, upserted }, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
