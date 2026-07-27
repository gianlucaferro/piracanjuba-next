/// <reference lib="deno.ns" />

import {
  canonicalizeMonthlyRevenue,
  parseCentiMoney,
  type ReceitaCentiItem,
} from "./receitas-mensais.ts";

function assertEquals(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label}: esperado ${JSON.stringify(expected)}, recebido ${
        JSON.stringify(actual)
      }`,
    );
  }
}

function item(
  CodigoElemento: string,
  ValoReceitaAcumuladoMes: string,
): ReceitaCentiItem {
  return { CodigoElemento, ValoReceitaAcumuladoMes };
}

Deno.test("converte moeda do portal com tres casas decimais", () => {
  assertEquals(parseCentiMoney("4.053.092,320"), 4_053_092.32, "valor");
  assertEquals(parseCentiMoney("-810.618,420"), -810_618.42, "dedução");
});

Deno.test("deduplica codigos e separa receitas por esfera", () => {
  const source = [
    item("1.7.1.0.00.0.0", "5.000.000,000"),
    item("1.7.1.1.51.0.0", "4.000.000,000"),
    item("1.7.1.1.51.0.0", "4.000.000,000"),
    item("1.7.1.1.52.0.0", "200.000,000"),
    item("2.4.1.0.00.0.0", "300.000,000"),
    item("91.7.1.0.00.0.0", "-840.000,000"),
    item("91.7.1.1.51.0.0", "-800.000,000"),
    item("91.7.1.1.52.0.0", "-40.000,000"),
    item("1.7.2.0.00.0.0", "3.000.000,000"),
    item("1.7.2.1.50.0.0", "2.000.000,000"),
    item("1.7.2.1.51.0.0", "500.000,000"),
    item("1.7.2.1.52.0.0", "100.000,000"),
    item("2.4.2.0.00.0.0", "250.000,000"),
    item("91.7.2.0.00.0.0", "-520.000,000"),
    item("91.7.2.1.50.0.0", "-400.000,000"),
    item("91.7.2.1.51.0.0", "-100.000,000"),
    item("91.7.2.1.52.0.0", "-20.000,000"),
    item("1.1.0.0.00.0.0", "1.900.000,000"),
    item("1.2.0.0.00.0.0", "150.000,000"),
    item("1.3.0.0.00.0.0", "80.000,000"),
    item("1.6.0.0.00.0.0", "20.000,000"),
    item("1.9.0.0.00.0.0", "50.000,000"),
  ];

  const rows = canonicalizeMonthlyRevenue(source, "2026-06");
  const federal = rows.filter((row) => row.esfera === "federal");
  const estadual = rows.filter((row) => row.esfera === "estadual");
  const municipal = rows.filter((row) => row.esfera === "municipal");

  assertEquals(
    federal.reduce((total, row) => total + row.valor_bruto, 0),
    5_300_000,
    "federal bruto",
  );
  assertEquals(
    federal.reduce((total, row) => total + row.valor_liquido, 0),
    4_460_000,
    "federal líquido",
  );
  assertEquals(
    estadual.reduce((total, row) => total + row.valor_bruto, 0),
    3_250_000,
    "estadual bruto",
  );
  assertEquals(
    estadual.reduce((total, row) => total + row.valor_liquido, 0),
    2_730_000,
    "estadual líquido",
  );
  assertEquals(
    municipal.reduce((total, row) => total + row.valor_liquido, 0),
    2_200_000,
    "receita própria",
  );
  assertEquals(
    federal.find((row) => row.categoria === "Outros repasses federais")
      ?.valor_bruto,
    800_000,
    "outros federais",
  );
});

Deno.test("rejeita subtotal maior que o total oficial", () => {
  let message = "";
  try {
    canonicalizeMonthlyRevenue(
      [
        item("1.7.1.0.00.0.0", "100,000"),
        item("1.7.1.1.51.0.0", "90,000"),
        item("1.7.1.1.52.0.0", "20,000"),
      ],
      "2026-06",
    );
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  if (!message.includes("inconsistentes")) {
    throw new Error(`inconsistência não detectada: ${message}`);
  }
});
