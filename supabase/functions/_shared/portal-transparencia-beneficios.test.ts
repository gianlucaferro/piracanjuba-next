/// <reference lib="deno.ns" />

import {
  fetchPortalBenefitData,
  PORTAL_BENEFIT_PROGRAMS,
  PortalApiError,
  summarizePortalBenefitItems,
  validatePortalBenefitItems,
} from "./portal-transparencia-beneficios.ts";

function assertEquals(actual: unknown, expected: unknown, label = "valor") {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label}: esperado ${JSON.stringify(expected)}, recebido ${
        JSON.stringify(actual)
      }`,
    );
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const bolsaFamilia = PORTAL_BENEFIT_PROGRAMS.find(
  (program) => program.codigo === "bolsa_familia",
)!;

Deno.test("usa somente endpoints confirmados no Swagger oficial", () => {
  assertEquals(
    PORTAL_BENEFIT_PROGRAMS.map((program) => program.endpoint),
    [
      "novo-bolsa-familia-por-municipio",
      "bpc-por-municipio",
      "safra-por-municipio",
      "peti-por-municipio",
      "seguro-defeso-por-municipio",
    ],
  );
});

Deno.test("soma valores e beneficiarios sem criar beneficiario ficticio", () => {
  const items = validatePortalBenefitItems(
    [
      { valor: 100.5, quantidadeBeneficiados: 2 },
      { valor: "20", quantidadeBeneficiados: "3" },
    ],
    bolsaFamilia.endpoint,
  );

  assertEquals(
    summarizePortalBenefitItems(items),
    { beneficiarios: 5, valorPago: 120.5 },
  );
});

Deno.test("rejeita item sem quantidade em vez de assumir um beneficiario", () => {
  let error: unknown;
  try {
    validatePortalBenefitItems(
      [{ valor: 100 }],
      bolsaFamilia.endpoint,
    );
  } catch (caught) {
    error = caught;
  }

  assert(error instanceof PortalApiError, "deveria lançar PortalApiError");
  assert(
    (error as Error).message.includes("quantidadeBeneficiados"),
    "deveria identificar o campo ausente",
  );
});

Deno.test("200 com lista vazia e o unico caminho para no_data", async () => {
  const result = await fetchPortalBenefitData(
    bolsaFamilia,
    "202606",
    "test-key",
    {
      fetchImpl: (() =>
        Promise.resolve(
          new Response("[]", {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        )) as typeof fetch,
    },
  );

  assertEquals(result.status, "no_data");
  assertEquals(result.items, []);
});

for (const status of [204, 403, 404]) {
  Deno.test(`HTTP ${status} falha de forma explicita`, async () => {
    let error: unknown;
    try {
      await fetchPortalBenefitData(
        bolsaFamilia,
        "202606",
        "test-key",
        {
          fetchImpl: (() =>
            Promise.resolve(
              new Response(status === 204 ? null : "erro da fonte", {
                status,
              }),
            )) as typeof fetch,
        },
      );
    } catch (caught) {
      error = caught;
    }

    assert(error instanceof PortalApiError, "deveria lançar PortalApiError");
    assertEquals((error as PortalApiError).status, status);
  });
}

Deno.test("pagina ate o ultimo lote e preserva todos os registros", async () => {
  const pages = [
    [
      { valor: 10, quantidadeBeneficiados: 1 },
      { valor: 20, quantidadeBeneficiados: 2 },
    ],
    [{ valor: 30, quantidadeBeneficiados: 3 }],
  ];
  let calls = 0;

  const result = await fetchPortalBenefitData(
    bolsaFamilia,
    "202606",
    "test-key",
    {
      pageSize: 2,
      fetchImpl: ((input) => {
        const url = new URL(String(input));
        const page = Number(url.searchParams.get("pagina"));
        calls++;
        return Promise.resolve(
          new Response(JSON.stringify(pages[page - 1] ?? []), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }) as typeof fetch,
    },
  );

  assertEquals(calls, 2);
  assertEquals(result.pagesFetched, 2);
  assertEquals(result.items.length, 3);
  assertEquals(
    summarizePortalBenefitItems(result.items),
    { beneficiarios: 6, valorPago: 60 },
  );
});

Deno.test("rejeita payload que nao seja uma lista", async () => {
  let error: unknown;
  try {
    await fetchPortalBenefitData(
      bolsaFamilia,
      "202606",
      "test-key",
      {
        fetchImpl: (() =>
          Promise.resolve(
            new Response('{"erro":"schema inesperado"}', {
              status: 200,
              headers: { "content-type": "application/json" },
            }),
          )) as typeof fetch,
      },
    );
  } catch (caught) {
    error = caught;
  }

  assert(error instanceof PortalApiError, "deveria rejeitar o payload");
  assert(
    (error as Error).message.includes("era esperada uma lista"),
    "deveria informar a divergencia de schema",
  );
});
