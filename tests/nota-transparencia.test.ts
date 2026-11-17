import assert from "node:assert/strict";
import test from "node:test";
import {
  CORTE_ELEVADO,
  MUNICIPIO,
  NOTA_PNTP,
  nivelMaisComum,
  temSelo,
  variacaoPosicao,
  vizinhosNoRanking,
  type NivelContagem,
  type RankingItem,
} from "../src/data/notaTransparencia.ts";

const NIVEIS_PNTP = ["Diamante", "Ouro", "Prata", "Elevado", "Intermediário", "Básico", "Inicial", "Inexistente"] as const;

// Faixas do PNTP publicadas pelo TCM-GO no PDF do ranking de 2026-11-10.
function nivelEsperado(idx: number, ess: number): string {
  if (idx >= CORTE_ELEVADO && ess >= 1) return idx >= 0.95 ? "Diamante" : idx >= 0.85 ? "Ouro" : "Prata";
  if (idx >= CORTE_ELEVADO) return "Elevado";
  if (idx >= 0.5) return "Intermediário";
  if (idx >= 0.3) return "Básico";
  if (idx > 0) return "Inicial";
  return "Inexistente";
}

function conferirOrdem(ranking: readonly RankingItem[]) {
  assert.equal(ranking[0].pos, 1);
  for (let i = 1; i < ranking.length; i++) {
    const a = ranking[i - 1];
    const b = ranking[i];
    const ordem = a.idx > b.idx || (a.idx === b.idx && a.ess >= b.ess);
    assert.ok(ordem, `${a.mun} (${a.idx}, ${a.ess}) deveria vir antes de ${b.mun} (${b.idx}, ${b.ess})`);
    if (a.idx === b.idx && a.ess === b.ess) {
      assert.equal(b.pos, a.pos, `${b.mun} empata com ${a.mun} e divide a posição`);
    } else {
      assert.equal(b.pos, i + 1, `${b.mun} deveria estar em ${i + 1}º`);
    }
  }
}

function contar(ranking: readonly RankingItem[]): NivelContagem[] {
  return NIVEIS_PNTP.map((nivel) => ({ nivel, count: ranking.filter((r) => r.niv === nivel).length }));
}

const media = (ranking: readonly RankingItem[]) =>
  Math.round((ranking.reduce((s, r) => s + r.idx, 0) / ranking.length) * 10000) / 10000;

test("ranking 2026 tem os 246 municípios de Goiás, sem repetição, nos dois poderes", () => {
  assert.equal(NOTA_PNTP.ano, 2026);
  for (const ranking of [NOTA_PNTP.rankingExec, NOTA_PNTP.rankingLeg]) {
    assert.equal(ranking.length, 246);
    assert.equal(new Set(ranking.map((r) => r.mun)).size, 246);
  }
  assert.equal(NOTA_PNTP.executivo.total, 246);
  assert.equal(NOTA_PNTP.legislativo.total, 246);
});

test("Piracanjuba aparece na posição e com os índices do PDF do TCM-GO", () => {
  const exec = NOTA_PNTP.rankingExec.find((r) => r.mun === MUNICIPIO);
  const leg = NOTA_PNTP.rankingLeg.find((r) => r.mun === MUNICIPIO);
  // "226 Piracanjuba 74,62 94,74 Intermediário" e "90 Piracanjuba 92,36 100,00 Ouro"
  assert.deepEqual(exec, { pos: 226, mun: "Piracanjuba", idx: 0.7462, ess: 0.9474, niv: "Intermediário" });
  assert.deepEqual(leg, { pos: 90, mun: "Piracanjuba", idx: 0.9236, ess: 1, niv: "Ouro" });
  assert.deepEqual(NOTA_PNTP.executivo, { ano: 2026, indice: 0.7462, nivel: "Intermediário", essenciais: 0.9474, posicao: 226, total: 246 });
  assert.deepEqual(NOTA_PNTP.legislativo, { ano: 2026, indice: 0.9236, nivel: "Ouro", essenciais: 1, posicao: 90, total: 246 });
  assert.equal(NOTA_PNTP.publicadoEm, "2026-11-10");
});

test("ordem do ranking segue o índice geral, desempata pelo essencial e divide posição no empate total", () => {
  conferirOrdem(NOTA_PNTP.rankingExec);
  conferirOrdem(NOTA_PNTP.rankingLeg);
  // Empate publicado: Itapuranga e Itumbiara dividem o 26º lugar, e o seguinte é o 28º.
  const empate = NOTA_PNTP.rankingExec.filter((r) => r.pos === 26).map((r) => r.mun);
  assert.deepEqual(empate, ["Itapuranga", "Itumbiara"]);
  assert.ok(NOTA_PNTP.rankingExec.some((r) => r.pos === 28));
  assert.ok(!NOTA_PNTP.rankingExec.some((r) => r.pos === 27));
});

test("nível de cada município bate com as faixas do PNTP", () => {
  for (const r of [...NOTA_PNTP.rankingExec, ...NOTA_PNTP.rankingLeg]) {
    assert.equal(r.niv, nivelEsperado(r.idx, r.ess), `${r.mun}: ${r.idx} / ${r.ess}`);
  }
});

test("contexto (médias, selos, contagem por nível, 1º lugar) é coerente com o ranking", () => {
  const ctx = NOTA_PNTP.contexto;
  // Médias oficiais do TCM-GO: 86,97 (prefeituras) e 86,08 (câmaras).
  assert.equal(ctx.mediaExec, 0.8697);
  assert.equal(ctx.mediaLeg, 0.8608);
  assert.equal(media(NOTA_PNTP.rankingExec), ctx.mediaExec);
  assert.equal(media(NOTA_PNTP.rankingLeg), ctx.mediaLeg);
  assert.deepEqual(ctx.niveisExec, contar(NOTA_PNTP.rankingExec));
  assert.deepEqual(ctx.niveisLeg, contar(NOTA_PNTP.rankingLeg));
  assert.equal(ctx.selosExec, 150);
  assert.equal(ctx.selosLeg, 116);
  assert.equal(NOTA_PNTP.rankingExec.filter((r) => temSelo(r.niv)).length, ctx.selosExec);
  assert.equal(NOTA_PNTP.rankingLeg.filter((r) => temSelo(r.niv)).length, ctx.selosLeg);
  assert.deepEqual(ctx.primeiroExec, { mun: NOTA_PNTP.rankingExec[0].mun, indice: NOTA_PNTP.rankingExec[0].idx });
  assert.deepEqual(ctx.primeiroLeg, { mun: NOTA_PNTP.rankingLeg[0].mun, indice: NOTA_PNTP.rankingLeg[0].idx });
  assert.deepEqual(nivelMaisComum(ctx.niveisExec), { nivel: "Ouro", count: 109 });
});

test("2025 fica como histórico, com a variação para 2026", () => {
  const a = NOTA_PNTP.anterior;
  assert.equal(a.ano, 2025);
  assert.equal(a.executivo.posicao, 231);
  assert.equal(a.executivo.indice, 0.5424);
  assert.equal(a.legislativo.posicao, 181);
  assert.equal(a.legislativo.indice, 0.6564);
  assert.equal(variacaoPosicao(a.executivo.posicao, NOTA_PNTP.executivo.posicao), 5);
  assert.equal(variacaoPosicao(a.legislativo.posicao, NOTA_PNTP.legislativo.posicao), 91);
  assert.equal(variacaoPosicao(10, 12), -2);
});

test("vizinhos no ranking cercam Piracanjuba e respeitam as pontas da lista", () => {
  const v = vizinhosNoRanking(NOTA_PNTP.rankingExec, MUNICIPIO, 3);
  assert.equal(v.length, 7);
  assert.equal(v[3].mun, MUNICIPIO);
  assert.deepEqual(v.map((r) => r.pos), [223, 224, 225, 226, 227, 228, 229]);
  assert.equal(vizinhosNoRanking(NOTA_PNTP.rankingExec, NOTA_PNTP.rankingExec[0].mun, 3).length, 4);
  assert.equal(vizinhosNoRanking(NOTA_PNTP.rankingExec, NOTA_PNTP.rankingExec[245].mun, 3).length, 4);
  assert.deepEqual(vizinhosNoRanking(NOTA_PNTP.rankingExec, "Cidade Inexistente"), []);
});
