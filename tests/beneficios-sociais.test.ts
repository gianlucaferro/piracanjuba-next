import assert from "node:assert/strict";
import test from "node:test";
import {
  calcularTotalOficialAnual,
  gerarCsvBeneficios,
} from "../src/lib/beneficios-sociais.ts";

test("total anual exclui estimativas municipais e referencias regionais", () => {
  const total = calcularTotalOficialAnual(
    [
      {
        competencia: "2026-01",
        valor_pago: 1_003_751,
        natureza_dado: "oficial",
        fonte_codigo: "portal_transparencia",
      },
      {
        competencia: "2026-01",
        valor_pago: 2_194_863.37,
        natureza_dado: "oficial",
        fonte_codigo: "portal_transparencia",
      },
      {
        competencia: "2026-01",
        valor_pago: 41_490,
        natureza_dado: "estimado",
        fonte_codigo: "estimativa_bolsa_familia",
      },
      {
        competencia: "2026-01",
        valor_pago: 5_000_000,
        natureza_dado: "referencia_regional",
        fonte_codigo: "aneel",
      },
    ],
    2026,
  );

  assert.equal(total, 3_198_614.37);
});

test("total anual ignora outras competencias e preserva zero legitimo", () => {
  const total = calcularTotalOficialAnual(
    [
      {
        competencia: "2025-12",
        valor_pago: 900,
        natureza_dado: "oficial",
        fonte_codigo: "portal_transparencia",
      },
      {
        competencia: "2026-02",
        valor_pago: null,
        natureza_dado: "oficial",
        fonte_codigo: "portal_transparencia",
      },
    ],
    2026,
  );

  assert.equal(total, 0);
});

test("CSV distingue natureza e fonte e escapa aspas", () => {
  const csv = gerarCsvBeneficios(
    [
      {
        programa: "tarifa_social",
        competencia: "2026-01",
        beneficiarios: 922,
        valor_pago: 41_490,
        unidade_medida: "famílias",
        natureza_dado: "estimado",
        fonte_nome: 'Estimativa "municipal"',
        fonte_url: "https://example.test/metodologia",
        observacoes: null,
      },
    ],
    () => "Luz Social",
  );

  assert.ok(csv.startsWith("\uFEFFPrograma;Competência;"));
  assert.match(csv, /Natureza;Fonte;URL/);
  assert.match(csv, /"estimado";"Estimativa ""municipal"""/);
  assert.match(csv, /"Luz Social";"2026-01";"922";"41490"/);
});
