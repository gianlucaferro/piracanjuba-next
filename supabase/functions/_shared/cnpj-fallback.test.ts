/// <reference lib="deno.ns" />

import { consultarCnpjComFallback } from "./cnpj-fallback.ts";

function assertEquals(actual: unknown, expected: unknown, label = "valor") {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)}, got ${
        JSON.stringify(actual)
      }`,
    );
  }
}

Deno.test("usa OpenCNPJ quando BrasilAPI falha", async () => {
  const chamadas: string[] = [];
  const resultado = await consultarCnpjComFallback("11222333000144", [
    {
      nome: "brasilapi",
      consultar: () => {
        chamadas.push("brasilapi");
        return Promise.reject(new Error("timeout"));
      },
    },
    {
      nome: "opencnpj",
      consultar: () => {
        chamadas.push("opencnpj");
        return Promise.resolve({ razao_social: "EMPRESA FALLBACK LTDA" });
      },
    },
  ]);

  assertEquals(chamadas, ["brasilapi", "opencnpj"]);
  assertEquals(resultado.fonte, "opencnpj");
  assertEquals(resultado.row?.razao_social, "EMPRESA FALLBACK LTDA");
});

Deno.test("encerra na primeira fonte valida", async () => {
  const chamadas: string[] = [];
  const resultado = await consultarCnpjComFallback("11222333000144", [
    {
      nome: "brasilapi",
      consultar: () => {
        chamadas.push("brasilapi");
        return Promise.resolve({ razao_social: "EMPRESA PRIMARIA LTDA" });
      },
    },
    {
      nome: "opencnpj",
      consultar: () => {
        chamadas.push("opencnpj");
        return Promise.resolve({ razao_social: "NAO DEVE SER USADA" });
      },
    },
  ]);

  assertEquals(chamadas, ["brasilapi"]);
  assertEquals(resultado.fonte, "brasilapi");
});

Deno.test("propaga falha quando todas as fontes quebram", async () => {
  let mensagem = "";

  try {
    await consultarCnpjComFallback("11222333000144", [
      {
        nome: "brasilapi",
        consultar: () => Promise.reject(new Error("timeout")),
      },
      {
        nome: "opencnpj",
        consultar: () => Promise.reject(new Error("HTTP 503")),
      },
    ]);
  } catch (error) {
    mensagem = error instanceof Error ? error.message : String(error);
  }

  if (
    !mensagem.includes("brasilapi: timeout") ||
    !mensagem.includes("opencnpj: HTTP 503")
  ) {
    throw new Error(`falhas das fontes nao foram preservadas: ${mensagem}`);
  }
});
