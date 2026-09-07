/// <reference lib="deno.ns" />

import { type CentiCall, centiCall } from "./centi-client.ts";
import { fetchContratosPrefeitura } from "./nucleogov-contratos.ts";

function equals(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Esperado ${JSON.stringify(expected)}, recebido ${
        JSON.stringify(actual)
      }`,
    );
  }
}

async function rejects(run: () => Promise<unknown>, message: string) {
  try {
    await run();
  } catch (error) {
    if (error instanceof Error && error.message.includes(message)) return;
    throw error;
  }
  throw new Error(`Esperada falha: ${message}`);
}

const YEAR = new Date().getUTCFullYear();

const orgaos = [
  { id: "22", valor: "Poder Executivo" },
  { id: "55", valor: "Fundo Municipal de Saúde" },
];

function mock(
  handle: (call: CentiCall) => unknown,
  catalog: unknown = orgaos,
): typeof centiCall {
  return ((_, calls) => {
    const call = calls[0];
    return Promise.resolve({
      result: call.acao.endsWith("listarOrgaos") ? catalog : handle(call),
    });
  }) as typeof centiCall;
}

function contrato(id: number, orgao: number) {
  return { id, orgao, ano: YEAR };
}
function page(dados: unknown[], total = dados.length, orgao?: number) {
  return {
    dados,
    total,
    orgao_principal: null,
    filtros: { idOrgao: String(orgao) },
  };
}

Deno.test("contratos inclui saúde além do órgão principal e pagina cada órgão", async () => {
  const calls: unknown[] = [];
  const client = mock((call) => {
    const orgao = Number(call.extra?.orgao);
    calls.push([orgao, call.limit?.offset, call.extra?.ano]);
    const rows = orgao === 22
      ? [contrato(1, 22)]
      : [contrato(2, 55), contrato(3, 55)];
    return page(
      rows.slice(call.limit!.offset, call.limit!.offset + call.limit!.pageSize),
      rows.length,
    );
  });
  const result = await fetchContratosPrefeitura({
    dataset: "contratos",
    year: YEAR,
    pageSize: 1,
  }, client);
  equals(result.dados.map((row) => row.id), [1, 2, 3]);
  equals(
    result.by_orgao.map((row) => [row.orgao_id, row.fetched, row.pagesFetched]),
    [[22, 1, 1], [55, 2, 2]],
  );
  equals(result.complete, true);
  equals(result.total, 3);
  equals(calls.length, 3);
});

Deno.test("catálogo exclui a Câmara e allYears preserva consulta sem ano", async () => {
  const calls: CentiCall[] = [];
  const client = mock((call) => {
    calls.push(call);
    return page([contrato(1, 22)]);
  }, [
    { id: "11", valor: "Câmara Municipal" },
    { id: "22", valor: "Poder Executivo" },
  ]);
  await fetchContratosPrefeitura(
    { dataset: "contratos", allYears: true },
    client,
  );
  equals(calls.map((call) => call.extra), [{ orgao: "22" }]);
});

Deno.test("aditivos confirma o órgão pelo echo e mantém vínculo de contrato", async () => {
  const result = await fetchContratosPrefeitura(
    { dataset: "aditivos", year: YEAR },
    mock((call) => {
      const orgao = Number(call.extra?.orgao);
      return page([{ id: orgao, contrato: orgao + 100, ano: YEAR }], 1, orgao);
    }),
  );
  equals(result.total, 2);
  equals(result.complete, true);
  await rejects(
    () =>
      fetchContratosPrefeitura(
        { dataset: "aditivos" },
        mock(() => page([{ id: 1, contrato: 2, ano: YEAR }], 1, 22)),
      ),
    "não confirmou filtro",
  );
  await rejects(
    () =>
      fetchContratosPrefeitura(
        { dataset: "aditivos" },
        mock((call) =>
          page(
            [{ id: 1, contrato: null, ano: YEAR }],
            1,
            Number(call.extra?.orgao),
          )
        ),
      ),
    "sem contrato de origem",
  );
});

Deno.test("recusa retorno de outro órgão e identificadores duplicados entre órgãos", async () => {
  await rejects(
    () =>
      fetchContratosPrefeitura(
        { dataset: "contratos" },
        mock(() => page([contrato(1, 22)])),
      ),
    "órgão diferente",
  );
  await rejects(
    () =>
      fetchContratosPrefeitura(
        { dataset: "contratos" },
        mock((call) => page([contrato(1, Number(call.extra?.orgao))])),
      ),
    "ID repetido entre órgãos",
  );
});

Deno.test("recusa total ausente, total alterado e página incompleta", async () => {
  await rejects(
    () =>
      fetchContratosPrefeitura(
        { dataset: "contratos" },
        mock(() => ({ dados: [] })),
      ),
    "total válido",
  );
  await rejects(
    () =>
      fetchContratosPrefeitura(
        { dataset: "contratos", pageSize: 1 },
        mock((call) => {
          const offset = call.limit!.offset;
          return page(
            [contrato(offset + 1, Number(call.extra?.orgao))],
            offset === 0 ? 2 : 3,
          );
        }),
      ),
    "total mudou",
  );
  await rejects(
    () =>
      fetchContratosPrefeitura(
        { dataset: "contratos" },
        mock((call) => page([contrato(1, Number(call.extra?.orgao))], 2)),
      ),
    "página incompleta",
  );
});

Deno.test("limite de páginas reporta incompletude e não registra conclusão falsa", async () => {
  const result = await fetchContratosPrefeitura(
    { dataset: "contratos", pageSize: 1, maxPages: 1 },
    mock((call) =>
      page([contrato(Number(call.extra?.orgao), Number(call.extra?.orgao))], 2)
    ),
  );
  equals([
    result.complete,
    result.maxPagesReached,
    result.total,
    result.dados.length,
  ], [false, true, 4, 2]);
  equals(result.by_orgao.map((row) => row.complete), [false, false]);
});

Deno.test("zero explícito é válido e catálogo vazio ou repetido falha", async () => {
  const result = await fetchContratosPrefeitura(
    { dataset: "aditivos" },
    mock((call) => page([], 0, Number(call.extra?.orgao))),
  );
  equals([result.complete, result.total, result.by_orgao.length], [true, 0, 2]);
  await rejects(
    () =>
      fetchContratosPrefeitura(
        { dataset: "contratos" },
        mock(() => page([]), []),
      ),
    "sem órgãos",
  );
  await rejects(
    () =>
      fetchContratosPrefeitura(
        { dataset: "contratos" },
        mock(() => page([]), [orgaos[0], orgaos[0]]),
      ),
    "identificador único",
  );
});

Deno.test("recusa página repetida e payload com dados fora de lista", async () => {
  await rejects(
    () =>
      fetchContratosPrefeitura(
        { dataset: "contratos", pageSize: 1 },
        mock((call) =>
          page(
            [contrato(Number(call.extra?.orgao), Number(call.extra?.orgao))],
            2,
          )
        ),
      ),
    "ID inválido ou duplicado",
  );
  await rejects(
    () =>
      fetchContratosPrefeitura(
        { dataset: "contratos" },
        mock(() => ({ dados: {}, total: 0 })),
      ),
    "sem dados ou total válido",
  );
});

Deno.test("recusa exercício ignorado pela fonte e limita catálogo antes de coletar", async () => {
  await rejects(
    () =>
      fetchContratosPrefeitura(
        { dataset: "contratos", year: YEAR },
        mock((call) =>
          page([
            {
              ...contrato(Number(call.extra?.orgao), Number(call.extra?.orgao)),
              ano: YEAR - 1,
            },
          ])
        ),
      ),
    "não respeitou ano",
  );
  await rejects(
    () =>
      fetchContratosPrefeitura(
        { dataset: "aditivos", year: YEAR },
        mock((call) =>
          page(
            [
              { id: Number(call.extra?.orgao), contrato: 999, ano: YEAR - 1 },
            ],
            1,
            Number(call.extra?.orgao),
          )
        ),
      ),
    "não respeitou ano",
  );
  let calls = 0;
  await rejects(
    () =>
      fetchContratosPrefeitura(
        { dataset: "contratos" },
        mock(
          () => {
            calls++;
            return page([]);
          },
          Array.from(
            { length: 101 },
            (_, i) => ({ id: 100 + i, valor: `Órgão ${i}` }),
          ),
        ),
      ),
    "excedeu 100 órgãos",
  );
  equals(calls, 0);
});
