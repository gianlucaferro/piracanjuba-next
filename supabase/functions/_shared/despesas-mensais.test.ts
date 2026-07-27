/// <reference lib="deno.ns" />

import {
  canonicalizeMonthlyExpense,
  parseExpenseValue,
} from "./despesas-mensais.ts";

function assertEquals(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label}: esperado ${JSON.stringify(expected)}, recebido ${
        JSON.stringify(actual)
      }`,
    );
  }
}

Deno.test("converte números e moeda brasileira do relatório", () => {
  assertEquals(
    parseExpenseValue(15_150_581.05000001),
    15_150_581.05000001,
    "número JSON",
  );
  assertEquals(
    parseExpenseValue("15.150.581,05"),
    15_150_581.05,
    "moeda brasileira",
  );
});

Deno.test("normaliza as três fases do gasto mensal", () => {
  const row = canonicalizeMonthlyExpense(
    {
      total_empenhado: 15_150_581.05000001,
      total_liquidado: 14_429_312.06000001,
      total_pago: 14_026_446.430000005,
    },
    "2026-06",
    "2026-07-27T10:00:00.000Z",
  );

  assertEquals(row.competencia, "2026-06", "competência");
  assertEquals(row.valor_empenhado, 15_150_581.05, "empenhado");
  assertEquals(row.valor_liquidado, 14_429_312.06, "liquidado");
  assertEquals(row.valor_pago, 14_026_446.43, "pago");
});

Deno.test("rejeita relatório incompleto ou negativo", () => {
  let message = "";
  try {
    canonicalizeMonthlyExpense(
      {
        total_empenhado: 10,
        total_liquidado: null,
        total_pago: -1,
      },
      "2026-06",
      "2026-07-27T10:00:00.000Z",
    );
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  if (!message.includes("total_liquidado")) {
    throw new Error(`relatório inválido não foi rejeitado: ${message}`);
  }
});
