/// <reference lib="deno.ns" />
import {
  categoriaFolhaIndividual,
  competenciaBrasilia,
  type LancamentoIndividual,
  montarRespostaResumoServidor,
  resumirFolhaIndividual,
} from "./servidor-resumo.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Esperava ${JSON.stringify(expected)}, recebeu ${JSON.stringify(actual)}`,
    );
  }
}
function row(
  id: string,
  competencia: string,
  tipo_folha: string | null,
  bruto: number | null = 2000,
  liquido: number | null = 1800,
): LancamentoIndividual {
  return {
    id,
    competencia,
    tipo_folha,
    bruto,
    liquido,
    fonte_url: "https://example.test",
  };
}
const servidor = {
  id: "fixture",
  nome: "Servidor teste",
  cargo: "Professor",
  orgao_tipo: "prefeitura",
  fonte_url: "https://example.test",
};

Deno.test("rescisao recente nao substitui mensal e 13 conserva sua propria competencia", () => {
  const result = resumirFolhaIndividual([
    row("res", "2026-11", "RESCISÃO", 2407.68),
    row("mensal", "2026-10", "MENSAL", 3200),
    row("antiga", "2026-09", "MENSAL", 3100),
    row("13", "2026-08", "13º SALÁRIO ADIANTAMENTO", 1600),
  ], "2026-11");
  equal(result.mensal?.competencia, "2026-10");
  equal(result.mensal?.bruto, 3200);
  equal(result.rescisoes?.bruto, 2407.68);
  equal(result.decimoTerceiro?.competencia, "2026-08");
  equal(result.semMensalNaUltimaCompetencia, true);
  equal(result.semRegistroAtual, false);
});

Deno.test("tipos no mesmo mes permanecem separados e adiantamentos somam apenas dentro do grupo", () => {
  const result = resumirFolhaIndividual([
    row("mensal", "2026-10", "MENSAL", 4000),
    row("res", "2026-10", "RESCISÃO", 900),
    row("13a", "2026-10", "13º SALÁRIO ADIANTAMENTO", 500.1),
    row("13b", "2026-10", "13º SALÁRIO ADIANTAMENTO- RPPS", 300.2),
    row("outro", "2026-10", "COMPLEMENTAR1", 100),
  ], "2026-11");
  equal(result.mensal?.bruto, 4000);
  equal(result.rescisoes?.bruto, 900);
  equal(result.decimoTerceiro?.bruto, 800.3);
  equal(result.decimoTerceiro?.registros, 2);
  equal(result.outros?.bruto, 100);
  equal(result.totalRegistros, 5);
  equal(result.semRegistroAtual, true);
  equal(result.semMensalNaUltimaCompetencia, false);
});

Deno.test("13 aceita variantes de ordinal e texto, sem atribuir tipos desconhecidos a mensal", () => {
  for (
    const tipo of [
      "13 SALARIO",
      "13º SALÁRIO",
      "13° SALÁRIO",
      "13o salario adiantamento",
      "Décimo Terceiro",
      "DÉCIMO TERCEIRO ADIANTAMENTO",
    ]
  ) {
    equal(categoriaFolhaIndividual(tipo), "decimoTerceiro");
  }
  for (
    const tipo of [
      null,
      "NORMAL",
      "COMPLEMENTAR",
      "130 SALARIO",
      "DECIMO TERCEIROU",
    ]
  ) {
    equal(categoriaFolhaIndividual(tipo), "outros");
  }
  equal(categoriaFolhaIndividual(" mensal "), "mensal");
  equal(categoriaFolhaIndividual("rescisão"), "rescisoes");
});

Deno.test("valor ausente permanece desconhecido e zero publicado permanece zero", () => {
  const result = resumirFolhaIndividual([
    row("mensal", "2026-10", "MENSAL", 0, null),
    row("13a", "2026-10", "13º SALÁRIO", 100, 50),
    row("13b", "2026-10", "13º SALÁRIO ADIANTAMENTO", null, 20),
  ], "2026-11");
  equal(result.mensal?.bruto, 0);
  equal(result.mensal?.liquido, null);
  equal(result.decimoTerceiro?.bruto, null);
  equal(result.decimoTerceiro?.liquido, 70);
});

Deno.test("historico sem mensal apresenta extraordinarios sem inventar salario", () => {
  const result = montarRespostaResumoServidor(servidor, [
    row("res", "2026-11", "RESCISÃO"),
  ], new Date("2026-11-10T12:00:00Z"));
  equal(result.resumo_folha.mensal, null);
  equal(result.modo, "dados_oficiais");
  equal(result.cached, false);
  if (!result.resumo.includes("Não há folha mensal")) {
    throw new Error("Ausencia de mensal nao foi indicada");
  }
  if (!result.resumo.includes("rescisão disponível (2026-11)")) {
    throw new Error("Natureza da rescisao ausente");
  }
});

Deno.test("resumo vazio informa ausencia sem salarios zero nem situacao funcional inferida", () => {
  const result = montarRespostaResumoServidor(
    servidor,
    [],
    new Date("2026-11-10T12:00:00Z"),
  );
  equal(result.resumo_folha.ultimaCompetencia, null);
  equal(result.resumo_folha.semMensalNaUltimaCompetencia, false);
  equal(result.remuneracoes, []);
  if (!result.resumo.includes("Não há registros")) {
    throw new Error("Ausencia nao informada");
  }
  if (/R\$|atras|não recebeu|completa|exonerad/i.test(result.resumo)) {
    throw new Error("Resumo inventou informacao");
  }
});

Deno.test("ordenacao dos dados nao muda grupos nem texto", () => {
  const rows = [
    row("z", "2026-10", "13º SALÁRIO", 1),
    row("a", "2026-10", "13º SALÁRIO ADIANTAMENTO", 2),
    row("m", "2026-09", "MENSAL", 3),
  ];
  const now = new Date("2026-11-10T12:00:00Z");
  equal(
    montarRespostaResumoServidor(servidor, rows, now),
    montarRespostaResumoServidor(servidor, [...rows].reverse(), now),
  );
});

Deno.test("retificacao na mesma competencia altera valores e resumo sem cache anterior", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  const before = montarRespostaResumoServidor(servidor, [
    row("m", "2026-10", "MENSAL", 1000),
  ], now);
  const after = montarRespostaResumoServidor(servidor, [
    row("m", "2026-10", "MENSAL", 1500),
  ], now);
  equal(after.resumo_folha.mensal?.bruto, 1500);
  if (before.resumo === after.resumo) {
    throw new Error("Texto nao acompanhou retificacao");
  }
});

Deno.test("competencia usa calendario de Brasilia na virada do ano", () => {
  equal(competenciaBrasilia(new Date("2027-01-01T01:30:00Z")), "2026-12");
  equal(competenciaBrasilia(new Date("2027-01-01T03:00:00Z")), "2027-01");
});

Deno.test("duplicatas ou valores invalidos nao produzem totais enganosos", () => {
  const valid = row("m", "2026-10", "MENSAL");
  for (
    const rows of [[valid, valid], [{ ...valid, bruto: NaN }], [{
      ...valid,
      competencia: "2026-13",
    }]]
  ) {
    let failed = false;
    try {
      resumirFolhaIndividual(rows, "2026-11");
    } catch {
      failed = true;
    }
    if (!failed) throw new Error("Historico invalido foi aceito");
  }
});
