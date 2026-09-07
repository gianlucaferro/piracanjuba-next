/// <reference lib="deno.ns" />
import type { LawSourceResult, MunicipalLaw } from "./municipal-laws.ts";
const originalServe = Deno.serve;
let handlerModule: typeof import("../sync-leis-municipais/index.ts");
try {
  Object.defineProperty(Deno, "serve", {
    configurable: true,
    value: () => ({}),
  });
  handlerModule = await import("../sync-leis-municipais/index.ts");
} finally {
  Object.defineProperty(Deno, "serve", {
    configurable: true,
    value: originalServe,
  });
}
const { createLeisMunicipaisHandler } = handlerModule!;
type Row = Record<string, unknown>;
type ErrorValue = { message: string } | null;
type Result = { data: unknown; error: ErrorValue };
type Options = {
  existing?: Row[];
  collect?: () => Promise<{ sources: LawSourceResult[]; errors: string[] }>;
  startError?: boolean;
  readError?: boolean;
  updateError?: boolean;
  throwUpsertAt?: number;
  throwRepairId?: string;
  finishErrors?: number;
};
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Esperado ${JSON.stringify(expected)}, recebido ${
        JSON.stringify(actual)
      }`,
    );
  }
}
function law(
  numero = "1/2026",
  fonte_url = "https://acessoainformacao.piracanjuba.go.gov.br/lei/1",
): MunicipalLaw {
  return {
    numero,
    ementa: `Ementa da lei ${numero}`,
    data_publicacao: "2026-01-01",
    fonte_url,
    orgao: "Prefeitura Municipal",
  };
}
function source(
  laws: MunicipalLaw[],
  extra: Partial<LawSourceResult> = {},
): LawSourceResult {
  return {
    source: "prefeitura",
    url: "https://example.test/fonte-oficial",
    laws,
    total: laws.length,
    fetched: laws.length,
    rejected: 0,
    pages: 1,
    ...extra,
  };
}
function harness(options: Options = {}) {
  const state = {
    events: [] as string[],
    logs: [] as Row[],
    existing: structuredClone(options.existing || []),
    upserts: 0,
    updates: [] as Row[],
    collects: 0,
    clients: 0,
    finishErrors: options.finishErrors || 0,
  };
  class Query {
    action = "select";
    payload: unknown = null;
    start = 0;
    end = 999;
    keyValue: unknown;
    result: Promise<Result> | undefined;
    constructor(readonly table: string) {}
    insert(payload: unknown) {
      this.action = "insert";
      this.payload = payload;
      return this;
    }
    update(payload: unknown) {
      this.action = "update";
      this.payload = payload;
      return this;
    }
    upsert(payload: unknown, config: unknown) {
      equal(config, { onConflict: "numero", ignoreDuplicates: true });
      this.action = "upsert";
      this.payload = payload;
      return this;
    }
    select(_columns: string) {
      return this;
    }
    order(_column: string) {
      return this;
    }
    range(start: number, end: number) {
      this.start = start;
      this.end = end;
      return this;
    }
    eq(key: string, value: unknown) {
      equal(key, "id");
      this.keyValue = value;
      return this;
    }
    single() {
      return this.execute();
    }
    then<T1 = Result, T2 = never>(
      yes?: ((value: Result) => T1 | PromiseLike<T1>) | null,
      no?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
    ) {
      return this.execute().then(yes, no);
    }
    execute(): Promise<Result> {
      if (this.result) return this.result;
      this.result = Promise.resolve().then(() => {
        if (this.table === "sync_log") {
          const payload = this.payload as Row;
          if (this.action === "insert") {
            state.events.push("log:running");
            if (options.startError) {
              return { data: null, error: { message: "log start failed" } };
            }
            state.logs.push({ ...structuredClone(payload), id: "log-1" });
            return { data: { id: "log-1" }, error: null };
          }
          if (this.action === "update") {
            state.events.push(`log:${payload.status}`);
            if (state.finishErrors > 0) {
              state.finishErrors--;
              return { data: null, error: { message: "log finish failed" } };
            }
            equal(this.keyValue, "log-1");
            Object.assign(state.logs[0], structuredClone(payload));
            return { data: null, error: null };
          }
        }
        if (this.table === "leis_municipais") {
          if (this.action === "select") {
            state.events.push("laws:read");
            return {
              data: state.existing.slice(this.start, this.end + 1),
              error: options.readError ? { message: "read failed" } : null,
            };
          }
          if (this.action === "upsert") {
            state.events.push("laws:upsert");
            state.upserts++;
            if (options.throwUpsertAt === state.upserts) {
              throw new Error("unexpected write interruption");
            }
            const added: Row[] = [];
            for (const row of this.payload as Row[]) {
              if (state.existing.some((old) => old.numero === row.numero)) {
                continue;
              }
              const record = {
                ...structuredClone(row),
                id: `inserted-${state.existing.length}`,
              };
              state.existing.push(record);
              added.push({ id: record.id });
            }
            return { data: added, error: null };
          }
          if (this.action === "update") {
            state.events.push("laws:repair");
            if (options.throwRepairId === this.keyValue) {
              throw new Error("unexpected repair interruption");
            }
            if (options.updateError) {
              return { data: null, error: { message: "repair failed" } };
            }
            const row = state.existing.find((old) => old.id === this.keyValue);
            if (!row) throw new Error("unexpected missing repair target");
            equal(Object.keys(this.payload as Row), ["fonte_url"]);
            state.updates.push({ id: this.keyValue, ...this.payload as Row });
            Object.assign(row, this.payload);
            return { data: null, error: null };
          }
        }
        throw new Error(
          `Unexpected mock operation ${this.table}/${this.action}`,
        );
      });
      return this.result;
    }
  }
  type Dependencies = NonNullable<
    Parameters<typeof createLeisMunicipaisHandler>[0]
  >;
  const client = (() => {
    state.clients++;
    return { from: (table: string) => new Query(table) };
  }) as unknown as NonNullable<Dependencies["createClient"]>;
  const handler = createLeisMunicipaisHandler({
    createClient: client,
    env: (name) =>
      ({
        SUPABASE_URL: "https://db.example.test",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role",
        CRON_SECRET: "test-cron",
      })[name],
    collect: async () => {
      state.events.push("collect");
      state.collects++;
      return options.collect
        ? await options.collect()
        : { sources: [source([law()])], errors: [] };
    },
  });
  const request = (headers: HeadersInit = { "x-cron-secret": "test-cron" }) =>
    new Request("https://example.test/sync-leis", { method: "POST", headers });
  return { state, handler, request };
}
function terminal(h: ReturnType<typeof harness>, status: string) {
  equal(h.state.logs.length, 1);
  equal(h.state.logs[0].tipo, "sync-leis-municipais");
  equal(h.state.logs[0].status, status);
  if (
    typeof h.state.logs[0].finished_at !== "string" ||
    !Number.isFinite(Date.parse(String(h.state.logs[0].finished_at)))
  ) throw new Error("Log sem finished_at válido");
  return h.state.logs[0].detalhes as Row;
}
Deno.test("leis: autorização precede cliente, coleta e log, com OPTIONS preservado", async () => {
  const h = harness();
  for (
    const headers of [{}, { authorization: "Bearer anon" }, {
      "x-ingest-secret": "test-cron",
    }]
  ) {
    equal(
      (await h.handler(h.request(headers as Record<string, string>))).status,
      401,
    );
  }
  equal(
    (await h.handler(
      new Request("https://example.test", { method: "OPTIONS" }),
    )).status,
    200,
  );
  equal([h.state.clients, h.state.collects, h.state.logs.length], [0, 0, 0]);
});
Deno.test("leis: running antecede coleta e terminal success preserva contagens efetivas e dados históricos", async () => {
  const oldUrl = "https://piracanjuba.go.gov.br/leis-municipais/lei-2/";
  const h = harness({
    existing: [{
      id: "old-2",
      numero: "2/2026",
      fonte_url: oldUrl,
      ementa: "Ementa histórica completa",
      resumo: "Resumo preservado",
    }, { id: "old-3", numero: "3/2026", fonte_url: law("3/2026").fonte_url }],
    collect: async () => ({
      sources: [source([law(), law("2/2026"), law("3/2026")])],
      errors: [],
    }),
  });
  const response = await h.handler(
    h.request({ authorization: "Bearer test-service-role" }),
  );
  const body = await response.json();
  equal(response.status, 200);
  equal([body.inserted, body.updated, body.unchanged, body.total], [
    1,
    1,
    1,
    3,
  ]);
  equal(h.state.events.slice(0, 3), ["log:running", "collect", "laws:read"]);
  const details = terminal(h, "success");
  equal([details.inserted, details.updated, details.unchanged], [1, 1, 1]);
  equal(
    h.state.existing.find((row) => row.id === "old-2")?.resumo,
    "Resumo preservado",
  );
  equal(h.state.updates, [{ id: "old-2", fonte_url: law("2/2026").fonte_url }]);
});
Deno.test("leis: rejeições mantêm HTTP 207 e terminal partial com contagens, sem falso sucesso", async () => {
  const h = harness({
    collect: async () => ({
      sources: [source([law()], { rejected: 2, fetched: 3, total: 3 })],
      errors: [],
    }),
  });
  const response = await h.handler(h.request());
  const body = await response.json();
  equal([
    response.status,
    body.success,
    body.partial,
    body.inserted,
    body.rejected,
  ], [207, false, true, 1, 2]);
  equal(terminal(h, "partial").rejected, 2);
});
Deno.test("leis: conflito documental continua excluído da escrita e registrado como parcial", async () => {
  const h = harness({
    collect: async () => ({
      sources: [
        source([law()]),
        source([{ ...law(), ementa: "Outra norma incompatível" }], {
          source: "camara",
        }),
      ],
      errors: [],
    }),
  });
  const response = await h.handler(h.request());
  const body = await response.json();
  equal([response.status, body.conflicts, body.total, h.state.upserts], [
    207,
    1,
    0,
    0,
  ]);
  equal(terminal(h, "partial").source_conflicts, ["1/2026"]);
});
Deno.test("leis: falha total de fonte termina error HTTP 502 antes de consultar leis", async () => {
  const h = harness({
    collect: async () => ({
      sources: [],
      errors: ["Prefeitura indisponível", "Câmara indisponível"],
    }),
  });
  const response = await h.handler(h.request());
  equal(response.status, 502);
  const details = terminal(h, "error");
  equal([details.inserted, details.updated, details.total], [0, 0, 0]);
  equal(h.state.events, ["log:running", "collect", "log:error"]);
});
Deno.test("leis: exceção de coleta também conclui o running como error", async () => {
  const h = harness({
    collect: async () => {
      throw new Error("collector failed");
    },
  });
  equal((await h.handler(h.request())).status, 500);
  equal(terminal(h, "error").error, "collector failed");
});
Deno.test("leis: falha de leitura preserva os totais por fonte e registra zero escrita", async () => {
  const h = harness({ readError: true });
  const response = await h.handler(h.request());
  equal(response.status, 500);
  const details = terminal(h, "error");
  equal([details.inserted, details.updated], [0, 0]);
  equal((details.sources as Row[])[0].normalized, 1);
  equal(h.state.upserts, 0);
});
Deno.test("leis: falha de reparo conserva HTTP 500, partial e contagem de inserção já efetivada", async () => {
  const h = harness({
    existing: [{
      id: "old-2",
      numero: "2/2026",
      fonte_url: "https://piracanjuba.go.gov.br/leis-municipais/lei-2/",
    }],
    updateError: true,
    collect: async () => ({
      sources: [source([law(), law("2/2026")])],
      errors: [],
    }),
  });
  const response = await h.handler(h.request());
  const body = await response.json();
  equal([response.status, body.success, body.inserted, body.updated], [
    500,
    false,
    1,
    0,
  ]);
  equal(terminal(h, "partial").inserted, 1);
});
Deno.test("leis: interrupção após primeiro lote mantém suas 100 inserções no log de erro", async () => {
  const h = harness({
    throwUpsertAt: 2,
    collect: async () => ({
      sources: [
        source(Array.from({ length: 101 }, (_, i) => law(`${i + 1}/2026`))),
      ],
      errors: [],
    }),
  });
  const response = await h.handler(h.request());
  const body = await response.json();
  equal([response.status, body.inserted, body.total], [500, 100, 101]);
  equal(terminal(h, "error").inserted, 100);
});
Deno.test("leis: falha ao iniciar log impede coleta e gravação", async () => {
  const h = harness({ startError: true });
  equal((await h.handler(h.request())).status, 500);
  equal([h.state.collects, h.state.upserts, h.state.logs.length], [0, 0, 0]);
});
Deno.test("leis: falha no log final não responde sucesso e conserva contagem na tentativa de erro", async () => {
  const h = harness({ finishErrors: 1 });
  const response = await h.handler(h.request());
  const body = await response.json();
  equal([response.status, body.success, body.inserted], [500, false, 1]);
  equal(terminal(h, "error").inserted, 1);
  equal(h.state.upserts, 1);
});
Deno.test("leis: fonte parcial mantém HTTP 502 e diagnóstico de cobertura parcial", async () => {
  const h = harness({
    collect: async () => ({
      sources: [source([law()])],
      errors: ["Câmara HTTP 503"],
    }),
  });
  const response = await h.handler(h.request());
  equal(response.status, 502);
  equal(terminal(h, "partial").errors, ["Câmara HTTP 503"]);
});

Deno.test("leis: interrupção de reparo contabiliza outros sucessos já disparados no mesmo lote", async () => {
  const h = harness({
    existing: ["1/2026", "2/2026"].map((numero, index) => ({
      id: `old-${index + 1}`,
      numero,
      fonte_url: `https://piracanjuba.go.gov.br/leis-municipais/lei-${
        index + 1
      }/`,
    })),
    throwRepairId: "old-1",
    collect: async () => ({
      sources: [source([law(), law("2/2026")])],
      errors: [],
    }),
  });
  const response = await h.handler(h.request());
  const body = await response.json();
  equal([response.status, body.inserted, body.updated], [500, 0, 1]);
  const details = terminal(h, "error");
  equal([details.updated, h.state.updates.length], [1, 1]);
  equal(h.state.updates[0].id, "old-2");
});
