/// <reference lib="deno.ns" />
import {
  fetchObrasOficiais,
  normalizarObraOficial,
  parseObrasRequest,
  planejarObras,
} from "./obras-nucleogov.ts";
import { obrasOficiais } from "../../../src/lib/obras-fontes.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Esperado ${JSON.stringify(expected)}, recebido ${
        JSON.stringify(actual)
      }`,
    );
  }
}
async function rejects(fn: () => unknown | Promise<unknown>, part: string) {
  try {
    await fn();
  } catch (error) {
    if (String(error).includes(part)) return;
    throw error;
  }
  throw new Error(`Esperada falha: ${part}`);
}
function row(id = 1, situacao = "Não Iniciada") {
  return {
    Id: id,
    Descricao: `Obra ${id}`,
    Situacao: situacao,
    ValorEmpenho: 1234.56,
    DataTermino: "01/01/2000",
    PercentualExecucaoFinanceira: 100,
    Endereco: "Rua pública",
    Fiscal: "Fiscal exemplo",
  };
}
function portal(
  rows: Record<string, unknown[]>,
  override?: (params: URLSearchParams) => unknown,
): typeof fetch {
  return (_url, init) => {
    const p = new URLSearchParams(String(init?.body));
    const result = override ? override(p) : p.has("multi_request")
      ? {
        orgaos: [{ id: "22", valor: "Executivo" }, {
          id: "55",
          valor: "Saúde",
        }],
      }
      : { dados: rows[p.get("id_orgao")!] || [], orgao_principal: null };
    return Promise.resolve(
      new Response(JSON.stringify(result), { status: 200 }),
    );
  };
}
Deno.test("situação oficial não é inferida de prazo vencido, percentual financeiro ou fiscal", () => {
  const result = normalizarObraOficial(row(), 22, "Executivo");
  equal(
    { status: result.status, empresa: result.empresa, valor: result.valor },
    { status: "Não Iniciada", empresa: null, valor: 1234.56 },
  );
  equal(
    normalizarObraOficial(row(1, "Em Execução"), 22, "Executivo").status,
    "em_andamento",
  );
  equal(
    normalizarObraOficial(row(1, "Situação nova"), 22, "Executivo").status,
    "Situação nova",
  );
});
Deno.test("coleta todos os órgãos e registra catálogo vazio por órgão sem paginação artificial", async () => {
  const result = await fetchObrasOficiais(portal({ "22": [row(1), row(2)] }));
  equal(result.obras.length, 2);
  equal(result.by_orgao.map((orgao) => [orgao.orgao_id, orgao.fetched]), [[
    22,
    2,
  ], [55, 0]]);
});
Deno.test("recusa filtro ignorado, envelope sem dados, órgão duplicado e catálogo vazio", async () => {
  const orgaos = {
    orgaos: [{ id: "22", valor: "Executivo" }, { id: "55", valor: "Saúde" }],
  };
  await rejects(
    () =>
      fetchObrasOficiais(
        portal({}, (p) =>
          p.has("multi_request")
            ? orgaos
            : { dados: [], orgao_principal: "22" }),
      ),
    "filtro ignorado",
  );
  await rejects(
    () =>
      fetchObrasOficiais(
        portal({}, (p) =>
          p.has("multi_request") ? orgaos : { orgao_principal: null }),
      ),
    "envelope inválido",
  );
  await rejects(
    () =>
      fetchObrasOficiais(
        portal({}, () => ({ orgaos: [orgaos.orgaos[0], orgaos.orgaos[0]] })),
      ),
    "órgão inválido ou repetido",
  );
  await rejects(() => fetchObrasOficiais(portal({})), "integralmente vazio");
});
Deno.test("recusa ID repetido entre órgãos, mudança de schema e HTTP de erro", async () => {
  await rejects(
    () => fetchObrasOficiais(portal({ "22": [row()], "55": [row()] })),
    "ID repetido",
  );
  await rejects(
    () =>
      normalizarObraOficial(
        { ...row(), ValorEmpenho: "1.234,56" },
        22,
        "Executivo",
      ),
    "valor inválido",
  );
  await rejects(
    () =>
      fetchObrasOficiais(() =>
        Promise.resolve(new Response("", { status: 503 }))
      ),
    "HTTP 503",
  );
});
Deno.test("preserva legados e distingue duas obras com descrição igual", () => {
  const legacy = [{
    id: "legado",
    nome: "Obra 1",
    status: "concluida",
    fonte_url: "https://piracanjuba.centi.com.br/contratos/1",
  }];
  const source = [
    normalizarObraOficial(row(), 22, "Executivo"),
    normalizarObraOficial({ ...row(2), Descricao: "Obra 1" }, 55, "Saúde"),
  ];
  const plan = planejarObras(legacy, source);
  equal([
    plan.inserts,
    plan.updates,
    plan.legacy_preserved,
    plan.conflicts.length,
  ], [2, 0, 1, 2]);
  equal(legacy[0].status, "concluida");
  equal(plan.upserts.map((obra) => obra.origem_chave), [
    "prefeitura:nucleogov:obra:22:1",
    "prefeitura:nucleogov:obra:55:2",
  ]);
});
Deno.test("ensaio repetido preserva IDs e não escreve payload JSONB apenas reordenado", () => {
  const source = normalizarObraOficial(row(), 22, "Executivo");
  const old = {
    ...source,
    id: "uuid-preservado",
    raw_payload: {
      obra: source.raw_payload.obra,
      orgao_nome: "Executivo",
      orgao_id: 22,
    },
  };
  const plan = planejarObras([old], [source]);
  equal([plan.inserts, plan.updates, plan.unchanged], [0, 0, 1]);
  equal(
    planejarObras([old], [{ ...source, status: "em_andamento" }]).updates,
    1,
  );
});
Deno.test("falha antes de escrita se obra oficial anterior desaparecer da fonte", async () => {
  const old = { ...normalizarObraOficial(row(), 22, "Executivo"), id: "uuid" };
  await rejects(
    () =>
      planejarObras([old], [normalizarObraOficial(row(2), 22, "Executivo")]),
    "anteriores ausentes",
  );
});
Deno.test("interface exclui inferências antes e depois da migration sem misturar poderes", () => {
  const legacy = { origem_chave: null };
  const official = { origem_chave: "prefeitura:nucleogov:obra:22:1" };
  equal(obrasOficiais([legacy]), []);
  equal(
    obrasOficiais([legacy, official, {
      origem_chave: "camara:nucleogov:obra:1",
    }]),
    [official],
  );
});

Deno.test("pedido aceita cron sem corpo e ensaio explícito, recusando JSON ou dryRun inválidos", async () => {
  equal(parseObrasRequest(""), { dryRun: false });
  equal(parseObrasRequest("   "), { dryRun: false });
  equal(parseObrasRequest("{}"), { dryRun: false });
  equal(parseObrasRequest('{"dryRun":true}'), { dryRun: true });
  equal(parseObrasRequest('{"dryRun":false}'), { dryRun: false });
  for (const value of ["null", "[]", "true", '{"dryRun":"true"}']) {
    await rejects(() => parseObrasRequest(value), "Corpo inválido");
  }
  await rejects(() => parseObrasRequest("{"), "JSON inválido");
});
