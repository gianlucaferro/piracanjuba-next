/// <reference lib="deno.ns" />

import {
  casarVereador,
  competenciaDosParametros,
  emMandatoNaCompetencia,
  mesCorrenteBrasilia,
  parseValorBRL,
  planejarCompetencia,
  totalDaFonte,
  vereadoresDaFolhaMensal,
} from "./remuneracao-vereadores.ts";

// Igualdade estrita: NaN, null e undefined não se confundem (JSON.stringify igualaria).
function iguais(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  return ka.length === kb.length &&
    ka.every((k) =>
      Object.prototype.hasOwnProperty.call(b, k) &&
      iguais((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
    );
}

function equal(actual: unknown, expected: unknown) {
  if (!iguais(actual, expected)) {
    throw new Error(
      `Esperava ${Deno.inspect(expected)}, recebeu ${Deno.inspect(actual)}`,
    );
  }
}

function throws(fn: () => unknown, trecho: string) {
  try {
    fn();
  } catch (error) {
    if (error instanceof Error && error.message.includes(trecho)) return;
    throw new Error(`Erro inesperado: ${error}`);
  }
  throw new Error(`Esperava erro com "${trecho}"`);
}

// Nomes do cadastro (tabela vereadores) e da folha do portal, conferidos em 2026-11-25.
const cadastro = [
  { id: "adriana", nome: "Adriana Dias" },
  { id: "aparecida", nome: "Aparecida Cordeiro" },
  { id: "fernando", nome: "Fernando Silva" },
  { id: "marco", nome: "Marco Antônio" },
  { id: "reginaldo", nome: "Reginaldo Silva" },
  { id: "sirley", nome: "Sirley de Fatima" },
  { id: "welton", nome: "Welton da Silva" },
  { id: "wennder", nome: "Wennder Trindade" },
];

const linhaPortal = (
  nome: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  ano: "2026",
  mes: "7",
  nome,
  cargo: "VEREADOR",
  tipo_folha: "MENSAL",
  salario_base: "9.721,92",
  total_proventos: "9.721,92",
  total_liquido: "7.292,91",
  ...extra,
});

Deno.test("valores da folha em reais viram número", () => {
  equal(parseValorBRL("9.721,92"), 9721.92);
  equal(parseValorBRL("R$ 12.962,56"), 12962.56);
  equal(parseValorBRL("0,00"), 0);
  equal(parseValorBRL(""), null);
  equal(parseValorBRL("abc"), null);
  equal(parseValorBRL(null), null);
  equal(parseValorBRL("1.2,34"), null);
  equal(parseValorBRL("9.721,925"), null);
  equal(parseValorBRL(["9.721,92"]), null);
  equal(parseValorBRL(Number.NaN), null);
  equal(parseValorBRL(9721.92), 9721.92);
});

Deno.test("total da fonte só aceita inteiro não negativo", () => {
  equal(totalDaFonte(0), 0);
  equal(totalDaFonte("71"), 71);
  equal(totalDaFonte(false), null);
  equal(totalDaFonte(""), null);
  equal(totalDaFonte(-1), null);
  equal(totalDaFonte(1.5), null);
  equal(totalDaFonte(null), null);
});

Deno.test("período: sem nada usa o padrão; informado, precisa ser válido", () => {
  equal(competenciaDosParametros(undefined, null), null);
  equal(competenciaDosParametros("", ""), null);
  equal(competenciaDosParametros("2026", "07"), { ano: 2026, mes: 7 });
  equal(competenciaDosParametros(2026, 11), { ano: 2026, mes: 11 });
  throws(() => competenciaDosParametros(0, undefined), "ano e mes");
  throws(() => competenciaDosParametros(2026, true), "ano e mes");
  throws(() => competenciaDosParametros("2026", "13"), "ano e mes");
  throws(() => competenciaDosParametros("2026", undefined), "ano e mes");
});

Deno.test("mandato vale para a competência pelas datas do cadastro", () => {
  const v = { id: "x", nome: "X", inicio_mandato: "2025-01-01", fim_mandato: "2028-12-31" };
  equal(emMandatoNaCompetencia(v, "2026-11"), true);
  equal(emMandatoNaCompetencia(v, "2024-12"), false);
  equal(emMandatoNaCompetencia(v, "2029-01"), false);
  equal(emMandatoNaCompetencia({ id: "y", nome: "Y" }, "2026-11"), true);
});

Deno.test("nome civil da folha casa com o nome curto do cadastro", () => {
  equal(casarVereador("WENNDER TRINDADE E SILVA", cadastro), "wennder");
  equal(casarVereador("APARECIDA DIVANI ROCHA CORDEIRO", cadastro), "aparecida");
  equal(casarVereador("WELTON ETERNO DA SILVA", cadastro), "welton");
  equal(casarVereador("FERNANDO ABRAAO MAGALHAES SILVA", cadastro), "fernando");
  equal(casarVereador("REGINALDO MOREIRA DA SILVA", cadastro), "reginaldo");
  equal(casarVereador("MARCO ANTONIO ANTUNES DA CRUZ", cadastro), "marco");
  equal(casarVereador("SIRLEY DE FATIMA MENEZES WEHBE", cadastro), "sirley");
  equal(casarVereador("ADRIANA DIAS PINHEIRO", cadastro), "adriana");
  equal(casarVereador("FULANO DE TAL", cadastro), null);
});

Deno.test("dois vereadores possíveis para o mesmo nome é erro", () => {
  throws(
    () =>
      casarVereador("JOAO SILVA SANTOS", [
        { id: "a", nome: "João Silva" },
        { id: "b", nome: "João Santos" },
      ]),
    "mais de um vereador",
  );
});

Deno.test("só entra a folha MENSAL de vereador, com salário base como subsídio", () => {
  const folha = vereadoresDaFolhaMensal([
    linhaPortal("WENNDER TRINDADE E SILVA", {
      total_proventos: "12.962,56",
      total_liquido: "9.642,38",
    }),
    linhaPortal("WENNDER TRINDADE E SILVA", {
      tipo_folha: "ADIANTAMENTO 13º SALÁRIO",
      salario_base: "0,00",
      total_proventos: "4.860,96",
    }),
    linhaPortal("FULANO ASSESSOR", { cargo: "ASSESSOR PARLAMENTAR" }),
  ], 2026, 7);
  equal(folha, [{
    nome: "WENNDER TRINDADE E SILVA",
    subsidio: 9721.92,
    bruto: 12962.56,
    liquido: 9642.38,
  }]);
});

Deno.test("salário base zerado não vira subsídio", () => {
  const [linha] = vereadoresDaFolhaMensal(
    [linhaPortal("WENNDER TRINDADE E SILVA", { salario_base: "0,00" })],
    2026,
    7,
  );
  equal(linha.subsidio, null);
});

Deno.test("registro de outra competência ou linha mensal repetida falham", () => {
  throws(
    () => vereadoresDaFolhaMensal([linhaPortal("X Y", { mes: "8" })], 2026, 7),
    "fora da competência",
  );
  throws(
    () =>
      vereadoresDaFolhaMensal([
        linhaPortal("WENNDER TRINDADE E SILVA"),
        linhaPortal("Wennder Trindade e Silva"),
      ], 2026, 7),
    "duas vezes",
  );
});

Deno.test("plano grava subsídio, bruto e líquido e lista quem ficou de fora", () => {
  const plano = planejarCompetencia("2026-11", [
    { nome: "WENNDER TRINDADE E SILVA", subsidio: 9721.92, bruto: 9721.92, liquido: 7292.91 },
    { nome: "SUPLENTE NOVO", subsidio: 9721.92, bruto: 9721.92, liquido: 7292.91 },
    { nome: "WELTON ETERNO DA SILVA", subsidio: null, bruto: 9721.92, liquido: null },
    { nome: "ADRIANA DIAS PINHEIRO", subsidio: 9721.92, bruto: 0, liquido: 0 },
    { nome: "MARCO ANTONIO ANTUNES DA CRUZ", subsidio: 9721.92, bruto: null, liquido: null },
  ], cadastro);
  equal(plano.linhas, [
    {
      vereador_id: "wennder",
      competencia: "2026-11",
      subsidio_referencia: 9721.92,
      bruto: 9721.92,
      liquido: 7292.91,
    },
    {
      vereador_id: "welton",
      competencia: "2026-11",
      subsidio_referencia: 0,
      bruto: 9721.92,
      liquido: null,
    },
  ]);
  equal(plano.sem_cadastro, ["SUPLENTE NOVO"]);
  // Bruto ilegível é reportado; bruto zerado (mês sem pagamento) não.
  equal(plano.sem_bruto, ["MARCO ANTONIO ANTUNES DA CRUZ"]);
  equal(plano.ausentes, [
    "Aparecida Cordeiro",
    "Fernando Silva",
    "Reginaldo Silva",
    "Sirley de Fatima",
  ]);
});

Deno.test("vereador fora do mandato não conta como ausente da folha", () => {
  const plano = planejarCompetencia("2026-11", [
    { nome: "WENNDER TRINDADE E SILVA", subsidio: 9721.92, bruto: 9721.92, liquido: 7292.91 },
  ], [
    { id: "wennder", nome: "Wennder Trindade", inicio_mandato: "2025-01-01", fim_mandato: "2028-12-31" },
    { id: "antigo", nome: "Vereador Antigo", inicio_mandato: "2021-01-01", fim_mandato: "2024-12-31" },
  ]);
  equal(plano.ausentes, []);
  equal(plano.linhas.length, 1);
});

Deno.test("duas linhas da folha para o mesmo vereador é erro", () => {
  throws(
    () =>
      planejarCompetencia("2026-11", [
        { nome: "WENNDER TRINDADE E SILVA", subsidio: 1, bruto: 1, liquido: 1 },
        { nome: "WENNDER TRINDADE", subsidio: 1, bruto: 1, liquido: 1 },
      ], cadastro),
    "mesmo vereador",
  );
});

Deno.test("mês padrão segue Brasília na virada do mês", () => {
  equal(mesCorrenteBrasilia(new Date("2026-12-01T02:00:00Z")), { ano: 2026, mes: 11 });
  equal(mesCorrenteBrasilia(new Date("2026-12-01T04:00:00Z")), { ano: 2026, mes: 12 });
});
