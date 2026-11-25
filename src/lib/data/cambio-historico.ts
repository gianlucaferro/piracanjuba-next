import "server-only";
import { unstable_cache } from "next/cache";
import { readBoundedJson } from "@/lib/data/cambio";
import {
  DOLLAR_HISTORY_REVALIDATE_SECONDS,
  parseAwesomeDollarDaily,
  type DollarHistory,
} from "@/lib/cambio-historico";

// 45 fechamentos cobrem com folga os dias úteis dos últimos 30 dias corridos.
const DOLLAR_HISTORY_URL = "https://economia.awesomeapi.com.br/json/daily/USD-BRL/45";
const DOLLAR_HISTORY_TIMEOUT_MS = 8_000;
const DOLLAR_HISTORY_RETRY_MS = 5 * 60_000;

async function loadDollarHistory(): Promise<DollarHistory> {
  const key = process.env.AWESOMEAPI_KEY?.trim();
  if (!key) throw new Error("Consulta de câmbio não configurada.");
  try {
    const response = await fetch(DOLLAR_HISTORY_URL, {
      cache: "no-store",
      redirect: "error",
      headers: { "x-api-key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(DOLLAR_HISTORY_TIMEOUT_MS),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("Fonte de câmbio indisponível.");
    }
    return parseAwesomeDollarDaily(await readBoundedJson(response), Date.now());
  } catch {
    // Não propagar corpo, headers ou mensagens do fornecedor para logs do Next.
    throw new Error("Não foi possível atualizar o histórico do dólar.");
  }
}

// Deduplica consultas concorrentes com o cache vazio e espaça novas tentativas após falha.
let pendingDollarHistory: Promise<DollarHistory> | undefined;
let dollarHistoryRetryAfter = 0;
async function loadSharedDollarHistory(): Promise<DollarHistory> {
  if (pendingDollarHistory) return pendingDollarHistory;
  if (Date.now() < dollarHistoryRetryAfter) throw new Error("Histórico do dólar temporariamente indisponível.");
  pendingDollarHistory = loadDollarHistory().catch(() => {
    dollarHistoryRetryAfter = Date.now() + DOLLAR_HISTORY_RETRY_MS;
    throw new Error("Não foi possível atualizar o histórico do dólar.");
  }).finally(() => {
    pendingDollarHistory = undefined;
  });
  return pendingDollarHistory;
}

// Uma consulta por hora no máximo; em erro, o Next mantém o último histórico válido.
const cachedDollarHistory = unstable_cache(
  loadSharedDollarHistory,
  ["economia-dolar-30d-v1"],
  { revalidate: DOLLAR_HISTORY_REVALIDATE_SECONDS },
);

export async function fetchDollarHistory(): Promise<DollarHistory> {
  if (!process.env.AWESOMEAPI_KEY?.trim()) throw new Error("Consulta de câmbio não configurada.");
  return cachedDollarHistory();
}
