/// <reference lib="deno.ns" />

import {
  folhaCompetencias,
  preserveServidorUpdates,
} from "./folha-retroativa.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Esperava ${JSON.stringify(expected)}, recebeu ${JSON.stringify(actual)}`,
    );
  }
}

Deno.test("revisao retroativa atravessa o ano sem depender de mes vazio", () => {
  equal(folhaCompetencias(2027, 1, false).map((row) => row.competencia), [
    "2027-01",
    "2026-12",
    "2026-11",
    "2026-10",
  ]);
  equal(folhaCompetencias(2026, 10, true), [
    { ano: 2026, mes: 10, competencia: "2026-10" },
  ]);
});

Deno.test("rejeita competencia invalida antes de coletar", () => {
  for (
    const [year, month] of [[2026, 0], [2026, 13], [1999, 12], [2026.1, 4]]
  ) {
    let threw = false;
    try {
      folhaCompetencias(year, month, false);
    } catch {
      threw = true;
    }
    if (!threw) throw new Error("Aceitou competencia invalida");
  }
});

function database(options: { fail?: string; paginate?: boolean } = {}) {
  const calls: string[] = [];
  return {
    calls,
    from(table: string) {
      let ids: string[] = [];
      let after = "";
      const query = {
        select() {
          return query;
        },
        in(_key: string, value: string[]) {
          ids = value;
          return query;
        },
        gt(_key: string, value: string) {
          after = value;
          return query;
        },
        order() {
          return query;
        },
        range(start: number) {
          calls.push(`${table}:${start}:${after}`);
          if (options.fail === table) {
            return Promise.resolve({ error: { message: "offline" } });
          }
          // A segunda pagina deve proteger b mesmo quando a primeira so contem a.
          const data = options.paginate
            ? start === 0
              ? Array.from(
                { length: 500 },
                (_, id) => ({ id, servidor_id: "a" }),
              )
              : [{ id: 500, servidor_id: "b" }]
            : [{ id: "r1", servidor_id: "a" }];
          return Promise.resolve({
            data: data.filter((row) => ids.includes(row.servidor_id)),
            error: null,
          });
        },
        then(resolve: (value: unknown) => unknown) {
          calls.push(table);
          return Promise.resolve(
            options.fail === table ? { error: { message: "offline" } } : {
              data: [
                { id: "a", origem_chave: "prefeitura:nucleogov:1" },
                { id: "b", origem_chave: "prefeitura:nucleogov:2" },
              ].filter((row) => ids.includes(row.origem_chave)),
              error: null,
            },
          ).then(resolve);
        },
      };
      return query;
    },
  };
}

const candidates = [
  { origem_chave: "prefeitura:nucleogov:1", cargo: "antigo" },
  { origem_chave: "prefeitura:nucleogov:2", cargo: "retificado" },
  { origem_chave: "prefeitura:nucleogov:3", cargo: "novo" },
];

Deno.test("historico preserva cadastro posterior e admite retificacao e novo vinculo", async () => {
  const db = database();
  equal(
    await preserveServidorUpdates(db, candidates, "2026-09"),
    candidates.slice(1),
  );
  equal(db.calls, ["servidores", "remuneracao_servidores:0:2026-09"]);
});

Deno.test("protecao cadastral percorre todas as paginas de remuneracoes", async () => {
  const db = database({ paginate: true });
  equal(
    await preserveServidorUpdates(db, candidates, "2026-09"),
    candidates.slice(2),
  );
  equal(db.calls.length, 3);
});

Deno.test("falha de leitura impede atualizacao insegura do cadastro", async () => {
  for (const fail of ["servidores", "remuneracao_servidores"]) {
    let message = "";
    try {
      await preserveServidorUpdates(database({ fail }), candidates, "2026-09");
    } catch (error) {
      message = String(error);
    }
    if (!message.includes("offline")) {
      throw new Error("Falha de leitura ignorada");
    }
  }
});

Deno.test("folha vazia nao escreve nem consulta cadastros", async () => {
  const db = database();
  equal(await preserveServidorUpdates(db, [], "2026-09"), []);
  equal(db.calls, []);
});
