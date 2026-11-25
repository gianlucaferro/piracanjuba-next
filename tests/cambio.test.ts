import test from "node:test";
import assert from "node:assert/strict";
import {
  isExchangeQuoteDelayed,
  parseAwesomeExchangeQuotes,
  parseExchangeSnapshot,
} from "../src/lib/cambio.ts";

const NOW = Date.parse("2026-11-23T15:00:00Z");
const rawQuote = (currency: "USD" | "EUR", overrides: Record<string, unknown> = {}) => ({
  code: currency,
  codein: "BRL",
  bid: currency === "USD" ? "5.1234" : "6.2345",
  ask: currency === "USD" ? "5.1256" : "6.2367",
  pctChange: currency === "USD" ? "-0.34" : "1.25",
  timestamp: String(NOW / 1000 - (currency === "USD" ? 30 : 180)),
  ...overrides,
});
const raw = (usd: Record<string, unknown> = {}, eur: Record<string, unknown> = {}) => ({
  USDBRL: rawQuote("USD", usd),
  EURBRL: rawQuote("EUR", eur),
});

test("câmbio conserva preços, variação da compra e horários próprios dos dois pares", () => {
  const result = parseAwesomeExchangeQuotes(raw(), NOW);
  assert.deepEqual(result, {
    source: "AwesomeAPI",
    quotes: [
      { currency: "USD", buy: 5.1234, sell: 5.1256, changePercent: -0.34, quotedAt: "2026-11-23T14:59:30.000Z" },
      { currency: "EUR", buy: 6.2345, sell: 6.2367, changePercent: 1.25, quotedAt: "2026-11-23T14:57:00.000Z" },
    ],
    fetchedAt: "2026-11-23T15:00:00.000Z",
    pollIntervalSeconds: 60,
  });
});

test("câmbio exige ambos os pares BRL, sem aceitar outra moeda sob a mesma chave", () => {
  assert.throws(() => parseAwesomeExchangeQuotes({ USDBRL: rawQuote("USD") }, NOW));
  assert.throws(() => parseAwesomeExchangeQuotes(raw({}, { codein: "USD" }), NOW));
  assert.throws(() => parseAwesomeExchangeQuotes(raw({ code: "EUR" }), NOW));
  for (const payload of [null, [], "offline", { USDBRL: [], EURBRL: rawQuote("EUR") }]) {
    assert.throws(() => parseAwesomeExchangeQuotes(payload, NOW));
  }
});

test("câmbio rejeita preço ausente, zero, negativo, infinito e spread invertido", () => {
  for (const bid of [null, undefined, "", " ", "5,1234", "NaN", "Infinity", Infinity, NaN, true, "0", 0, -1, "-1", "0x10", "1e5", "5.1234abc"]) {
    assert.throws(() => parseAwesomeExchangeQuotes(raw({ bid }), NOW), String(bid));
  }
  for (const ask of [null, "", 0, -1, "NaN", Infinity]) {
    assert.throws(() => parseAwesomeExchangeQuotes(raw({ ask }), NOW), String(ask));
  }
  assert.throws(() => parseAwesomeExchangeQuotes(raw({ bid: "5.9", ask: "5.8" }), NOW));
});

test("variação ausente permanece desconhecida e zero real é preservado", () => {
  for (const pctChange of [null, undefined]) {
    assert.equal(parseAwesomeExchangeQuotes(raw({ pctChange }), NOW).quotes[0].changePercent, null);
  }
  assert.equal(parseAwesomeExchangeQuotes(raw({ pctChange: "0" }), NOW).quotes[0].changePercent, 0);
  assert.throws(() => parseAwesomeExchangeQuotes(raw({ pctChange: "" }), NOW));
  assert.throws(() => parseAwesomeExchangeQuotes(raw({ pctChange: "NaN" }), NOW));
});

test("timestamp exige segundos inteiros válidos e tolera no máximo cinco minutos futuros", () => {
  for (const timestamp of [null, "", "invalid", 0, -1, NOW, NOW / 1000 + 0.5, NOW / 1000 + 301]) {
    assert.throws(() => parseAwesomeExchangeQuotes(raw({ timestamp }), NOW), String(timestamp));
  }
  assert.equal(parseAwesomeExchangeQuotes(raw({ timestamp: NOW / 1000 + 300 }), NOW).quotes[0].quotedAt, "2026-11-23T15:05:00.000Z");
  assert.throws(() => parseAwesomeExchangeQuotes(raw(), NaN));
});

test("cotação antiga continua identificada com seu horário, inclusive fora de dias úteis", () => {
  const result = parseAwesomeExchangeQuotes(raw({ timestamp: NOW / 1000 - 3 * 86400 }), NOW);
  assert.equal(result.quotes[0].quotedAt, "2026-11-20T15:00:00.000Z");
  assert.equal(isExchangeQuoteDelayed(result.quotes[0], result.fetchedAt, NOW), true);
});

test("atraso considera separadamente a idade da coleta e de cada moeda", () => {
  const result = parseAwesomeExchangeQuotes(raw(), NOW);
  assert.equal(isExchangeQuoteDelayed(result.quotes[0], result.fetchedAt, NOW), false);
  assert.equal(isExchangeQuoteDelayed(result.quotes[1], result.fetchedAt, NOW), false);
  assert.equal(isExchangeQuoteDelayed(result.quotes[0], result.fetchedAt, NOW + 180_000), false);
  assert.equal(isExchangeQuoteDelayed(result.quotes[0], result.fetchedAt, NOW + 180_001), true);
  const older = { ...result.quotes[1], quotedAt: new Date(NOW - 900_001).toISOString() };
  assert.equal(isExchangeQuoteDelayed(older, result.fetchedAt, NOW), true);
  assert.equal(isExchangeQuoteDelayed(result.quotes[0], "invalid", NOW), true);
});

test("contrato público é validado e normalizado sem confiar em cast TypeScript", () => {
  const valid = parseAwesomeExchangeQuotes(raw(), NOW);
  assert.deepEqual(parseExchangeSnapshot(valid), valid);
  assert.deepEqual(parseExchangeSnapshot({ ...valid, quotes: [...valid.quotes].reverse() }), valid);
  assert.equal(parseExchangeSnapshot({ ...valid, fetchedAt: "2026-11-23T15:00:00Z" }).fetchedAt, valid.fetchedAt);
  for (const change of [
    { source: "Outro" },
    { pollIntervalSeconds: 1 },
    { fetchedAt: "2026-02-30T15:00:00Z" },
    { fetchedAt: "2026-11-23" },
    { quotes: [valid.quotes[0]] },
    { quotes: [valid.quotes[0], valid.quotes[0]] },
    { quotes: [{ ...valid.quotes[0], buy: "5.12" }, valid.quotes[1]] },
    { quotes: [{ ...valid.quotes[0], changePercent: undefined }, valid.quotes[1]] },
    { quotes: [{ ...valid.quotes[0], changePercent: Infinity }, valid.quotes[1]] },
  ]) {
    assert.throws(() => parseExchangeSnapshot({ ...valid, ...change }));
  }
});
