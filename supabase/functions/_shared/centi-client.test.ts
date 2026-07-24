/// <reference lib="deno.ns" />

import { centiListAllWithMeta } from "./centi-client.ts";

function assertEquals(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)}, got ${
        JSON.stringify(actual)
      }`,
    );
  }
}

Deno.test("paginacao usa total da fonte e comprova completude", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (() => {
    calls++;
    const payload = calls === 1
      ? { "0-test": { dados: [{ id: 1 }, { id: 2 }], total: 3 } }
      : { "0-test": { dados: [{ id: 3 }], total: 3 } };
    return Promise.resolve(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  }) as typeof fetch;

  try {
    const result = await centiListAllWithMeta<{ id: number }>(
      "/cidadao/transparencia/teste",
      "teste/listar",
      { pageSize: 2, maxPages: 3 },
    );
    assertEquals(result.dados.map((row) => row.id), [1, 2, 3], "ids");
    assertEquals(result.total, 3, "total");
    assertEquals(result.pagesFetched, 2, "paginas");
    assertEquals(result.complete, true, "completo");
    assertEquals(result.maxPagesReached, false, "limite nao atingido");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("marca lote incompleto quando maxPages interrompe a fonte", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          "0-test": { dados: [{ id: 1 }, { id: 2 }], total: 5 },
        }),
        { status: 200 },
      ),
    )) as typeof fetch;

  try {
    const result = await centiListAllWithMeta<{ id: number }>(
      "/cidadao/transparencia/teste",
      "teste/listar",
      { pageSize: 2, maxPages: 1 },
    );
    assertEquals(result.dados.length, 2, "linhas");
    assertEquals(result.complete, false, "incompleto");
    assertEquals(result.maxPagesReached, true, "limite atingido");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("rejeita resposta acima do limite declarado", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response("{}", {
        status: 200,
        headers: { "content-length": "5000" },
      }),
    )) as typeof fetch;

  try {
    let message = "";
    try {
      await centiListAllWithMeta(
        "/cidadao/transparencia/teste",
        "teste/listar",
        { maxResponseBytes: 100 },
      );
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    if (!message.includes("too large")) {
      throw new Error(`erro de tamanho nao detectado: ${message}`);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("interrompe resposta em streaming acima do limite", async () => {
  const originalFetch = globalThis.fetch;
  let cancelled = false;
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"dados":"'));
            controller.enqueue(new TextEncoder().encode("x".repeat(200)));
          },
          cancel() {
            cancelled = true;
          },
        }),
        { status: 200 },
      ),
    )) as typeof fetch;

  try {
    let message = "";
    try {
      await centiListAllWithMeta(
        "/cidadao/transparencia/teste",
        "teste/listar",
        { maxResponseBytes: 100 },
      );
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    if (!message.includes("exceeded")) {
      throw new Error(`erro de streaming nao detectado: ${message}`);
    }
    assertEquals(cancelled, true, "stream cancelado");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("limita tambem o corpo de respostas HTTP de erro", async () => {
  const originalFetch = globalThis.fetch;
  let cancelled = false;
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("x".repeat(200)));
          },
          cancel() {
            cancelled = true;
          },
        }),
        { status: 400 },
      ),
    )) as typeof fetch;

  try {
    let message = "";
    try {
      await centiListAllWithMeta(
        "/cidadao/transparencia/teste",
        "teste/listar",
        { maxResponseBytes: 100 },
      );
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    if (!message.includes("exceeded")) {
      throw new Error(`erro HTTP sem limite detectado: ${message}`);
    }
    assertEquals(cancelled, true, "stream de erro cancelado");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("repete falha transitoria e preserva a paginacao", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (() => {
    calls++;
    if (calls === 1) {
      return Promise.resolve(
        new Response("gateway indisponivel", {
          status: 503,
          headers: { "retry-after": "0" },
        }),
      );
    }
    return Promise.resolve(
      new Response(
        JSON.stringify({
          "0-test": { dados: [{ id: 7 }], total: 1 },
        }),
        { status: 200 },
      ),
    );
  }) as typeof fetch;

  try {
    const result = await centiListAllWithMeta<{ id: number }>(
      "/cidadao/transparencia/teste",
      "teste/listar",
      { pageSize: 10, maxPages: 1 },
    );
    assertEquals(calls, 2, "tentativas");
    assertEquals(result.dados, [{ id: 7 }], "dados");
    assertEquals(result.complete, true, "completo");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("recria o timeout ao repetir erro de rede", async () => {
  const originalFetch = globalThis.fetch;
  const signals: AbortSignal[] = [];
  let calls = 0;
  globalThis.fetch = ((_input: URL | Request | string, init?: RequestInit) => {
    calls++;
    if (init?.signal) signals.push(init.signal);
    if (calls === 1) {
      return Promise.reject(new DOMException("timeout", "TimeoutError"));
    }
    return Promise.resolve(
      new Response(
        JSON.stringify({
          "0-test": { dados: [{ id: 8 }], total: 1 },
        }),
        { status: 200 },
      ),
    );
  }) as typeof fetch;

  try {
    const result = await centiListAllWithMeta<{ id: number }>(
      "/cidadao/transparencia/teste",
      "teste/listar",
      { pageSize: 10, maxPages: 1 },
    );
    assertEquals(calls, 2, "tentativas");
    assertEquals(signals.length, 2, "signals");
    if (signals[0] === signals[1]) {
      throw new Error("retry reutilizou o AbortSignal anterior");
    }
    assertEquals(result.dados, [{ id: 8 }], "dados");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
