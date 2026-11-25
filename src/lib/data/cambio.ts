import "server-only";
import { unstable_cache } from "next/cache";
import { EXCHANGE_POLL_INTERVAL_SECONDS, parseAwesomeExchangeQuotes, type ExchangeSnapshot } from "@/lib/cambio";

const EXCHANGE_URL = "https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL";
const MAX_RESPONSE_BYTES = 32_768;
const REQUEST_TIMEOUT_MS = 8_000;

export async function readBoundedJson(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (declaredLength > MAX_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new Error("Resposta de câmbio excede o limite.");
  }
  if (!response.body) throw new Error("Resposta de câmbio vazia.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("Resposta de câmbio excede o limite.");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(text) as unknown;
}

async function loadExchangeSnapshot(): Promise<ExchangeSnapshot> {
  const key = process.env.AWESOMEAPI_KEY?.trim();
  if (!key) throw new Error("Consulta de câmbio não configurada.");
  try {
    const response = await fetch(EXCHANGE_URL, {
      cache: "no-store",
      redirect: "error",
      headers: { "x-api-key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("Fonte de câmbio indisponível.");
    }
    return parseAwesomeExchangeQuotes(await readBoundedJson(response), Date.now());
  } catch {
    // Não propagar corpo, headers ou mensagens do fornecedor para logs do Next.
    throw new Error("Não foi possível atualizar as cotações.");
  }
}

// A deduplicação local também protege consultas concorrentes em cache vazio.
let pending: Promise<ExchangeSnapshot> | undefined;
let retryAfter = 0;
async function loadSharedExchangeSnapshot(): Promise<ExchangeSnapshot> {
  if (pending) return pending;
  if (Date.now() < retryAfter) throw new Error("Atualização de câmbio temporariamente indisponível.");
  pending = loadExchangeSnapshot().catch(() => {
    retryAfter = Date.now() + EXCHANGE_POLL_INTERVAL_SECONDS * 1000;
    throw new Error("Não foi possível atualizar as cotações.");
  }).finally(() => {
    pending = undefined;
  });
  return pending;
}

// Só o sucesso validado substitui o cache. Em erro de revalidação o Next mantém
// o resultado anterior, incluindo os horários reais, sem apresentá-lo como novo.
const cachedExchangeSnapshot = unstable_cache(
  loadSharedExchangeSnapshot,
  ["home-cambio-usd-eur-v1"],
  { revalidate: EXCHANGE_POLL_INTERVAL_SECONDS },
);

export async function fetchExchangeSnapshot(): Promise<ExchangeSnapshot> {
  if (!process.env.AWESOMEAPI_KEY?.trim()) throw new Error("Consulta de câmbio não configurada.");
  return cachedExchangeSnapshot();
}
