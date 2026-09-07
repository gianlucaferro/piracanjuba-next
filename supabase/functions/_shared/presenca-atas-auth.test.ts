/// <reference lib="deno.ns" />
import {
  AdminBodyTooLargeError,
  hasAdminSessionAuth,
  readAdminActionBody,
} from "./admin-session-auth.ts";

const originalServe = Deno.serve;
Deno.serve = (() => ({})) as unknown as typeof Deno.serve;
const { createPresencaAtasHandler } = await import(
  "../sync-presenca-atas/index.ts"
);
Deno.serve = originalServe;

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Esperado ${JSON.stringify(expected)}, recebido ${
        JSON.stringify(actual)
      }`,
    );
  }
}

const MOCK_ADMIN = "a".repeat(64);
const FIRST_VEREADOR = "Fernando Abraão Magalhães Silva";
const manualBody = {
  sessao_titulo: "Sessão de teste",
  sessao_data: "2026-09-07",
  presentes_manual: [FIRST_VEREADOR],
};

function fixture(
  options: {
    session?: { expires_at: string } | null;
    sessionError?: boolean;
    sessionThrows?: boolean;
    aiResponse?: unknown;
  } = {},
) {
  const calls: string[] = [];
  const filters: [string, unknown][] = [];
  const writes: Record<string, unknown>[] = [];
  const handler = createPresencaAtasHandler({
    env: (name) =>
      ({
        SUPABASE_SERVICE_ROLE_KEY: "mock-service",
        CRON_SECRET: "mock-cron",
        SUPABASE_URL: "https://example.test",
        GEMINI_API_KEY: "mock-gemini",
      })[name],
    fetch: (async () => {
      calls.push("ai");
      if (options.aiResponse === undefined) {
        throw new Error("IA inesperada no teste");
      }
      return new Response(JSON.stringify(options.aiResponse));
    }) as typeof fetch,
    createClient: (() => {
      calls.push("client");
      return {
        from(table: string) {
          if (table === "admin_sessions") {
            calls.push("session");
            const builder = {
              select(columns: string) {
                equal(columns, "expires_at");
                return builder;
              },
              eq(key: string, value: unknown) {
                filters.push([key, value]);
                return builder;
              },
              async maybeSingle() {
                if (options.sessionThrows) throw new Error("mock unavailable");
                return {
                  data: options.session === undefined
                    ? { expires_at: "2099-01-01T00:00:00Z" }
                    : options.session,
                  error: options.sessionError
                    ? { message: "mock error" }
                    : null,
                };
              },
            };
            return builder;
          }
          if (table === "vereadores") {
            return {
              async select() {
                calls.push("vereadores");
                return {
                  data: [{ id: "vereador-1", nome: FIRST_VEREADOR }],
                  error: null,
                };
              },
            };
          }
          if (table === "presenca_sessoes") {
            return {
              async upsert(row: Record<string, unknown>) {
                calls.push("write");
                writes.push(row);
                return { error: null };
              },
            };
          }
          throw new Error(`Tabela inesperada: ${table}`);
        },
      };
    }) as never,
  });
  return { handler, calls, filters, writes };
}

function request(
  body: unknown = manualBody,
  headers: Record<string, string | undefined> = {},
) {
  return new Request("https://example.test", {
    method: "POST",
    headers: Object.fromEntries(
      Object.entries(headers).filter(([, value]) => value !== undefined),
    ) as Record<string, string>,
    body: JSON.stringify(body),
  });
}

Deno.test("anon e JWT de usuario nao autorizam escrita manual nem batch", async () => {
  const oldFetch = globalThis.fetch;
  let fetched = 0;
  globalThis.fetch = (() => {
    fetched++;
    throw new Error("Rede proibida no teste");
  }) as typeof fetch;
  try {
    for (
      const headers of [
        {},
        { authorization: "Bearer mock-anon" },
        { apikey: "mock-anon" },
        { authorization: "Bearer mock-user-jwt" },
        { "x-cron-secret": "bad" },
        { "x-centi-ingest-secret": "mock-cron" },
      ]
    ) {
      for (
        const body of [manualBody, {
          action: "batch_process",
          sessoes: [manualBody],
        }]
      ) {
        const f = fixture();
        equal((await f.handler(request(body, headers))).status, 401);
        equal(f.calls, []);
        equal(f.writes, []);
      }
    }
    equal(fetched, 0);
  } finally {
    globalThis.fetch = oldFetch;
  }
});

Deno.test("admin_token malformado ou anon no corpo nao consulta sessao", async () => {
  for (
    const admin_token of [
      null,
      42,
      "mock-anon",
      {},
      "a".repeat(63),
      "a".repeat(65),
    ]
  ) {
    const f = fixture();
    equal(
      (await f.handler(request({ ...manualBody, admin_token }))).status,
      401,
    );
    equal(f.calls, []);
  }
});

Deno.test("sessao ausente expirada invalida ou falha de banco bloqueia gravacao", async () => {
  for (
    const options of [
      { session: null },
      { session: { expires_at: "2000-01-01T00:00:00Z" } },
      { session: { expires_at: "invalid" } },
      { sessionError: true },
      { sessionThrows: true },
    ]
  ) {
    const f = fixture(options);
    equal(
      (await f.handler(request({ ...manualBody, admin_token: MOCK_ADMIN })))
        .status,
      401,
    );
    equal(f.calls, ["client", "session"]);
    equal(f.writes, []);
  }
});

Deno.test("sessao admin valida usa singleton e hash, preserva 11 presencas manuais", async () => {
  const f = fixture();
  const result = await f.handler(
    request({ ...manualBody, admin_token: MOCK_ADMIN }, {
      authorization: "Bearer mock-anon",
    }),
  );
  equal(result.status, 200);
  equal(f.filters[0], ["id", "singleton"]);
  equal(f.filters[1][0], "token_hash");
  equal(typeof f.filters[1][1], "string");
  if (f.filters[1][1] === MOCK_ADMIN) {
    throw new Error("Token cru nao pode ser consultado");
  }
  equal(f.writes.length, 11);
  equal(f.writes.filter((row) => row.presente).length, 1);
  equal(f.writes[0].vereador_id, "vereador-1");
  equal(
    f.writes.every((row) =>
      row.status_verificacao === "confirmado" && !("admin_token" in row)
    ),
    true,
  );
});

Deno.test("batch autenticado por sessao preserva a API manual", async () => {
  const f = fixture();
  const result = await f.handler(
    request({
      admin_token: MOCK_ADMIN,
      action: "batch_process",
      sessoes: [{ ...manualBody, presentes: [FIRST_VEREADOR] }],
    }),
  );
  equal(result.status, 200);
  equal(f.writes.length, 11);
  equal(f.writes.filter((row) => row.presente).length, 1);
});

Deno.test("service-role e cron exatos permitem operacao sem consultar sessao admin", async () => {
  for (
    const headers of [{ authorization: "Bearer mock-service" }, {
      apikey: "mock-service",
    }, { "x-cron-secret": "mock-cron" }]
  ) {
    const f = fixture();
    equal((await f.handler(request(manualBody, headers))).status, 200);
    equal(f.filters, []);
    equal(f.writes.length, 11);
  }
});

Deno.test("canario privilegiado vazio retorna 400 sem gravacao", async () => {
  const f = fixture();
  equal(
    (await f.handler(request({}, { "x-cron-secret": "mock-cron" }))).status,
    400,
  );
  equal(f.writes, []);
});

Deno.test("corpo malformado ou acima do limite nao inicia cliente nem escrita", async () => {
  for (
    const [body, expected] of [["not json", 400], [
      JSON.stringify({ ata_texto: "x".repeat(1_048_577) }),
      413,
    ]] as const
  ) {
    const f = fixture();
    const result = await f.handler(
      new Request("https://example.test", {
        method: "POST",
        headers: { "x-cron-secret": "mock-cron" },
        body,
      }),
    );
    equal(result.status, expected);
    equal(f.calls, []);
  }
});

Deno.test("limite conta bytes reais do fluxo mesmo sem content-length", async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"texto":"'));
      controller.enqueue(new TextEncoder().encode("á".repeat(10)));
    },
    cancel() {
      cancelled = true;
    },
  });
  let blocked = false;
  try {
    await readAdminActionBody(
      new Request("https://example.test", { method: "POST", body: stream }),
      20,
    );
  } catch (error) {
    blocked = error instanceof AdminBodyTooLargeError;
  }
  equal(blocked, true);
  equal(cancelled, true);
});

Deno.test("expiracao no instante atual nao valida sessao", async () => {
  equal(
    await hasAdminSessionAuth(
      MOCK_ADMIN,
      async () => ({ expires_at: "2026-09-07T00:00:00Z" }),
      Date.parse("2026-09-07T00:00:00Z"),
    ),
    false,
  );
});

Deno.test("OPTIONS nao produz efeitos", async () => {
  const f = fixture();
  equal(
    (await f.handler(
      new Request("https://example.test", { method: "OPTIONS" }),
    )).status,
    200,
  );
  equal(f.calls, []);
});

function structuredAI(presentes: unknown) {
  return {
    choices: [{
      message: {
        tool_calls: [{
          function: {
            name: "report_attendance",
            arguments: JSON.stringify({ presentes }),
          },
        }],
      },
    }],
  };
}

Deno.test("extracao IA estruturada nao e marcada como confirmacao humana", async () => {
  const f = fixture({ aiResponse: structuredAI([FIRST_VEREADOR]) });
  const result = await f.handler(
    request({
      sessao_titulo: manualBody.sessao_titulo,
      sessao_data: manualBody.sessao_data,
      ata_texto: "Ata de teste",
      admin_token: MOCK_ADMIN,
    }),
  );
  equal(result.status, 200);
  equal(f.writes.length, 11);
  equal(f.writes.every((row) => row.status_verificacao === "ia"), true);
  equal(f.writes.filter((row) => row.presente).length, 1);
});

Deno.test("IA vazia sem tool call ou com payload invalido falha antes de qualquer upsert", async () => {
  for (
    const aiResponse of [
      {},
      { choices: [{ message: { content: FIRST_VEREADOR } }] },
      structuredAI([]),
      structuredAI(["Nome inexistente"]),
      structuredAI(null),
      {
        choices: [{
          message: { tool_calls: [{ function: { arguments: "not json" } }] },
        }],
      },
    ]
  ) {
    const f = fixture({ aiResponse });
    const result = await f.handler(
      request({
        sessao_titulo: manualBody.sessao_titulo,
        ata_texto: FIRST_VEREADOR,
      }, { "x-cron-secret": "mock-cron" }),
    );
    equal(result.status, 500);
    equal(f.calls, ["client", "vereadores", "ai"]);
    equal(f.writes, []);
  }
});
