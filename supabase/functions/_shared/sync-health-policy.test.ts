/// <reference lib="deno.ns" />
import {
  hasCronOrServiceRoleAuth,
  hasServiceRoleAuth,
} from "./service-role-auth.ts";
import { createSyncHealthHandler } from "./sync-health-policy.ts";
import {
  selectSyncRetryCandidates,
  type SyncHealthJob,
} from "./sync-health-policy.ts";

function job(overrides: Partial<SyncHealthJob> = {}): SyncHealthJob {
  return {
    function_name: "sync-exemplo",
    health_status: "failing",
    is_active: true,
    cron_status: "scheduled",
    retry_eligible: true,
    errors_7d: 1,
    ...overrides,
  };
}

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Esperado ${JSON.stringify(expected)}, recebido ${
        JSON.stringify(actual)
      }`,
    );
  }
}

Deno.test("retry exige registro ativo, cron real ativo e elegibilidade explicita", () => {
  equal(
    selectSyncRetryCandidates([
      job({ is_active: false }),
      job({ cron_status: "missing" }),
      job({ cron_status: "disabled" }),
      job({ retry_eligible: false }),
      job({ retry_eligible: undefined }),
    ]),
    [],
  );
});

Deno.test("ausencia de log e nunca executado nao disparam coleta", () => {
  equal(
    selectSyncRetryCandidates([
      job({ health_status: "unobserved" }),
      job({ health_status: "never_run" }),
      job({ health_status: "healthy" }),
    ]),
    [],
  );
});

Deno.test("monitor nao pode reenfileirar a si proprio", () => {
  equal(
    selectSyncRetryCandidates([job({ function_name: "sync-health-check" })]),
    [],
  );
});

Deno.test("filtra erros excessivos antes de limitar os cinco candidatos", () => {
  const blocked = Array.from({ length: 5 }, () => job({ errors_7d: 6 }));
  const eligible = job({ function_name: "sync-elegivel", errors_7d: 5 });
  equal(selectSyncRetryCandidates([...blocked, eligible]), [eligible]);
});

Deno.test("preserva o limite de cinco mesmo com parametro maior", () => {
  equal(
    selectSyncRetryCandidates(Array.from({ length: 8 }, () => job()), 20)
      .length,
    5,
  );
  equal(selectSyncRetryCandidates([job()], -1), []);
  equal(selectSyncRetryCandidates([job()], Number.NaN), []);
});

Deno.test("aceita os quatro estados observados recuperaveis", () => {
  const jobs = ["failing", "stuck", "stale", "degraded"].map((health_status) =>
    job({ health_status })
  );
  equal(selectSyncRetryCandidates(jobs), jobs);
});

Deno.test("rejeita contadores de erros invalidos", () => {
  equal(
    selectSyncRetryCandidates([
      job({ errors_7d: -1 }),
      job({ errors_7d: Number.NaN }),
    ]),
    [],
  );
});

Deno.test("autenticacao exige service-role exata ou segredo de cron explicito", () => {
  const request = (headers: Record<string, string | undefined>) =>
    new Request("https://example.test", {
      headers: Object.fromEntries(
        Object.entries(headers).filter(([, v]) => v !== undefined),
      ) as Record<string, string>,
    });
  equal(
    hasServiceRoleAuth(
      request({ authorization: "Bearer mock-service-role" }),
      "mock-service-role",
    ),
    true,
  );
  equal(
    hasServiceRoleAuth(
      request({ apikey: "mock-service-role" }),
      "mock-service-role",
    ),
    true,
  );
  for (
    const headers of [
      {},
      { authorization: "Bearer mock-anon" },
      { apikey: "mock-anon" },
      { authorization: "Bearer prefix-mock-service-role" },
      { authorization: "Bearer mock-service-role trailing" },
      { authorization: "mock-service-role" },
    ]
  ) equal(hasServiceRoleAuth(request(headers), "mock-service-role"), false);
  equal(hasServiceRoleAuth(request({ apikey: "" }), ""), false);
  equal(
    hasCronOrServiceRoleAuth(
      request({ "x-cron-secret": "mock-cron" }),
      undefined,
      "mock-cron",
    ),
    true,
  );
  equal(
    hasCronOrServiceRoleAuth(
      request({ "x-centi-ingest-secret": "mock-cron" }),
      undefined,
      "mock-cron",
    ),
    false,
  );
  equal(
    hasCronOrServiceRoleAuth(
      request({ "x-cron-secret": "mock-cron-extra" }),
      undefined,
      "mock-cron",
    ),
    false,
  );
  equal(
    hasCronOrServiceRoleAuth(request({ "x-cron-secret": "" }), undefined, ""),
    false,
  );
});

function handlerFixture(
  jobs: SyncHealthJob[] = [job({ errors_7d: 3 })],
  readError = false,
  failInvocations: string[] = [],
) {
  const calls: string[] = [];
  const logs: { status: string; details: unknown }[] = [];
  const handler = createSyncHealthHandler({
    getServiceRoleKey: () => "mock-service-role",
    getCronSecret: () => "mock-cron",
    createStore: () => {
      calls.push("create");
      return {
        async loadDashboard() {
          calls.push("read");
          if (readError) throw new Error("mock read error");
          return jobs;
        },
        async insertLog() {
          calls.push("insert");
          return "mock-log";
        },
        async updateLog(_id, status, details) {
          calls.push("update");
          logs.push({ status, details });
        },
        async invoke(name) {
          calls.push(`invoke:${name}`);
          if (failInvocations.includes(name)) {
            throw new Error("mock invoke failure");
          }
        },
      };
    },
    async wait() {
      calls.push("wait");
    },
  });
  return { handler, calls, logs };
}
function healthRequest(
  body = "",
  headers: Record<string, string | undefined> = {},
  method = "POST",
) {
  return new Request("https://example.test/sync-health-check", {
    method,
    headers: Object.fromEntries(
      Object.entries(headers).filter(([, v]) => v !== undefined),
    ) as Record<string, string>,
    ...(method === "POST" ? { body } : {}),
  });
}

Deno.test("handler retorna401 sem autenticao antes de corpo, cliente e efeitos", async () => {
  for (
    const headers of [{}, { authorization: "Bearer mock-anon" }, {
      apikey: "mock-anon",
    }, { "x-cron-secret": "invalid" }]
  ) {
    const { handler, calls } = handlerFixture();
    equal((await handler(healthRequest("not json", headers))).status, 401);
    equal(calls, []);
  }
});

Deno.test("service-role valida permite execucao normal com efeitos apenas mockados", async () => {
  const { handler, calls } = handlerFixture();
  const response = await handler(
    healthRequest("", { authorization: "Bearer mock-service-role" }),
  );
  equal(response.status, 200);
  const body = await response.json();
  equal(body.dry_run, false);
  equal(body.retried, ["sync-exemplo"]);
  equal(calls, [
    "create",
    "insert",
    "read",
    "invoke:sync-exemplo",
    "wait",
    "invoke:send-push",
    "update",
  ]);
});

Deno.test("canario autenticado consulta a view sem logs, retries, push ou espera", async () => {
  for (
    const headers of [{ authorization: "Bearer mock-service-role" }, {
      apikey: "mock-service-role",
    }, { "x-cron-secret": "mock-cron" }]
  ) {
    const { handler, calls } = handlerFixture();
    const response = await handler(healthRequest('{"dry_run":true}', headers));
    equal(response.status, 200);
    const body = await response.json();
    equal(body.dry_run, true);
    equal(body.planned_retries, ["sync-exemplo"]);
    equal(body.retried, []);
    equal(calls, ["create", "read"]);
  }
});

Deno.test("canario malformado nao cai em execucao real", async () => {
  for (
    const body of [
      '{"dry_run":"true"}',
      '{"dryRun":true}',
      "[]",
      "null",
      "bad json",
    ]
  ) {
    const { handler, calls } = handlerFixture();
    equal(
      (await handler(healthRequest(body, { "x-cron-secret": "mock-cron" })))
        .status,
      400,
    );
    equal(calls, []);
  }
});

Deno.test("canario reporta falha de leitura sem gravar log nem chamar funcoes", async () => {
  const { handler, calls } = handlerFixture([], true);
  equal(
    (await handler(
      healthRequest('{"dry_run":true}', { apikey: "mock-service-role" }),
    )).status,
    500,
  );
  equal(calls, ["create", "read"]);
});

Deno.test("preflight nao produz efeitos e GET autenticado nao executa sincronizacao", async () => {
  const { handler, calls } = handlerFixture();
  equal((await handler(healthRequest("", {}, "OPTIONS"))).status, 204);
  equal(
    (await handler(healthRequest("", { apikey: "mock-service-role" }, "GET")))
      .status,
    405,
  );
  equal(calls, []);
});

Deno.test("novos estados ficam visiveis no canario sem retry automatico", async () => {
  const { handler, calls } = handlerFixture(
    ["running", "incomplete", "unknown"].map((health_status) =>
      job({ health_status })
    ),
  );
  const response = await handler(
    healthRequest('{"dry_run":true}', { "x-cron-secret": "mock-cron" }),
  );
  equal(response.status, 200);
  const body = await response.json();
  equal(body.total_jobs, 3);
  equal(body.healthy, 0);
  equal(body.by_status.running, 1);
  equal(body.by_status.incomplete, 1);
  equal(body.by_status.unknown, 1);
  equal(body.planned_retries, []);
  equal(body.retried, []);
  equal(calls, ["create", "read"]);
});

Deno.test("retry que falha fica parcial e o proximo candidato ainda e tentado", async () => {
  const { handler, calls, logs } = handlerFixture(
    [
      job({
        function_name: "sync-falha",
        health_status: "stale",
        errors_7d: 0,
      }),
      job({ function_name: "sync-ok", errors_7d: 1 }),
    ],
    false,
    ["sync-falha"],
  );
  const response = await handler(
    healthRequest("{}", { "x-cron-secret": "mock-cron" }),
  );
  const body = await response.json();
  equal(response.status, 207);
  equal(body.success, false);
  equal(body.status, "partial");
  equal(body.retried, ["sync-ok"]);
  equal(body.invocation_failures, [{
    phase: "retry",
    function: "sync-falha",
    error: "mock invoke failure",
  }]);
  equal(logs[0].status, "partial");
  equal(
    logs[0].details,
    Object.fromEntries(
      Object.entries(body).filter(([key]) => key !== "success"),
    ),
  );
  equal(calls, [
    "create",
    "insert",
    "read",
    "invoke:sync-falha",
    "wait",
    "invoke:sync-ok",
    "wait",
    "update",
  ]);
});

Deno.test("falha de alerta e registrada no resultado e log parcial", async () => {
  const { handler, logs } = handlerFixture([job({ errors_7d: 3 })], false, [
    "send-push",
  ]);
  const response = await handler(
    healthRequest("{}", { apikey: "mock-service-role" }),
  );
  const body = await response.json();
  equal(response.status, 207);
  equal(body.success, false);
  equal(body.status, "partial");
  equal(body.retried, ["sync-exemplo"]);
  equal(body.invocation_failures, [{
    phase: "alert",
    function: "send-push",
    error: "mock invoke failure",
  }]);
  equal(logs[0].status, "partial");
});

Deno.test("dry_run nao tenta invocacoes nem grava falhas planejadas", async () => {
  const { handler, calls, logs } = handlerFixture(
    [job({ errors_7d: 3 })],
    false,
    ["sync-exemplo", "send-push"],
  );
  const response = await handler(
    healthRequest('{"dry_run":true}', { "x-cron-secret": "mock-cron" }),
  );
  const body = await response.json();
  equal(response.status, 200);
  equal(body.success, true);
  equal(body.status, "success");
  equal(body.invocation_failures, []);
  equal(body.retried, []);
  equal(calls, ["create", "read"]);
  equal(logs, []);
});
