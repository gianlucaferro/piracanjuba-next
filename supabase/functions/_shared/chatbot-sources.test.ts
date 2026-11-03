import { normalizeChatSources, recordPeriods, safeSourceUrl, streamWithSources } from "./chatbot-sources.ts";

function assert(value: unknown, message = "Falha na asserção"): asserts value { if (!value) throw new Error(message); }
const source = { title: "Folha Prefeitura", url: "https://piracanjuba.ai/prefeitura/servidores", period: "2026-09", coverage: "Amostra de 30 de 1700 holerites." };

Deno.test("fontes recusam protocolos executáveis e URLs com credenciais", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,teste", "file:///etc/passwd", "https://user:password@example.test", "/relativa", "invalid"]) assert(safeSourceUrl(url) === null, url);
  assert(safeSourceUrl("https://example.test/documento?id=1") === "https://example.test/documento?id=1");
});

Deno.test("fontes preservam competências distintas e deduplicam documentos", () => {
  const result = normalizeChatSources([source, source, { ...source, period: "2026-10" }, { ...source, url: "javascript:alert(1)" }]);
  assert(result.length === 2 && result[0].period === "2026-09" && result[1].period === "2026-10");
  assert(normalizeChatSources([{ ...source, title: "" }]).length === 0);
});

Deno.test("referência usa somente campos explícitos dos registros consultados", () => {
  assert(recordPeriods([{ competencia: "2026-09", valor: 2099 }, { competencia: "2026-10" }], ["competencia"]) === "2026-09 a 2026-10 (referências dos registros)");
  assert(recordPeriods([{ ano: 2024 }, { ano: 2024 }], ["ano"]) === "2024");
  assert(recordPeriods([{ descricao: "em 2026", valor: 2025 }], ["competencia"]) === null);
});

Deno.test("evento de fontes é independente dos tokens do modelo", async () => {
  const provider = 'data: {"choices":[{"delta":{"content":"https://inventada.example"}}]}\n\ndata: [DONE]\n\n';
  const upstream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode(provider)); controller.close(); } });
  const response = await new Response(streamWithSources(upstream, [source])).text();
  const firstEvent = response.split("\n\n")[0];
  assert(firstEvent.startsWith("event: sources\ndata: "));
  assert(!firstEvent.includes("inventada.example"));
  assert(response.endsWith(provider));
});

Deno.test("cancelamento do consumidor encerra leitura do provider", async () => {
  let cancelled = false;
  const upstream = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
  const stream = streamWithSources(upstream, [source]);
  await stream.cancel("cliente desconectado");
  assert(cancelled);
});
