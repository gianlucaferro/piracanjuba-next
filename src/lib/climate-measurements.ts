export type ClimateMonthRow = {
  temperatura_max: unknown;
  temperatura_min: unknown;
  temperatura_media: unknown;
  precipitacao_mm: unknown;
};

export type ResumoMes = {
  acumulado_mm: number | null;
  dias_com_chuva: number | null;
  temperatura_media: number | null;
  temperatura_max_absoluta: number | null;
  temperatura_min_absoluta: number | null;
};

export function climateNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function summarizeClimateMonth(rows: ClimateMonthRow[]): ResumoMes | null {
  if (!rows.length) return null;
  const measurements = (key: keyof ClimateMonthRow) => rows.map((row) => climateNumber(row[key])).filter((value): value is number => value !== null);
  const rain = measurements("precipitacao_mm");
  const maximum = measurements("temperatura_max");
  const minimum = measurements("temperatura_min");
  const mean = measurements("temperatura_media");
  return {
    acumulado_mm: rain.length ? Math.round(rain.reduce((sum, value) => sum + value, 0) * 10) / 10 : null,
    dias_com_chuva: rain.length ? rain.filter((value) => value > 0.1).length : null,
    temperatura_media: mean.length ? Math.round(mean.reduce((sum, value) => sum + value, 0) / mean.length * 10) / 10 : null,
    temperatura_max_absoluta: maximum.length ? Math.max(...maximum) : null,
    temperatura_min_absoluta: minimum.length ? Math.min(...minimum) : null,
  };
}
