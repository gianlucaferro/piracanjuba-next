export const EXCHANGE_POLL_INTERVAL_SECONDS = 60 as const;

export type CurrencyQuote = {
  currency: "USD" | "EUR";
  buy: number;
  sell: number;
  changePercent: number | null;
  quotedAt: string;
};

export type ExchangeSnapshot = {
  source: "AwesomeAPI";
  quotes: CurrencyQuote[];
  fetchedAt: string;
  pollIntervalSeconds: typeof EXCHANGE_POLL_INTERVAL_SECONDS;
};

const CURRENCIES = ["USD", "EUR"] as const;
const MAX_FUTURE_QUOTE_MS = 5 * 60_000;
const MAX_COLLECTION_AGE_MS = 3 * 60_000;
const MAX_QUOTE_AGE_MS = 15 * 60_000;

export function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Resposta de câmbio inválida.");
  }
  return value as Record<string, unknown>;
}

export function numberValue(value: unknown): number {
  if (typeof value !== "number" && typeof value !== "string") {
    throw new Error("Valor de câmbio inválido.");
  }
  if (typeof value === "string" && !/^-?\d+(?:\.\d+)?$/.test(value)) {
    throw new Error("Valor de câmbio inválido.");
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Valor de câmbio inválido.");
  return parsed;
}

export function prices(buy: unknown, sell: unknown): { buy: number; sell: number } {
  const parsedBuy = numberValue(buy);
  const parsedSell = numberValue(sell);
  if (parsedBuy <= 0 || parsedSell <= 0 || parsedBuy > parsedSell) {
    throw new Error("Preços de câmbio inconsistentes.");
  }
  return { buy: parsedBuy, sell: parsedSell };
}

function variation(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return numberValue(value);
}

export function isoDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new Error("Horário de câmbio inválido.");
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error("Horário de câmbio inválido.");
  const normalized = new Date(timestamp).toISOString();
  if (normalized.replace(".000Z", "Z") !== value.replace(".000Z", "Z")) {
    throw new Error("Horário de câmbio inválido.");
  }
  return normalized;
}

/** Converte somente os dois pares usados pela home, antes de gravar no cache. */
export function parseAwesomeExchangeQuotes(value: unknown, nowMs = Date.now()): ExchangeSnapshot {
  if (!Number.isFinite(nowMs)) throw new Error("Horário de consulta inválido.");
  const payload = record(value);
  const quotes = CURRENCIES.map((currency): CurrencyQuote => {
    const quote = record(payload[`${currency}BRL`]);
    if (quote.code !== currency || quote.codein !== "BRL") {
      throw new Error("Par de câmbio inválido.");
    }
    const timestamp = numberValue(quote.timestamp);
    const quotedAtMs = timestamp * 1000;
    if (!Number.isSafeInteger(timestamp) || timestamp <= 0 || quotedAtMs > nowMs + MAX_FUTURE_QUOTE_MS) {
      throw new Error("Horário da cotação inválido.");
    }
    return {
      currency,
      ...prices(quote.bid, quote.ask),
      changePercent: variation(quote.pctChange),
      quotedAt: new Date(quotedAtMs).toISOString(),
    };
  });
  return {
    source: "AwesomeAPI",
    quotes,
    fetchedAt: new Date(nowMs).toISOString(),
    pollIntervalSeconds: EXCHANGE_POLL_INTERVAL_SECONDS,
  };
}

/** Valida o contrato público sem confiar nos tipos declarados pelo cliente HTTP. */
export function parseExchangeSnapshot(value: unknown): ExchangeSnapshot {
  const payload = record(value);
  if (payload.source !== "AwesomeAPI" || payload.pollIntervalSeconds !== EXCHANGE_POLL_INTERVAL_SECONDS || !Array.isArray(payload.quotes) || payload.quotes.length !== CURRENCIES.length) {
    throw new Error("Resumo de câmbio inválido.");
  }
  const candidates = payload.quotes.map(record);
  const quotes = CURRENCIES.map((currency): CurrencyQuote => {
    const matches = candidates.filter((quote) => quote.currency === currency);
    if (matches.length !== 1) throw new Error("Moedas do resumo de câmbio inválidas.");
    const quote = matches[0];
    if (typeof quote.buy !== "number" || typeof quote.sell !== "number" || (quote.changePercent !== null && typeof quote.changePercent !== "number")) {
      throw new Error("Valores do resumo de câmbio inválidos.");
    }
    return {
      currency,
      ...prices(quote.buy, quote.sell),
      changePercent: variation(quote.changePercent),
      quotedAt: isoDate(quote.quotedAt),
    };
  });
  return {
    source: "AwesomeAPI",
    quotes,
    fetchedAt: isoDate(payload.fetchedAt),
    pollIntervalSeconds: EXCHANGE_POLL_INTERVAL_SECONDS,
  };
}

export function isExchangeQuoteDelayed(quote: CurrencyQuote, fetchedAt: string, nowMs: number): boolean {
  const fetchedAtMs = Date.parse(fetchedAt);
  const quotedAtMs = Date.parse(quote.quotedAt);
  return !Number.isFinite(nowMs) || !Number.isFinite(fetchedAtMs) || !Number.isFinite(quotedAtMs)
    || nowMs - fetchedAtMs > MAX_COLLECTION_AGE_MS
    || nowMs - quotedAtMs > MAX_QUOTE_AGE_MS;
}
