export type IntegrityStatus = "ok" | "warning" | "empty" | "error";

export type FreshnessPolicy =
  | { cadence: "manual"; label: string }
  | { cadence: "monthly"; label: string; maxPeriodAgeMonths: number }
  | { cadence: "annual"; label: string; maxPeriodAgeYears: number };

export interface SyncObservation {
  id: string;
  tipo: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  detalhes: Record<string, unknown>;
}

export interface CollectorStatus {
  function_name: string;
  frequency_tier: string;
  max_stale_hours: number;
  health_status: string;
  cron_status: string;
  last_started_at: string | null;
  last_finished_at: string | null;
  last_dispatch_at: string | null;
}

export interface IntegrityAssessment {
  status: IntegrityStatus;
  message: string;
}

function finiteCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function assessImport(log?: SyncObservation | null): IntegrityAssessment | null {
  if (!log) return null;
  const details = log.detalhes;
  if (log.status === "error") return { status: "error", message: "A última coleta registrou falha." };
  if (log.status === "running") return { status: "warning", message: "Coleta em andamento, conclusão ainda não comprovada." };
  if (!log.finished_at) return { status: "warning", message: "Log sem encerramento. A conclusão não foi comprovada." };
  const fetched = finiteCount(details.fetched ?? details.registros_folha);
  const sourceTotal = finiteCount(details.source_total);
  const writes = details.writes && typeof details.writes === "object" && !Array.isArray(details.writes)
    ? details.writes as Record<string, unknown> : {};
  if (log.status === "partial" || details.complete === false || details.source_complete === false ||
      details.max_pages_reached === true || (fetched !== null && sourceTotal !== null && fetched < sourceTotal) ||
      (finiteCount(writes.discarded) ?? 0) > 0) {
    return { status: "warning", message: "Importação parcial ou registros descartados. Conferir cobertura da fonte." };
  }
  if (log.status !== "success" && log.status !== "ok") {
    return { status: "warning", message: "Resultado da coleta não reconhecido." };
  }
  if (details.fallback_used === true && details.source_complete === true &&
      typeof details.requested_competencia === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(details.requested_competencia)) {
    return { status: "warning", message: `Coleta solicitada para ${details.requested_competencia} retornou uma competência anterior. Este log não comprova ausência de publicação mais recente.` };
  }
  if ((details.complete === true || details.source_complete === true) && fetched !== null && sourceTotal !== null) {
    return { status: "ok", message: `Coleta conferida: ${fetched.toLocaleString("pt-BR")} de ${sourceTotal.toLocaleString("pt-BR")} registros informados pela fonte.` };
  }
  return { status: "warning", message: "Coleta concluída. Este log não comprova a cobertura de toda a base." };
}

/** Limites de revisão do produto, não prazos legais de publicação dos órgãos. */
export function assessFreshness(
  records: number,
  period: string | null,
  policy: FreshnessPolicy,
  now = new Date(),
): IntegrityAssessment {
  if (records === 0) return { status: "empty", message: "Nenhum registro disponível nesta base." };
  if (policy.cadence === "manual") return { status: "ok", message: policy.label };
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(now);
  const year = Number(today.find((part) => part.type === "year")?.value);
  const month = Number(today.find((part) => part.type === "month")?.value);
  if (policy.cadence === "annual") {
    if (!period || !/^\d{4}$/.test(period)) return { status: "warning", message: "Ano de referência não informado." };
    const age = year - Number(period);
    if (age < 0) return { status: "warning", message: "Ano de referência futuro. Conferir a origem." };
    return age > policy.maxPeriodAgeYears
      ? { status: "warning", message: "Ano de referência além do intervalo de revisão. Verificar publicação da fonte." }
      : { status: "ok", message: policy.label };
  }
  const match = period?.match(/^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2})?$/);
  if (!match) return { status: "warning", message: "Competência válida não informada." };
  const age = (year - Number(match[1])) * 12 + month - Number(match[2]);
  if (age < 0) return { status: "warning", message: "Competência futura. Conferir a origem." };
  return age > policy.maxPeriodAgeMonths
    ? { status: "warning", message: "Competência antiga. Uma nova publicação da fonte ainda precisa ser verificada." }
    : { status: "ok", message: policy.label };
}

export function assessCollector(collector?: CollectorStatus): IntegrityAssessment | null {
  if (!collector) return null;
  if (collector.cron_status !== "scheduled") return { status: "warning", message: "Coletor sem agendamento ativo." };
  const state = collector.health_status;
  if (state === "failing") return { status: "error", message: "O coletor registrou falha na última execução." };
  if (state === "healthy") return { status: "ok", message: `Execução dentro do prazo de ${collector.max_stale_hours} horas definido para esta fonte.` };
  const messages: Record<string, string> = {
    stale: `Sem coleta concluída no prazo de ${collector.max_stale_hours} horas desta fonte.`,
    degraded: "O coletor informou resultado parcial.",
    stuck: "A execução ultrapassou o tempo esperado sem terminar.",
    running: "Execução em andamento.",
    incomplete: "A execução não tem registro de encerramento.",
    never_run: "Nenhuma execução observada.",
    unobserved: "O agendamento disparou, mas não há log de conclusão da coleta.",
  };
  return { status: "warning", message: messages[state] ?? "Estado do coletor não comprovado." };
}

export function combineAssessments(...assessments: (IntegrityAssessment | null)[]): IntegrityAssessment {
  const rank: Record<IntegrityStatus, number> = { ok: 0, empty: 1, warning: 2, error: 3 };
  const present = assessments.filter((item): item is IntegrityAssessment => item !== null);
  return present.reduce((result, item) => rank[item.status] > rank[result.status] ? item : result,
    present[0] ?? { status: "ok", message: "Dados disponíveis." });
}

export function assessScheduleCoverage(starts: string[], now = new Date()): IntegrityAssessment {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const time = Date.parse(`${today}T00:00:00Z`);
  if (!starts.length) return { status: "empty", message: "Escala não cadastrada." };
  const covered = starts.some((start) => {
    const begin = Date.parse(`${start}T00:00:00Z`);
    return time >= begin && time < begin + 7 * 86_400_000;
  });
  return covered ? { status: "ok", message: "A escala documental cobre a data atual." }
    : { status: "warning", message: "A escala não cobre a data atual. Solicitar documento atualizado." };
}
