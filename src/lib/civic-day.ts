export function brazilDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function weekForDate<T extends { inicio: string }>(weeks: readonly T[], date: string): T | null {
  const index = weeks.findLastIndex((week) => week.inicio <= date);
  if (index < 0) return null;
  const week = weeks[index];
  const end = new Date(`${week.inicio}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 7);
  return date < (weeks[index + 1]?.inicio ?? end.toISOString().slice(0, 10)) ? week : null;
}
