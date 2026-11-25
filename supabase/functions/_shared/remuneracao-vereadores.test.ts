/// <reference lib="deno.ns" />

import {
  casarVereador,
  mesCorrenteBrasilia,
  parseValorBRL,
  planejarCompetencia,
  vereadoresDaFolhaMensal,
} from "./remuneracao-vereadores.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Esperava ${JSON.stringify(expected)}, recebeu ${JSON.stringify(actual)}`,
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

Deno.test("plano grava subsídio, bruto e líquido e separa quem não está no cadastro", () => {
  const plano = planejarCompetencia("2026-11", [
    { nome: "WENNDER TRINDADE E SILVA", subsidio: 9721.92, bruto: 9721.92, liquido: 7292.91 },
    { nome: "SUPLENTE NOVO", subsidio: 9721.92, bruto: 9721.92, liquido: 7292.91 },
    { nome: "WELTON ETERNO DA SILVA", subsidio: null, bruto: 9721.92, liquido: null },
    { nome: "ADRIANA DIAS PINHEIRO", subsidio: 9721.92, bruto: 0, liquido: 0 },
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
