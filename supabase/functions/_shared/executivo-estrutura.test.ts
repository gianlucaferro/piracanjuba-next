/// <reference lib="deno.ns" />

import {
  fetchSecretariasOficiais,
  parseSecretariasOficiais,
  planejarSecretarias,
  type SecretariaExistente,
} from "./executivo-estrutura.ts";

function assertEquals(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Esperado ${JSON.stringify(expected)}, recebido ${
        JSON.stringify(actual)
      }`,
    );
  }
}

async function rejects(fn: () => unknown | Promise<unknown>, message: string) {
  try {
    await fn();
  } catch (error) {
    if (error instanceof Error && error.message.includes(message)) return;
    throw error;
  }
  throw new Error(`Esperada falha contendo: ${message}`);
}

function item(
  id: number,
  nome = "Secretaria de Saúde",
  gestor = "Gestora Exemplo",
) {
  return {
    id,
    title: { rendered: nome },
    acf: { gestor_nome: gestor },
    link: `https://piracanjuba.go.gov.br/estrutura/secretaria-${id}/`,
  };
}

function existente(id: string, nome: string): SecretariaExistente {
  return {
    id,
    nome,
    secretario_nome: "Anterior",
    fonte_url: "https://piracanjuba.go.gov.br/secretariado/",
  };
}

function response(rows: unknown, pages = 1, total = 1) {
  return new Response(JSON.stringify(rows), {
    headers: { "x-wp-totalpages": String(pages), "x-wp-total": String(total) },
  });
}

Deno.test("lê estrutura atual e ignora gabinetes sem misturar gestores", () => {
  const source = parseSecretariasOficiais([
    item(1, "Secretaria de Educa&#231;&#227;o", "Gestora\u2060 Exemplo"),
    item(2, "Gabinete da Prefeita"),
  ]);
  assertEquals(source, [{
    id: 1,
    nome: "Secretaria de Educação",
    gestor: "Gestora Exemplo",
    fonte_url: item(1).link,
  }]);
});

Deno.test("recusa secretaria sem gestor e fonte externa", async () => {
  await rejects(
    () => parseSecretariasOficiais([item(1, "Secretaria de Saúde", " ")]),
    "sem identificação ou gestor",
  );
  await rejects(
    () =>
      parseSecretariasOficiais([{
        ...item(1),
        link: "https://example.com/estrutura/saude",
      }]),
    "fora da estrutura oficial",
  );
});

Deno.test("percorre todas as páginas antes de devolver a coleta", async () => {
  const calls: number[] = [];
  const fetcher: typeof fetch = (url) => {
    const page = Number(new URL(String(url)).searchParams.get("page"));
    calls.push(page);
    return Promise.resolve(response([item(page)], 2, 2));
  };
  const source = await fetchSecretariasOficiais(fetcher);
  assertEquals(calls, [1, 2]);
  assertEquals(source.map((row) => row.id), [1, 2]);
});

Deno.test("recusa paginação incompleta, vazia, duplicada ou alterada", async () => {
  await rejects(
    () =>
      fetchSecretariasOficiais(() =>
        Promise.resolve(response([item(1)], 1, 2))
      ),
    "Coleta incompleta",
  );
  await rejects(
    () => fetchSecretariasOficiais(() => Promise.resolve(response([], 1, 1))),
    "Página vazia",
  );
  await rejects(
    () =>
      fetchSecretariasOficiais(() =>
        Promise.resolve(response([item(1)], 2, 2))
      ),
    "repetida",
  );
  await rejects(() =>
    fetchSecretariasOficiais((url) => {
      const page = Number(new URL(String(url)).searchParams.get("page"));
      return Promise.resolve(response([item(page)], 2, page === 1 ? 2 : 3));
    }), "mudou durante");
});

Deno.test("recusa HTTP200 com HTML, catálogo sem secretarias e erro HTTP", async () => {
  await rejects(
    () =>
      fetchSecretariasOficiais(() =>
        Promise.resolve(new Response("<html>Site novo</html>"))
      ),
    "Paginação inválida",
  );
  await rejects(
    () =>
      fetchSecretariasOficiais(() =>
        Promise.resolve(response([item(1, "Gabinete")]))
      ),
    "sem secretarias",
  );
  await rejects(
    () =>
      fetchSecretariasOficiais(() =>
        Promise.resolve(new Response("", { status: 503 }))
      ),
    "HTTP 503",
  );
});

Deno.test("preserva IDs e atualiza somente nome e fonte com alias confirmado", () => {
  const source = parseSecretariasOficiais([
    item(1, "Secretaria de Agricultura"),
    item(2, "Secretaria de Esporte Lazer e Turismo"),
  ]);
  const plan = planejarSecretarias([
    existente("agro", "Secretaria de Agricultura (SAMARH)"),
    existente("esporte", "Secretaria de Esporte, Lazer e Turismo"),
  ], source);
  assertEquals(plan.matched, 2);
  assertEquals(plan.errors, []);
  assertEquals(plan.updates[0], {
    id: "agro",
    patch: { secretario_nome: "Gestora Exemplo", fonte_url: item(1).link },
  });
});

Deno.test("não atribui gestor por sobreposição parcial nem correspondência ambígua", () => {
  const source = parseSecretariasOficiais([
    item(1, "Secretaria de Saúde"),
    item(2, "Secretaria de Obras"),
    item(3, "Secretaria de Obras"),
    item(4, "Secretaria de Educação e Cultura"),
  ]);
  const plan = planejarSecretarias([
    existente("saude", "Secretaria de Saúde"),
    existente("obras", "Secretaria de Obras"),
    existente("educacao", "Secretaria de Educação"),
  ], source);
  assertEquals(plan.updates.map((row) => row.id), ["saude"]);
  assertEquals(plan.errors.length, 2);
});

Deno.test("distingue confirmação sem mudança de fonte vazia", async () => {
  const source = parseSecretariasOficiais([item(1)]);
  const plan = planejarSecretarias([{
    ...existente("saude", "Secretaria de Saúde"),
    secretario_nome: "Gestora Exemplo",
    fonte_url: item(1).link,
  }], source);
  assertEquals({
    matched: plan.matched,
    unchanged: plan.unchanged,
    updates: plan.updates,
  }, { matched: 1, unchanged: 1, updates: [] });
  await rejects(
    () => planejarSecretarias([existente("saude", "Secretaria de Saúde")], []),
    "Nenhuma secretaria",
  );
});
