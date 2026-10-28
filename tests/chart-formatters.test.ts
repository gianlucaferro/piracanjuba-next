import assert from "node:assert/strict";
import test from "node:test";
import { formatChartNumber, numericTooltip } from "../src/lib/chart-formatters.ts";

test("tooltips preservam zero, valores negativos e a unidade da série", () => {
  const formatter = numericTooltip((value, name) => [`${value.toFixed(1)} mm`, name]);
  assert.deepEqual(formatter(0, "Chuva"), ["0.0 mm", "Chuva"]);
  assert.deepEqual(formatter(-2.5, "Variação"), ["-2.5 mm", "Variação"]);
  assert.deepEqual(formatter("12.5", 2026), ["12.5 mm", "2026"]);
});

test("ausências e intervalos não viram zero nem entram na formatação numérica", () => {
  const formatter = numericTooltip(() => assert.fail("Valor inválido chegou ao formatador"));
  for (const value of [undefined, null, "", "  ", true, [], [0], [10, 20], {}, NaN, Infinity, "NaN", "12 mm"]) {
    assert.deepEqual(formatter(value, "Casos"), ["Sem dados", "Casos"]);
  }
});

test("nome ausente no tooltip não imprime undefined", () => {
  const formatter = numericTooltip((value, name) => [value, name]);
  assert.deepEqual(formatter(3, undefined), [3, ""]);
  assert.deepEqual(formatter(undefined, undefined), ["Sem dados", ""]);
});

test("rótulos numéricos mantêm zero e omitem rótulos ausentes quando solicitado", () => {
  const percent = (value: number) => `${value.toFixed(1)}%`;
  assert.equal(formatChartNumber(0, percent, ""), "0.0%");
  assert.equal(formatChartNumber("25.25", percent), "25.3%");
  assert.equal(formatChartNumber(undefined, percent, ""), "");
  assert.equal(formatChartNumber([25, 50], percent), "Sem dados");
});
