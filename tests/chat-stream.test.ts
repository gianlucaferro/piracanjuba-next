import assert from "node:assert/strict";
import test from "node:test";
import { createChatStreamParser, parseChatSources, type ChatSource } from "../src/lib/chat-stream.ts";

const source = { title: "Folha Prefeitura", url: "https://piracanjuba.ai/prefeitura/servidores", period: "2026-09", coverage: "Amostra de 30 de 1700 holerites." };

test("links clicáveis só vêm de evento separado e validado", () => {
  let sources: ChatSource[] = [];
  let response = "";
  const parser = createChatStreamParser({ onDelta: (text) => { response += text; }, onSources: (value) => { sources = value; } });
  const wire = `event: sources\r\ndata: ${JSON.stringify({ type: "sources", sources: [source] })}\r\n\r\ndata: ${JSON.stringify({ choices: [{ delta: { content: '[Inventada](https://inventada.example)' } }] })}\n\ndata: [DONE]`;
  for (const character of wire) parser.push(character);
  parser.finish();
  assert.equal(response, "[Inventada](https://inventada.example)");
  assert.deepEqual(sources, [source]);
});

test("fontes rejeitam URLs executáveis e conteúdo incompleto", () => {
  assert.deepEqual(parseChatSources([{ ...source, url: "javascript:alert(1)" }, { ...source, url: "https://user:password@example.test" }, { url: source.url }, null]), []);
  assert.deepEqual(parseChatSources([source, source]), [source]);
});

test("stream aceita último evento sem quebra final e ignora JSON inválido", () => {
  const deltas: string[] = [];
  const parser = createChatStreamParser({ onDelta: (value) => deltas.push(value), onSources: () => {} });
  parser.push('data: invalid\n\ndata: {"choices":[{"delta":{"content":"Olá"}}]}');
  parser.finish();
  assert.deepEqual(deltas, ["Olá"]);
});
