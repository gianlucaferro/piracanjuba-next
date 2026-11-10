import assert from "node:assert/strict";
import test from "node:test";
import { resumirFolhaCamara, type RegistroFolhaCamara } from "../src/lib/camara-folha.ts";

const linha = (competencia: string, tipo_folha: string | null, bruto: number | null, servidor_id = "a"): RegistroFolhaCamara => ({ competencia, tipo_folha, bruto, servidor_id });

test("rescisão em novembro não substitui a última folha mensal de outubro", () => {
  const resumo = resumirFolhaCamara([
    linha("2026-10", "MENSAL", 2000), linha("2026-10", "MENSAL", 3000, "b"),
    linha("2026-11", "RESCISÃO", 2407.68), linha("2026-09", "MENSAL", 4000),
  ])!;
  assert.deepEqual(resumo.mensal, { competencia: "2026-10", bruto: 5000, servidores: 2, registros: 2 });
  assert.equal(resumo.ultimaCompetencia, "2026-11");
  assert.equal(resumo.publicacaoParcial, true);
  assert.deepEqual(resumo.recente.rescisoes, { bruto: 2407.68, servidores: 1, registros: 1 });
  assert.equal(resumo.recente.mensal.registros, 0);
});

test("mensal publicada depois remove aviso de ausência sem misturar extraordinários", () => {
  const resumo = resumirFolhaCamara([
    linha("2026-10", "MENSAL", 2000), linha("2026-11", "MENSAL", 3500),
    linha("2026-11", "RESCISÃO", 2407.68), linha("2026-11", "13º ADIANTAMENTO", 1000),
  ])!;
  assert.equal(resumo.publicacaoParcial, false);
  assert.equal(resumo.mensal?.competencia, "2026-11");
  assert.equal(resumo.mensal?.bruto, 3500);
  assert.equal(resumo.recente.rescisoes.bruto, 2407.68);
  assert.equal(resumo.recente.outros.bruto, 1000);
});

test("sem mensal histórica não há salário zero nem substituição por outro tipo", () => {
  const resumo = resumirFolhaCamara([linha("2026-11", "RESCISAO", 2407.68), linha("2026-11", null, 100)])!;
  assert.equal(resumo.mensal, null);
  assert.equal(resumo.publicacaoParcial, true);
  assert.equal(resumo.recente.outros.bruto, 100);
  assert.equal(resumo.recente.rescisoes.bruto, 2407.68);
  assert.equal(resumirFolhaCamara([]), null);
});

test("contagem mensal usa pessoas distintas e soma valores em centavos", () => {
  const resumo = resumirFolhaCamara([
    linha("2026-11", "MENSAL", 0.1), linha("2026-11", "mensal", 0.2),
    linha("2026-11", "MENSAL", 0, "b"), linha("2026-11", "rescisão", 2000, "b"),
  ])!;
  assert.deepEqual(resumo.mensal, { competencia: "2026-11", bruto: 0.3, servidores: 2, registros: 3 });
  assert.equal(resumo.recente.rescisoes.servidores, 1);
});

test("valor mensal ausente impede apresentar soma parcial como total conhecido", () => {
  const resumo = resumirFolhaCamara([linha("2026-11", "MENSAL", null), linha("2026-11", "MENSAL", 2000, "b")])!;
  assert.equal(resumo.mensal?.bruto, null);
  assert.equal(resumo.mensal?.servidores, 2);
});

test("competências atravessam o ano sem confundir último pagamento e última mensal", () => {
  const resumo = resumirFolhaCamara([linha("2026-12", "MENSAL", 5000), linha("2027-01", "FÉRIAS", 1500)])!;
  assert.equal(resumo.ultimaCompetencia, "2027-01");
  assert.equal(resumo.mensal?.competencia, "2026-12");
  assert.equal(resumo.publicacaoParcial, true);
});
