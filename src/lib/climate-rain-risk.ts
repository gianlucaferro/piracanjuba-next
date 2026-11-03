import { climateNumber } from "./climate-measurements.ts";

type RainMeasurement = { data: string; precipitacao_mm: unknown };

export function summarizeRainRisk(rows: RainMeasurement[], now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const todayTime = Date.parse(`${today}T12:00:00Z`);
  const dates = new Set(Array.from({ length: 7 }, (_, index) =>
    new Date(todayTime - index * 86_400_000).toISOString().slice(0, 10)));
  const byDate = new Map<string, number>();
  for (const row of rows) {
    const value = climateNumber(row.precipitacao_mm);
    if (dates.has(row.data) && value !== null) byDate.set(row.data, value);
  }
  if (!byDate.size) return null;
  const measurements = [...byDate.values()];

  const partial = byDate.size < dates.size;
  const total = Math.round(measurements.reduce((sum, value) => sum + value, 0) * 10) / 10;
  // Preserva os limiares existentes. Medições ausentes não invalidam um limiar já ultrapassado.
  const risk = total > 30 ? "alto" : total > 10 ? "moderado" : partial ? null : "baixo";
  return { total, rainyDays: measurements.filter((value) => value > 0.1).length, partial, risk };
}
