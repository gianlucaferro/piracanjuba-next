import assert from "node:assert/strict";
import test from "node:test";
import { dataBaseGrupo, fonteContratoSegura, resumoContratosGrupo, type RegistroContratoGrupo } from "../src/lib/gruposMetricas.ts";

const registro = (dados: Partial<RegistroContratoGrupo>): RegistroContratoGrupo => ({ id: "1", orgao: "prefeitura", tipo: "original", cnpj: "12345678000190", numero: "1", data: "2026-05-01", valor: 100, fonteUrl: null, ...dados });

test("grupos separam contratos e aditivos por ano, preservando supressões", () => {
  const resumo = resumoContratosGrupo([
    registro({}), registro({ id: "2", tipo: "aditivo", valor: -20 }),
    registro({ id: "3", tipo: "aditivo", valor: 50, data: "2025-05-01" }),
  ]);
  assert.equal(resumo.total, 130);
  assert.deepEqual(resumo.periodos, [
    { ano: "2026", originais: 100, aditivos: -20, contratos: 1, termos: 1 },
    { ano: "2025", originais: 0, aditivos: 50, contratos: 0, termos: 1 },
  ]);
});

test("grupos deduplicam IDs no mesmo órgão sem misturar Prefeitura e Câmara", () => {
  const resumo = resumoContratosGrupo([registro({}), registro({}), registro({ orgao: "camara", valor: 50 })]);
  assert.equal(resumo.total, 150);
  assert.equal(resumo.periodos[0].contratos, 2);
});

test("grupos mantêm data e valores ausentes explícitos e evitam percentuais sem base", () => {
  const resumo = resumoContratosGrupo([registro({ data: null, valor: null })]);
  assert.equal(resumo.periodos[0].ano, "Sem data");
  assert.equal(resumo.semValor, 1);
  assert.equal(resumo.fornecedores[0].participacao, null);
});

test("concentração é calculada somente sobre o recorte apresentado", () => {
  const resumo = resumoContratosGrupo([registro({ valor: 75 }), registro({ id: "2", cnpj: "98765432000100", valor: 25 })]);
  assert.equal(resumo.fornecedores[0].participacao, 75);
});

test("data-base respeita Goiás e fontes rejeitam protocolos executáveis", () => {
  assert.equal(dataBaseGrupo("2026-07-16T02:07:05.371137+00:00"), "2026-07-15");
  assert.equal(dataBaseGrupo("inválido"), null);
  assert.equal(fonteContratoSegura("javascript:alert(1)"), null);
  assert.equal(fonteContratoSegura("https://piracanjuba.go.gov.br/"), "https://piracanjuba.go.gov.br/");
});
