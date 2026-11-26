import { isoDate, numberValue, record } from "./cambio.ts";

export const DOLLAR_HISTORY_DAYS = 30 as const;
export const DOLLAR_HISTORY_REVALIDATE_SECONDS = 3600 as const;

export type DollarHistoryPoint = {
  /** Dia da cotação no horário de Brasília, YYYY-MM-DD. */
  date: string;
  /** Valor de compra do dólar comercial no último registro do dia. */
  buy: number;
  quotedAt: string;
};

export type DollarHistory = {
  source: "AwesomeAPI";
  currency: "USD";
  days: typeof DOLLAR_HISTORY_DAYS;
  points: DollarHistoryPoint[];
  fetchedAt: string;
};

export type DollarHistorySummary = {
  first: DollarHistoryPoint;
  last: DollarHistoryPoint;
  min: DollarHistoryPoint;
  max: DollarHistoryPoint;
  changePercent: number;
};

const DAY_MS = 86_400_000;
const HISTORY_MAX_FUTURE_MS = 5 * 60_000;
const MAX_RAW_ITEMS = 120;
const MIN_POINTS = 2;

const brasiliaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Data civil de Brasília (YYYY-MM-DD) de um instante em milissegundos. */
export function brasiliaDate(ms: number): string {
  const parts = brasiliaDateFormatter.formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function positivePrice(value: unknown): number {
  const parsed = numberValue(value);
  if (parsed <= 0) throw new Error("Preço de câmbio inválido.");
  return parsed;
}

/**
 * Converte o fechamento diário da AwesomeAPI (mais recente primeiro) nos pontos
 * dos últimos 30 dias de Brasília, do mais antigo para o mais recente, com um
 * ponto por dia. O ponto de hoje é o último valor disponível, ainda sem fechamento.
 */
export function parseAwesomeDollarDaily(value: unknown, nowMs = Date.now()): DollarHistory {
  if (!Number.isFinite(nowMs)) throw new Error("Horário de consulta inválido.");
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_RAW_ITEMS) {
    throw new Error("Histórico de câmbio inválido.");
  }
  const items = value.map(record);
  // A AwesomeAPI informa o par só no primeiro item; nos demais, se vier, precisa ser o mesmo.
  if (items[0].code !== "USD" || items[0].codein !== "BRL") throw new Error("Par de câmbio inválido.");
  for (const item of items) {
    if ((item.code !== undefined && item.code !== "USD") || (item.codein !== undefined && item.codein !== "BRL")) {
      throw new Error("Par de câmbio inválido.");
    }
  }

  const cutoff = brasiliaDate(nowMs - (DOLLAR_HISTORY_DAYS - 1) * DAY_MS);
  const byDate = new Map<string, DollarHistoryPoint>();
  for (const item of items) {
    const timestamp = numberValue(item.timestamp);
    const quotedAtMs = timestamp * 1000;
    if (!Number.isSafeInteger(timestamp) || timestamp <= 0 || quotedAtMs > nowMs + HISTORY_MAX_FUTURE_MS) {
      throw new Error("Horário da cotação inválido.");
    }
    const date = brasiliaDate(quotedAtMs);
    if (date < cutoff) continue;
    const point = { date, buy: positivePrice(item.bid), quotedAt: new Date(quotedAtMs).toISOString() };
    const current = byDate.get(date);
    if (!current || quotedAtMs > Date.parse(current.quotedAt)) byDate.set(date, point);
  }

  const points = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (points.length < MIN_POINTS) throw new Error("Histórico de câmbio insuficiente.");
  return {
    source: "AwesomeAPI",
    currency: "USD",
    days: DOLLAR_HISTORY_DAYS,
    points,
    fetchedAt: new Date(nowMs).toISOString(),
  };
}

/** Valida o contrato público de /api/cambio/historico no navegador. */
export function parseDollarHistory(value: unknown): DollarHistory {
  const payload = record(value);
  if (
    payload.source !== "AwesomeAPI"
    || payload.currency !== "USD"
    || payload.days !== DOLLAR_HISTORY_DAYS
    || !Array.isArray(payload.points)
    || payload.points.length < MIN_POINTS
    || payload.points.length > DOLLAR_HISTORY_DAYS
  ) {
    throw new Error("Histórico de câmbio inválido.");
  }
  const points = payload.points.map((raw): DollarHistoryPoint => {
    const point = record(raw);
    if (typeof point.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(point.date)) {
      throw new Error("Data do histórico de câmbio inválida.");
    }
    if (typeof point.buy !== "number" || !Number.isFinite(point.buy) || point.buy <= 0) {
      throw new Error("Valor do histórico de câmbio inválido.");
    }
    const quotedAt = isoDate(point.quotedAt);
    if (brasiliaDate(Date.parse(quotedAt)) !== point.date) {
      throw new Error("Data do histórico de câmbio inválida.");
    }
    return { date: point.date, buy: point.buy, quotedAt };
  });
  for (let index = 1; index < points.length; index += 1) {
    if (points[index].date <= points[index - 1].date) throw new Error("Ordem do histórico de câmbio inválida.");
  }
  return {
    source: "AwesomeAPI",
    currency: "USD",
    days: DOLLAR_HISTORY_DAYS,
    points,
    fetchedAt: isoDate(payload.fetchedAt),
  };
}

const AXIS_STEPS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5] as const;

/** Marcas redondas do eixo de valor (de 3 a 6), sempre envolvendo mínimo e máximo. */
export function dollarAxisTicks(min: number, max: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) {
    throw new Error("Faixa do eixo inválida.");
  }
  const round = (value: number) => Math.round(value * 10_000) / 10_000;
  for (const step of AXIS_STEPS) {
    let low = round(Math.floor(min / step) * step);
    let high = round(Math.ceil(max / step) * step);
    // Faixa estreita demais: abre um passo de cada lado para ter ao menos 3 marcas.
    if (Math.round((high - low) / step) + 1 < 3) {
      low = round(Math.max(0, low - step));
      high = round(high + step);
    }
    const count = Math.round((high - low) / step) + 1;
    if (count <= 6) {
      return Array.from({ length: count }, (_, index) => round(low + index * step));
    }
  }
  const step = AXIS_STEPS[AXIS_STEPS.length - 1];
  const low = Math.floor(min / step) * step;
  const high = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round((high - low) / step) + 1 }, (_, index) => round(low + index * step));
}

export function summarizeDollarHistory(points: DollarHistoryPoint[]): DollarHistorySummary {
  if (points.length < MIN_POINTS) throw new Error("Histórico de câmbio insuficiente.");
  const first = points[0];
  const last = points[points.length - 1];
  // Em empate, o primeiro dia com o valor extremo representa o período.
  const min = points.reduce((lowest, point) => (point.buy < lowest.buy ? point : lowest), first);
  const max = points.reduce((highest, point) => (point.buy > highest.buy ? point : highest), first);
  return { first, last, min, max, changePercent: ((last.buy - first.buy) / first.buy) * 100 };
}
