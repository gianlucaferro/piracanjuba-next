import assert from "node:assert/strict";
import test from "node:test";
import { summarizeRainRisk } from "../src/lib/climate-rain-risk.ts";

const now = new Date("2026-11-03T15:00:00Z");
const rows = (values: unknown[]) => values.map((precipitacao_mm, index) => ({
  data: new Date(Date.parse("2026-11-03T12:00:00Z") - index * 86_400_000).toISOString().slice(0, 10),
  precipitacao_mm,
}));

test("chuva parcial mantém alertas cujo limiar já foi ultrapassado", () => {
  assert.deepEqual(summarizeRainRisk(rows([12, null, 0, 0, 0, 0, 0]), now), {
    total: 12, rainyDays: 1, partial: true, risk: "moderado",
  });
  assert.deepEqual(summarizeRainRisk(rows([20, 11, null, 0, 0, 0, 0]), now), {
    total: 31, rainyDays: 2, partial: true, risk: "alto",
  });
});

test("faltas de medições ou dias não permitem concluir risco baixo", () => {
  assert.equal(summarizeRainRisk(rows([2, null, 0, 0, 0, 0, 0]), now)?.risk, null);
  assert.deepEqual(summarizeRainRisk(rows([0, 0, 0]), now), { total: 0, rainyDays: 0, partial: true, risk: null });
  assert.equal(summarizeRainRisk(rows([null, undefined, "", NaN, Infinity]), now), null);
  assert.equal(summarizeRainRisk([], now), null);
});

test("série completa preserva limites estritos de 10 e 30 mm", () => {
  for (const [total, risk] of [[10, "baixo"], [10.1, "moderado"], [30, "moderado"], [30.1, "alto"]] as const) {
    assert.deepEqual(summarizeRainRisk(rows([total, 0, 0, 0, 0, 0, 0]), now), {
      total, rainyDays: 1, partial: false, risk,
    });
  }
});

test("sete linhas com lacuna no calendário continuam parciais e excluem chuva antiga", () => {
  const readings = [...rows([2, 0, 0, 0, 0, 0]), { data: "2026-10-27", precipitacao_mm: 100 }];
  assert.deepEqual(summarizeRainRisk(readings, now), { total: 2, rainyDays: 1, partial: true, risk: null });
  assert.equal(summarizeRainRisk([{ data: "2026-10-27", precipitacao_mm: 100 }], now), null);
});

test("janela segue Brasília na virada UTC e descarta datas futuras", () => {
  const readings = [...rows([12, 0, 0, 0, 0, 0, 0]), { data: "2026-11-04", precipitacao_mm: 100 }];
  assert.deepEqual(summarizeRainRisk(readings, new Date("2026-11-04T02:30:00Z")), {
    total: 12, rainyDays: 1, partial: false, risk: "moderado",
  });
});

test("linhas repetidas não preenchem um dia ausente nem duplicam o acumulado", () => {
  const readings = rows([12, 0, 0, 0, 0, 0]);
  assert.deepEqual(summarizeRainRisk([...readings, readings[0]], now), {
    total: 12, rainyDays: 1, partial: true, risk: "moderado",
  });
});
