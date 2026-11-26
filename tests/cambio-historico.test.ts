import test from "node:test";
import assert from "node:assert/strict";
import {
  brasiliaDate,
  dollarAxisTicks,
  parseAwesomeDollarDaily,
  parseDollarHistory,
  summarizeDollarHistory,
} from "../src/lib/cambio-historico.ts";

// 2026-11-25 17:40 em Brasília.
const NOW = Date.parse("2026-11-25T20:40:00Z");
const at = (iso: string) => String(Date.parse(iso) / 1000);

type Entry = [iso: string, bid: string, overrides?: Record<string, unknown>];
// A AwesomeAPI devolve o mais recente primeiro e informa o par só no primeiro item.
const daily = (entries: Entry[]) => entries.map(([iso, bid, overrides = {}], index) => ({
  ...(index === 0 ? { code: "USD", codein: "BRL", name: "Dólar Americano/Real Brasileiro", create_date: "2026-11-25 17:35:13" } : {}),
  high: bid,
  low: bid,
  varBid: "0",
  pctChange: "0",
  bid,
  ask: String(Number(bid) + 0.0006),
  timestamp: at(iso),
  ...overrides,
}));

const base: Entry[] = [
  ["2026-11-25T20:35:13Z", "5.8168"],
  ["2026-11-24T22:44:00Z", "5.9055"],
  // 2026-11-24 22:00 em Brasília: mesmo dia do anterior, registro mais antigo.
  ["2026-11-25T01:00:00Z", "5.9111"],
  ["2026-11-20T18:18:00Z", "5.9488"],
  // 2026-10-27 19:00 em Brasília: primeiro dia da janela de 30 dias.
  ["2026-10-27T22:00:00Z", "5.0100"],
  // 2026-10-26 23:30 em Brasília: fora da janela, embora seja 27/10 em UTC.
  ["2026-10-27T02:30:00Z", "5.0050"],
  ["2026-10-20T22:00:00Z", "5.0238"],
];

test("histórico mantém um ponto por dia de Brasília nos últimos 30 dias, do mais antigo ao mais recente", () => {
  const history = parseAwesomeDollarDaily(daily(base), NOW);
  assert.deepEqual(history, {
    source: "AwesomeAPI",
    currency: "USD",
    days: 30,
    points: [
      { date: "2026-10-27", buy: 5.01, quotedAt: "2026-10-27T22:00:00.000Z" },
      { date: "2026-11-20", buy: 5.9488, quotedAt: "2026-11-20T18:18:00.000Z" },
      { date: "2026-11-24", buy: 5.9111, quotedAt: "2026-11-25T01:00:00.000Z" },
      { date: "2026-11-25", buy: 5.8168, quotedAt: "2026-11-25T20:35:13.000Z" },
    ],
    fetchedAt: "2026-11-25T20:40:00.000Z",
  });
});

test("histórico aceita os itens em qualquer ordem e o par repetido nos demais itens", () => {
  const expected = parseAwesomeDollarDaily(daily(base), NOW);
  const reversed = daily(base).map((item) => ({ ...item, code: "USD", codein: "BRL" })).reverse();
  assert.deepEqual(parseAwesomeDollarDaily(reversed, NOW), expected);
});

test("histórico recusa resposta fora do contrato da AwesomeAPI", () => {
  assert.throws(() => parseAwesomeDollarDaily({}, NOW));
  assert.throws(() => parseAwesomeDollarDaily([], NOW));
  assert.throws(() => parseAwesomeDollarDaily(Array.from({ length: 121 }, () => daily(base)[0]), NOW));
  assert.throws(() => parseAwesomeDollarDaily(daily(base).map((item, index) => (index === 0 ? { ...item, code: "EUR" } : item)), NOW));
  assert.throws(() => parseAwesomeDollarDaily(daily(base).map((item, index) => (index === 0 ? { ...item, codein: "USD" } : item)), NOW));
  assert.throws(() => parseAwesomeDollarDaily(daily(base).map((item, index) => (index === 2 ? { ...item, code: "EUR" } : item)), NOW));
  assert.throws(() => parseAwesomeDollarDaily([...daily(base), "texto"], NOW));
  assert.throws(() => parseAwesomeDollarDaily(daily([...base.slice(0, 2), ["2026-11-23T20:00:00Z", "0"]]), NOW));
  assert.throws(() => parseAwesomeDollarDaily(daily([...base.slice(0, 2), ["2026-11-23T20:00:00Z", "5,90"]]), NOW));
  assert.throws(() => parseAwesomeDollarDaily(daily([...base.slice(0, 2), ["2026-11-23T20:00:00Z", "-5.9"]]), NOW));
  assert.throws(() => parseAwesomeDollarDaily(daily(base), Number.NaN));
});

test("histórico recusa horário futuro ou fracionado e janela com menos de dois dias", () => {
  assert.throws(() => parseAwesomeDollarDaily(daily([["2026-11-25T20:46:00Z", "5.8"], ...base]), NOW));
  assert.doesNotThrow(() => parseAwesomeDollarDaily(daily([["2026-11-25T20:44:00Z", "5.8"], ...base]), NOW));
  assert.throws(() => parseAwesomeDollarDaily(daily(base).map((item, index) => (index === 1 ? { ...item, timestamp: "1795638911.5" } : item)), NOW));
  assert.throws(() => parseAwesomeDollarDaily(daily([base[0], ["2026-10-20T22:00:00Z", "5.0238"]]), NOW));
});

test("contrato público preserva o histórico serializado e recusa dados adulterados", () => {
  const history = parseAwesomeDollarDaily(daily(base), NOW);
  assert.deepEqual(parseDollarHistory(JSON.parse(JSON.stringify(history))), history);

  type Serialized = { source: string; currency: string; days: number; points: Array<Record<string, unknown>>; fetchedAt: string };
  const tamper = (change: (copy: Serialized) => void) => {
    const copy = JSON.parse(JSON.stringify(history)) as Serialized;
    change(copy);
    return copy;
  };
  assert.throws(() => parseDollarHistory(tamper((copy) => { copy.source = "Outra"; })));
  assert.throws(() => parseDollarHistory(tamper((copy) => { copy.currency = "EUR"; })));
  assert.throws(() => parseDollarHistory(tamper((copy) => { copy.days = 31; })));
  assert.throws(() => parseDollarHistory(tamper((copy) => { copy.points = copy.points.slice(0, 1); })));
  assert.throws(() => parseDollarHistory(tamper((copy) => { copy.points = Array.from({ length: 31 }, () => copy.points[0]); })));
  assert.throws(() => parseDollarHistory(tamper((copy) => { copy.points.reverse(); })));
  assert.throws(() => parseDollarHistory(tamper((copy) => { copy.points[1] = { ...copy.points[0] }; })));
  assert.throws(() => parseDollarHistory(tamper((copy) => { copy.points[0].buy = "5.01"; })));
  assert.throws(() => parseDollarHistory(tamper((copy) => { copy.points[0].buy = 0; })));
  assert.throws(() => parseDollarHistory(tamper((copy) => { copy.points[0].date = "2026-10-28"; })));
  assert.throws(() => parseDollarHistory(tamper((copy) => { copy.points[0].date = "27/10/2026"; })));
  assert.throws(() => parseDollarHistory(tamper((copy) => { copy.points[0].quotedAt = "2026-10-27 22:00"; })));
  assert.throws(() => parseDollarHistory(tamper((copy) => { copy.fetchedAt = "ontem"; })));
});

test("resumo traz primeiro e último dia, extremos e variação do período", () => {
  const { points } = parseAwesomeDollarDaily(daily(base), NOW);
  const summary = summarizeDollarHistory(points);
  assert.equal(summary.first.date, "2026-10-27");
  assert.equal(summary.last.date, "2026-11-25");
  assert.equal(summary.min.date, "2026-10-27");
  assert.equal(summary.max.date, "2026-11-20");
  assert.ok(Math.abs(summary.changePercent - ((5.8168 - 5.01) / 5.01) * 100) < 1e-9);

  const tie = summarizeDollarHistory([
    { date: "2026-11-23", buy: 5.9, quotedAt: "2026-11-23T20:00:00.000Z" },
    { date: "2026-11-24", buy: 5.9, quotedAt: "2026-11-24T20:00:00.000Z" },
  ]);
  assert.equal(tie.min.date, "2026-11-23");
  assert.equal(tie.max.date, "2026-11-23");
  assert.equal(tie.changePercent, 0);
  assert.throws(() => summarizeDollarHistory([]));
});

test("eixo usa de 3 a 6 marcas redondas que envolvem mínimo e máximo", () => {
  assert.deepEqual(dollarAxisTicks(5.8168, 5.9488), [5.8, 5.85, 5.9, 5.95]);
  assert.deepEqual(dollarAxisTicks(5.01, 5.9488), [5, 5.2, 5.4, 5.6, 5.8, 6]);
  assert.deepEqual(dollarAxisTicks(5.5, 5.5), [5.49, 5.5, 5.51]);
  for (const [min, max] of [[5.0238, 5.9488], [4.1, 6.9], [5.801, 5.809], [0.5, 12]] as const) {
    const ticks = dollarAxisTicks(min, max);
    assert.ok(ticks.length >= 3 && ticks.length <= 6, `${min}-${max}: ${ticks}`);
    assert.ok(ticks[0] <= min && ticks[ticks.length - 1] >= max, `${min}-${max}: ${ticks}`);
  }
  assert.throws(() => dollarAxisTicks(6, 5));
  assert.throws(() => dollarAxisTicks(0, 5));
  assert.throws(() => dollarAxisTicks(Number.NaN, 5));
});

test("data de Brasília vira o dia às 3h UTC", () => {
  assert.equal(brasiliaDate(Date.parse("2026-11-26T02:59:59Z")), "2026-11-25");
  assert.equal(brasiliaDate(Date.parse("2026-11-26T03:00:00Z")), "2026-11-26");
});
