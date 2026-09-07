/// <reference lib="deno.ns" />
import { fetchFolhaPrefeitura } from "./nucleogov-folha.ts";

type Row = Record<string, unknown>;
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}
async function rejects(action: () => Promise<unknown>, message: string) {
  try {
    await action();
  } catch (error) {
    if (String(error).includes(message)) return;
    throw error;
  }
  throw new Error(`Expected rejection: ${message}`);
}
const options = {
  year: 2026,
  month: 8,
  forced: true,
  pageSize: 2,
  maxPages: 3,
};
function row(id: number, orgao: number, month = 8, type = "MENSAL"): Row {
  return {
    id,
    orgao_id: orgao,
    ano: 2026,
    mes: month,
    nome: `Servidor teste ${id}`,
    tipo_folha: type,
    tipo_movimentacao: "NORMAL",
  };
}
async function withPortal(
  respond: (params: Record<string, string>) => unknown,
  action: () => Promise<void>,
) {
  const original = globalThis.fetch;
  globalThis.fetch = ((_input: unknown, init: RequestInit) => {
    const calls = JSON.parse(
      new URLSearchParams(String(init.body)).get("params")!,
    );
    const payload = Object.fromEntries(
      Object.entries(calls).map(([key, params]) => [
        key,
        respond(params as Record<string, string>),
      ]),
    );
    return Promise.resolve(
      new Response(JSON.stringify(payload), { status: 200 }),
    );
  }) as typeof fetch;
  try {
    await action();
  } finally {
    globalThis.fetch = original;
  }
}
const orgaos = [
  { id: "22", valor: "Executivo" },
  { id: "55", valor: "Saude" },
  { id: "56", valor: "Meio ambiente" },
];
function portalFor(
  monthRows: Record<string, Row[]>,
  calls: Record<string, string>[] = [],
) {
  return (params: Record<string, string>) => {
    calls.push(params);
    if (params.acao.endsWith("listarOrgaos")) return orgaos;
    if (!params.orgao) throw new Error("Consulta sem orgao");
    const all = monthRows[`${params.mes}:${params.orgao}`] ?? [];
    const [offset, size] = params.limit.split(",").map(Number);
    return {
      dados: all.slice(offset, offset + size),
      total: all.length,
      orgao_filtrado: params.orgao,
    };
  };
}

Deno.test("folha consulta todos os orgaos, pagina e inclui totais zero", async () => {
  const calls: Record<string, string>[] = [];
  await withPortal(
    portalFor({
      "8:22": [row(1, 22)],
      "8:55": [row(2, 55), row(3, 55), row(4, 55)],
    }, calls),
    async () => {
      const result = await fetchFolhaPrefeitura(options);
      equal(result.total, 4);
      equal(result.dados.map((item) => item.id), [1, 2, 3, 4]);
      equal(result.by_orgao.map((item) => [item.orgao_id, item.source_total]), [
        [22, 1],
        [55, 3],
        [56, 0],
      ]);
      equal(result.complete, true);
      equal(calls.filter((c) => c.orgao === "55").map((c) => c.limit), [
        "0, 2",
        "2, 2",
      ]);
    },
  );
});

Deno.test("folha so recua competencia apos consultar todos os orgaos", async () => {
  const calls: Record<string, string>[] = [];
  await withPortal(portalFor({ "8:55": [row(2, 55)] }, calls), async () => {
    const result = await fetchFolhaPrefeitura({
      ...options,
      month: 9,
      forced: false,
    });
    equal(result.scope, "2026-08");
    equal(calls.filter((c) => c.mes === "9").map((c) => c.orgao).sort(), [
      "22",
      "55",
      "56",
    ]);
    equal(result.total, 1);
  });
});

Deno.test("folha aceita competencia explicita vazia sem importar mes anterior", async () => {
  await withPortal(portalFor({ "8:55": [row(2, 55)] }), async () => {
    const result = await fetchFolhaPrefeitura({ ...options, month: 9 });
    equal(result.scope, "2026-09");
    equal(result.total, 0);
    equal(result.by_orgao.length, 3);
  });
});

Deno.test("folha rejeita fonte que ignora o filtro e retorna orgao principal", async () => {
  await withPortal(
    (p) =>
      p.acao.endsWith("listarOrgaos")
        ? orgaos
        : { dados: [], total: 0, orgao_filtrado: "22" },
    async () => {
      await rejects(
        () => fetchFolhaPrefeitura(options),
        "nao confirmou filtro",
      );
    },
  );
});

Deno.test("folha rejeita paginacao incompleta antes de entregar dados para escrita", async () => {
  await withPortal(
    portalFor({ "8:55": [row(2, 55), row(3, 55), row(4, 55)] }),
    async () => {
      await rejects(
        () => fetchFolhaPrefeitura({ ...options, maxPages: 1 }),
        "paginacao incompleta",
      );
    },
  );
});

Deno.test("folha rejeita lista de orgaos vazia", async () => {
  await withPortal(() => [], async () => {
    await rejects(() => fetchFolhaPrefeitura(options), "lista de orgaos vazia");
  });
});

Deno.test("folha rejeita ausencia de total em vez de interpretar fonte vazia", async () => {
  await withPortal(
    (p) =>
      p.acao.endsWith("listarOrgaos")
        ? orgaos
        : { dados: [], orgao_filtrado: p.orgao },
    async () => {
      await rejects(() => fetchFolhaPrefeitura(options), "sem total");
    },
  );
});

Deno.test("folha rejeita ids reutilizados entre orgaos", async () => {
  await withPortal(
    portalFor({ "8:22": [row(1, 22)], "8:55": [row(1, 55)] }),
    async () => {
      await rejects(
        () => fetchFolhaPrefeitura(options),
        "reutilizado entre orgaos",
      );
    },
  );
});

Deno.test("folha preserva pagamentos de tipos distintos no mesmo vinculo", async () => {
  await withPortal(
    portalFor({ "8:22": [row(1, 22), row(1, 22, 8, "13 SALARIO")] }),
    async () => {
      const result = await fetchFolhaPrefeitura(options);
      equal(result.total, 2);
    },
  );
});

Deno.test("folha rejeita competencia diferente da requisitada", async () => {
  await withPortal(portalFor({ "8:22": [row(1, 22, 7)] }), async () => {
    await rejects(() => fetchFolhaPrefeitura(options), "fora do escopo");
  });
});

Deno.test("folha detecta pagina repetida mesmo quando total parece completo", async () => {
  await withPortal((p) =>
    p.acao.endsWith("listarOrgaos") ? orgaos : {
      dados: p.orgao === "22" ? [row(1, 22), row(2, 22)] : [],
      total: p.orgao === "22" ? 4 : 0,
      orgao_filtrado: p.orgao,
    }, async () => {
    await rejects(() => fetchFolhaPrefeitura(options), "registro repetido");
  });
});
