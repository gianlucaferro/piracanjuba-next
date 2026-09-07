/// <reference lib="deno.ns" />
Deno.test("presenças recusa requisições sem credencial antes de body, cliente, log e rede", async () => {
  const originalServe = Deno.serve;
  const originalEnvGet = Deno.env.get;
  const originalFetch = globalThis.fetch;
  let handler: ((req: Request) => Response | Promise<Response>) | undefined;
  const envReads: string[] = [];
  let networkCalls = 0;
  try {
    Object.defineProperty(Deno, "serve", {
      configurable: true,
      value: (value: typeof handler) => {
        handler = value;
        return {};
      },
    });
    Object.defineProperty(Deno.env, "get", {
      configurable: true,
      value: (key: string) => {
        envReads.push(key);
        return key === "SUPABASE_SERVICE_ROLE_KEY"
          ? "test-service-role"
          : key === "CRON_SECRET"
          ? "test-cron"
          : undefined;
      },
    });
    globalThis.fetch = () => {
      networkCalls++;
      throw new Error("Rede não permitida neste teste");
    };
    await import("../sync-presenca-centi/index.ts");
    if (!handler) throw new Error("Handler não foi registrado");
    envReads.length = 0;
    const options = await handler(
      new Request("https://example.test", { method: "OPTIONS" }),
    );
    if (options.status !== 200 || envReads.length) {
      throw new Error("OPTIONS deve preceder qualquer acesso");
    }
    for (
      const headers of [{}, { authorization: "Bearer anon-test" }, {
        "x-ingest-secret": "test-cron",
      }, { "x-cron-secret": "invalid" }]
    ) {
      const request = new Request("https://example.test", {
        method: "POST",
        headers: headers as Record<string, string>,
        body: '{"dryRun":true}',
      });
      const response = await handler(request);
      if (response.status !== 401 || request.bodyUsed) {
        throw new Error(
          "Requisição recusada acessou o corpo ou não retornou 401",
        );
      }
    }
    if (networkCalls || envReads.includes("SUPABASE_URL")) {
      throw new Error("Requisição não autorizada chegou ao cliente ou à rede");
    }
  } finally {
    Object.defineProperty(Deno, "serve", {
      configurable: true,
      value: originalServe,
    });
    Object.defineProperty(Deno.env, "get", {
      configurable: true,
      value: originalEnvGet,
    });
    globalThis.fetch = originalFetch;
  }
});
