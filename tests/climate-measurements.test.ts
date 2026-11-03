import assert from "node:assert/strict";
import test from "node:test";
import { climateNumber, summarizeClimateMonth, type ClimateMonthRow } from "../src/lib/climate-measurements.ts";

const absent: ClimateMonthRow = { temperatura_max: null, temperatura_min: null, temperatura_media: null, precipitacao_mm: null };

test("clima distingue zero real de ausência e valores inválidos", () => {
  for (const value of [null, undefined, "", "   ", NaN, Infinity, -Infinity, "erro", false, [], {}]) assert.equal(climateNumber(value), null);
  assert.equal(climateNumber(0), 0);
  assert.equal(climateNumber("0"), 0);
  assert.equal(climateNumber("25.4"), 25.4);
  assert.equal(climateNumber(-3.2), -3.2);
});

test("resumo mensal não dilui a medição isolada com dias ausentes", () => {
  assert.deepEqual(summarizeClimateMonth([
    absent,
    { temperatura_max: 30, temperatura_min: 20, temperatura_media: 25.4, precipitacao_mm: 12.3 },
    absent,
  ]), { acumulado_mm: 12.3, dias_com_chuva: 1, temperatura_media: 25.4, temperatura_max_absoluta: 30, temperatura_min_absoluta: 20 });
});

test("resumo sem medições mantém nulos e lista vazia não produz mês fictício", () => {
  assert.equal(summarizeClimateMonth([]), null);
  assert.deepEqual(summarizeClimateMonth([absent]), {
    acumulado_mm: null, dias_com_chuva: null, temperatura_media: null, temperatura_max_absoluta: null, temperatura_min_absoluta: null,
  });
});

test("média usa somente medições válidas incluindo zeros e valores negativos", () => {
  assert.deepEqual(summarizeClimateMonth([
    { temperatura_max: 4, temperatura_min: -4, temperatura_media: 0, precipitacao_mm: 0 },
    { temperatura_max: "10", temperatura_min: "0", temperatura_media: "6", precipitacao_mm: "2.4" },
    { temperatura_max: Infinity, temperatura_min: "", temperatura_media: "erro", precipitacao_mm: undefined },
  ]), { acumulado_mm: 2.4, dias_com_chuva: 1, temperatura_media: 3, temperatura_max_absoluta: 10, temperatura_min_absoluta: -4 });
});
