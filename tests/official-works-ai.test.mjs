import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const official = Array.from({ length: 20 }, (_, id) => ({
  nome: `Obra oficial ${id}`, origem_chave: `prefeitura:nucleogov:obra:1:${id}`,
  status: "Concluída", valor: 100, local: "Centro", empresa: "Empresa fixture",
  fonte_url: "https://acessoainformacao.piracanjuba.go.gov.br/cidadao/informacao/obras",
}));
const legacy = Array.from({ length: 48 }, (_, id) => ({
  nome: `Obra inferida LEGADA ${id}`, origem_chave: null, status: "Em andamento",
}));

function clientFor(works, unavailable = false) {
  const traces = [];
  return {
    traces,
    from(table) {
      const trace = { table, operations: [] };
      traces.push(trace);
      let rows = table === "obras" ? works : [];
      let countRequested = false, head = false, max = Infinity;
      const builder = {
        select(_columns, options = {}) { countRequested = options.count === "exact"; head = !!options.head; return this; },
        like(column, pattern) {
          trace.operations.push("like");
          assert.equal(column, "origem_chave");
          assert.equal(pattern, "prefeitura:nucleogov:obra:%");
          rows = rows.filter(row => typeof row[column] === "string" && row[column].startsWith(pattern.slice(0, -1)));
          return this;
        },
        order() { return this; },
        limit(value) { trace.operations.push("limit"); max = value; return this; },
        eq() { return this; }, not() { return this; }, in() { return this; },
        then(resolve, reject) {
          const result = table === "obras" && unavailable
            ? { data: null, count: null, error: { message: "coluna ainda indisponível" } }
            : { data: head ? null : rows.slice(0, max), count: countRequested ? rows.length : null, error: null };
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

async function load(slug, client) {
  const file = path.join(root, "supabase/functions", slug, "index.ts");
  let source = await readFile(file, "utf8");
  if (slug === "chatbot") source += "\nglobalThis.__domains = DOMAINS;";
  const compiled = stripTypeScriptTypes(source.replace(/^import[\s\S]*?;\n/gm, ""));
  const prompts = [];
  const sandbox = {
    exports: {}, console, Request, Response, URL, TextEncoder,
    Deno: { env: { get: () => "fixture-sem-segredo" }, serve: callback => { sandbox.handler = callback; } },
    createClient: () => client,
    buildBenefitContextRows: () => [],
    fetch: async (_url, options) => {
      // Intercepta a etapa de envio: nenhum socket ou provedor de IA é chamado.
      prompts.push(JSON.parse(options.body).messages[0].content);
      return new Response("simulado", { status: 200 });
    },
  };
  vm.runInNewContext(compiled, sandbox, { filename: file });
  return { domains: sandbox.__domains, handler: sandbox.handler, prompts };
}

test("chatbot conta e lista apenas obras oficiais, distinguindo total e amostra", async () => {
  const client = clientFor([...legacy, ...official]);
  const loaded = await load("chatbot", client);
  const totals = await loaded.domains.find(domain => domain.keys.includes("quantas")).run(client);
  const works = await loaded.domains.find(domain => domain.keys.includes("obra")).run(client);
  assert.match(totals, /Obras no cadastro oficial municipal importado: 20/);
  assert.match(works, /20 registros; amostra de 15/);
  assert.match(works, /situação declarada: Concluída/);
  assert.match(works, /Fonte: https:\/\/acessoainformacao/);
  assert.doesNotMatch(works, /LEGADA/);
  assert.equal(loaded.prompts.length, 0);
  for (const trace of client.traces.filter(trace => trace.table === "obras")) {
    assert.equal(trace.operations[0], "like");
  }
});

for (const unavailable of [false, true]) {
  test(`chatbot falha fechado com cadastro ${unavailable ? "indisponível" : "em coleta"}`, async () => {
    const client = clientFor(legacy, unavailable);
    const loaded = await load("chatbot", client);
    const totals = await loaded.domains.find(domain => domain.keys.includes("quantas")).run(client);
    const works = await loaded.domains.find(domain => domain.keys.includes("obra")).run(client);
    assert.doesNotMatch(totals, /Obras.*: (0|48)/);
    assert.match(works, unavailable ? /indisponível/ : /em coleta/);
    assert.doesNotMatch(works, /LEGADA/);
    assert.equal(loaded.prompts.length, 0);
  });
}

test("ai-search recebe somente obras oficiais e total exato no contexto", async () => {
  const client = clientFor([...legacy, ...official]);
  const loaded = await load("ai-search", client);
  const response = await loaded.handler(new Request("https://example.test", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: "Quantas obras há?" }),
  }));
  assert.equal(response.status, 200);
  assert.equal(loaded.prompts.length, 1);
  const prompt = loaded.prompts[0];
  assert.match(prompt, /20 registros; amostra de 10/);
  assert.match(prompt, /situação declarada: Concluída/);
  assert.doesNotMatch(prompt, /LEGADA/);
  assert.deepEqual(client.traces.find(trace => trace.table === "obras").operations, ["like", "limit"]);
});

for (const unavailable of [false, true]) {
  test(`ai-search falha fechado com cadastro ${unavailable ? "indisponível" : "em coleta"}`, async () => {
    const client = clientFor(legacy, unavailable);
    const loaded = await load("ai-search", client);
    await loaded.handler(new Request("https://example.test", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: "Como estão as obras?" }),
    }));
    const prompt = loaded.prompts[0];
    assert.match(prompt, unavailable ? /cadastro oficial indisponível/ : /obras em coleta/);
    assert.doesNotMatch(prompt, /LEGADA|48 registros|0 registros/);
  });
}
