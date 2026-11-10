import assert from "node:assert/strict";
import test from "node:test";
import { resumirFolhaPrefeitura, type RegistroFolhaPrefeitura, type RegistroCoberturaPrefeitura } from "../src/lib/prefeitura-folha.ts";

const linha = (competencia: string, tipo_folha: string | null, bruto: number | null, servidor_id = "a"): RegistroFolhaPrefeitura => ({ competencia, tipo_folha, bruto, servidor_id });
const orgao = (mes: number, orgao_id: string | null, orgao_nome = `Órgão ${orgao_id}`, ano = 2026): RegistroCoberturaPrefeitura => ({ ano, mes, orgao_id, orgao_nome });
const base = [orgao(9, "22", "Poder Executivo"), orgao(9, "44", "FUNPREPI"), orgao(10, "44", "FUNPREPI")];

test("Prefeitura separa mensal, rescisão e variantes do 13º sem duplicar vínculos", () => {
  const resumo = resumirFolhaPrefeitura([
    linha("2026-10", "MENSAL", 3000), linha("2026-10", "MENSAL", 2000, "b"),
    linha("2026-10", "13º SALÁRIO ADIANTAMENTO", 1000),
    linha("2026-10", "13º SALÁRIO ADIANTAMENTO- RPPS", 500, "b"),
    linha("2026-10", "RESCISÃO", 1500, "c"), linha("2026-10", "COMPLEMENTAR", 100),
  ], base, "2026-09", "2026-11")!;
  assert.deepEqual(resumo.mensal, { competencia: "2026-10", bruto: 5000, servidores: 2, registros: 2 });
  assert.deepEqual(resumo.recente.decimoTerceiro, { bruto: 1500, servidores: 2, registros: 2 });
  assert.equal(resumo.recente.rescisoes.bruto, 1500);
  assert.equal(resumo.recente.outros.bruto, 100);
  assert.equal(resumo.semRegistrosNaCompetenciaAtual, true);
});

test("lacuna de órgão na mensal sinaliza parcial com referência anterior", () => {
  const resumo = resumirFolhaPrefeitura([linha("2026-10", "MENSAL", 3000)], base, "2026-09", "2026-11")!;
  assert.equal(resumo.publicacaoParcial, true);
  assert.deepEqual(resumo.coberturaMensal, { competenciaAnterior: "2026-09", orgaosAusentes: [{ id: "22", nome: "Poder Executivo" }], verificavel: true });
});

test("órgãos repetidos em linhas ou movimentos são comparados como conjuntos", () => {
  const resumo = resumirFolhaPrefeitura([linha("2026-10", "MENSAL", 3000)], [...base, ...base], "2026-09", "2026-11")!;
  assert.equal(resumo.coberturaMensal.orgaosAusentes.length, 1);
  assert.equal(resumo.mensal?.bruto, 3000);
});

test("retorno dos órgãos remove lacuna sem presumir fechamento pela quantidade", () => {
  const resumo = resumirFolhaPrefeitura([linha("2026-10", "MENSAL", 3000)], [...base, orgao(10, "22")], "2026-09", "2026-10")!;
  assert.equal(resumo.publicacaoParcial, false);
  assert.equal(resumo.semRegistrosNaCompetenciaAtual, false);
  assert.deepEqual(resumo.coberturaMensal.orgaosAusentes, []);
});

test("extraordinários mais recentes não substituem a mensal anterior", () => {
  const resumo = resumirFolhaPrefeitura([
    linha("2026-10", "MENSAL", 3000), linha("2026-11", "RESCISAO", 800),
    linha("2026-11", "13° SALARIO", 2000),
  ], [...base, orgao(10, "22")], "2026-09", "2026-11")!;
  assert.equal(resumo.mensal?.competencia, "2026-10");
  assert.equal(resumo.mensal?.bruto, 3000);
  assert.equal(resumo.ultimaCompetencia, "2026-11");
  assert.equal(resumo.publicacaoParcial, true);
  assert.equal(resumo.recente.mensal.registros, 0);
  assert.equal(resumo.recente.decimoTerceiro.bruto, 2000);
});

test("valor ausente não vira zero ou soma incompleta apresentada como total", () => {
  const resumo = resumirFolhaPrefeitura([
    linha("2026-10", "MENSAL", null), linha("2026-10", "MENSAL", 3000, "b"),
    linha("2026-10", "13 SALARIO", null), linha("2026-10", "RESCISÃO", 0),
  ], base, "2026-09", "2026-11")!;
  assert.equal(resumo.mensal?.bruto, null);
  assert.equal(resumo.recente.decimoTerceiro.bruto, null);
  assert.equal(resumo.recente.rescisoes.bruto, 0);
});

test("somente 13º não produz mensal histórica fictícia", () => {
  const resumo = resumirFolhaPrefeitura([linha("2026-11", "DÉCIMO TERCEIRO SALÁRIO", 1000)], [], null, "2026-11")!;
  assert.equal(resumo.mensal, null);
  assert.equal(resumo.publicacaoParcial, true);
  assert.equal(resumo.recente.decimoTerceiro.bruto, 1000);
  assert.equal(resumirFolhaPrefeitura([], [], null, "2026-11"), null);
});

test("cobertura sem identificadores, sem dados ou sem base anterior não confirma órgãos", () => {
  for (const [cobertura, anterior] of [
    [[...base, orgao(10, null)], "2026-09"],
    [[...base, orgao(9, "inválido")], "2026-09"],
    [[], "2026-09"], [base, null], [[orgao(10, "44")], "2026-09"],
  ] as [RegistroCoberturaPrefeitura[], string | null][]) {
    const resumo = resumirFolhaPrefeitura([linha("2026-10", "MENSAL", 3000)], cobertura, anterior, "2026-11")!;
    assert.equal(resumo.coberturaMensal.verificavel, false);
    assert.deepEqual(resumo.coberturaMensal.orgaosAusentes, []);
  }
});

test("tipos desconhecidos ficam separados e soma respeita centavos", () => {
  const resumo = resumirFolhaPrefeitura([
    linha("2026-10", "mensal", 0.1), linha("2026-10", "MENSAL", 0.2),
    linha("2026-10", "13o salário", 1200), linha("2026-10", null, 250),
    linha("2026-10", "FÉRIAS", 300),
  ], base, "2026-09", "2026-11")!;
  assert.equal(resumo.mensal?.bruto, 0.3);
  assert.equal(resumo.mensal?.servidores, 1);
  assert.equal(resumo.recente.decimoTerceiro.bruto, 1200);
  assert.equal(resumo.recente.outros.bruto, 550);
});

test("virada do ano preserva comparação de competências absolutas", () => {
  const resumo = resumirFolhaPrefeitura([linha("2026-12", "MENSAL", 3000)], [orgao(11, "22"), orgao(12, "22")], "2026-11", "2027-01")!;
  assert.equal(resumo.semRegistrosNaCompetenciaAtual, true);
  assert.equal(resumo.mensal?.competencia, "2026-12");
  assert.equal(resumo.coberturaMensal.verificavel, true);
});
