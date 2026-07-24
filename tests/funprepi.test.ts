import test from "node:test";
import assert from "node:assert/strict";
import {
  calcularVariacaoPercentual,
  getCargoAtualDoador,
} from "../src/lib/funprepi.ts";

test("identifica somente os dois doadores por nome normalizado exato", () => {
  assert.equal(
    getCargoAtualDoador("Antonino Inocêncio de Lima")?.cargo,
    "atual secretário de Finanças do município",
  );
  assert.equal(
    getCargoAtualDoador("WILSON RODRIGUES DE LIMA")?.cargo,
    "atual secretário de Obras e Serviços Públicos do município",
  );
  assert.equal(getCargoAtualDoador("Wilson Rodrigues"), null);
});

test("calcula variação sem dividir por zero", () => {
  assert.equal(calcularVariacaoPercentual(113.86, 100), 13.86);
  assert.equal(calcularVariacaoPercentual(10, 0), null);
});
