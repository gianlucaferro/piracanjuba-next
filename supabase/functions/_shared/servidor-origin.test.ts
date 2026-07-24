import {
  normalizeSourceIdentifier,
  planLegacyOriginAdoptions,
  servidorOriginKey,
} from "./servidor-origin.ts";

function assertEquals(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`expected ${String(expected)}, got ${String(actual)}`);
  }
}

Deno.test("normaliza identificador de origem sem usar o nome da pessoa", () => {
  assertEquals(normalizeSourceIdentifier("  ab  123  "), "AB 123");
  assertEquals(
    servidorOriginKey("Prefeitura", "centi-22", " 0051 "),
    "prefeitura:centi-22:0051",
  );
});

Deno.test("recusa identidade sem identificador de origem", () => {
  let message = "";
  try {
    servidorOriginKey("prefeitura", "importacao", "  ");
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  if (!message.includes("Identificador de origem")) {
    throw new Error(`erro esperado nao ocorreu: ${message}`);
  }
});

Deno.test("adota identidade legada somente em correspondencia um para um", () => {
  const adoptions = planLegacyOriginAdoptions(
    [{
      nome: "MARIA DA SILVA",
      origemChave: "camara:centi-1:001",
    }],
    [{
      id: "legado-1",
      nome: "Maria da Silva",
      origem_chave: "camara:nome:MARIA DA SILVA",
    }],
    "camara:nome:",
  );

  assertEquals(adoptions.length, 1);
  assertEquals(adoptions[0].id, "legado-1");
  assertEquals(adoptions[0].nextOrigin, "camara:centi-1:001");
});

Deno.test("nao adota homonimos nem sobrescreve origem existente", () => {
  const ambiguous = planLegacyOriginAdoptions(
    [
      { nome: "JOSE SOUZA", origemChave: "camara:centi-1:010" },
      { nome: "JOSE SOUZA", origemChave: "camara:centi-2:020" },
    ],
    [{
      id: "legado-jose",
      nome: "JOSE SOUZA",
      origem_chave: "camara:nome:JOSE SOUZA",
    }],
    "camara:nome:",
  );
  assertEquals(ambiguous.length, 0);

  let conflictMessage = "";
  try {
    planLegacyOriginAdoptions(
      [{ nome: "ANA LIMA", origemChave: "camara:centi-1:030" }],
      [
        {
          id: "legado-ana",
          nome: "ANA LIMA",
          origem_chave: "camara:nome:ANA LIMA",
        },
        {
          id: "atual-ana",
          nome: "ANA LIMA",
          origem_chave: "camara:centi-1:030",
        },
      ],
      "camara:nome:",
    );
  } catch (error) {
    conflictMessage = error instanceof Error ? error.message : String(error);
  }
  if (!conflictMessage.includes("Origem atual e legada coexistem")) {
    throw new Error(`conflito de identidade nao detectado: ${conflictMessage}`);
  }
});
