type NumericChartLabel = string | number;
type NumericTooltipResult = [NumericChartLabel, string];

function chartNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Formata valores escalares sem transformar ausência de dados em zero. */
export function formatChartNumber(
  value: unknown,
  format: (value: number) => NumericChartLabel,
  missing: string = "Sem dados",
): NumericChartLabel {
  const numericValue = chartNumber(value);
  return numericValue === null ? missing : format(numericValue);
}

/** Adapta séries numéricas aos valores opcionais e intervalos aceitos pelo Recharts. */
export function numericTooltip(
  format: (value: number, name: string) => NumericTooltipResult,
): (value: unknown, name: unknown) => NumericTooltipResult {
  return (value, name) => {
    const label = typeof name === "string" || typeof name === "number" ? String(name) : "";
    const numericValue = chartNumber(value);
    return numericValue === null ? ["Sem dados", label] : format(numericValue, label);
  };
}
