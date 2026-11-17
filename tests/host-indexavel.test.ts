import assert from "node:assert/strict";
import test from "node:test";
import { hostSemIndexacao, normalizarHost } from "../src/lib/host-indexavel.ts";

test("hosts da Vercel saem sem indexação", () => {
  assert.equal(hostSemIndexacao("piracanjuba-next.vercel.app"), true);
  assert.equal(hostSemIndexacao("piracanjuba-next-git-seo-onda1-gianlucaferro.vercel.app"), true);
  assert.equal(hostSemIndexacao("PIRACANJUBA-NEXT.VERCEL.APP:443"), true);
  assert.equal(hostSemIndexacao("piracanjuba-next.vercel.app."), true);
});

test("domínio canônico, www e ambiente local continuam indexáveis", () => {
  assert.equal(hostSemIndexacao("piracanjuba.ai"), false);
  assert.equal(hostSemIndexacao("www.piracanjuba.ai"), false);
  assert.equal(hostSemIndexacao("localhost:3000"), false);
  assert.equal(hostSemIndexacao(null), false);
  assert.equal(hostSemIndexacao(undefined), false);
  assert.equal(hostSemIndexacao(""), false);
});

test("só o sufixo .vercel.app conta, não o texto no meio do host", () => {
  assert.equal(hostSemIndexacao("vercel.app.exemplo.com"), false);
  assert.equal(hostSemIndexacao("piracanjubavercel.app"), false);
});

test("normalizarHost tira porta, ponto final e caixa alta", () => {
  assert.equal(normalizarHost(" Piracanjuba.AI:8080 "), "piracanjuba.ai");
  assert.equal(normalizarHost("piracanjuba.ai."), "piracanjuba.ai");
});
