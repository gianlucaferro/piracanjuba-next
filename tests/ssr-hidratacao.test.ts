import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buscaNoServidorDesligada, COOKIE_SEM_BUSCA_SERVIDOR } from "../src/lib/ssr-hidratacao.ts";

// A busca no servidor das abas de Prefeitura e Câmara só desliga em teste de navegador que pede
// (cookie) e com o servidor de e2e (PIRACANJUBA_E2E=1). Onda 2 de SEO, 2026-11-19.
const ler = (caminho: string) => readFileSync(new URL(caminho, import.meta.url), "utf8");

test("fora do servidor de e2e a busca no servidor nunca desliga, sem ler cookie", async () => {
  const antes = process.env.PIRACANJUBA_E2E;
  try {
    delete process.env.PIRACANJUBA_E2E;
    assert.equal(await buscaNoServidorDesligada(), false);
    process.env.PIRACANJUBA_E2E = "0";
    assert.equal(await buscaNoServidorDesligada(), false);
  } finally {
    if (antes === undefined) delete process.env.PIRACANJUBA_E2E;
    else process.env.PIRACANJUBA_E2E = antes;
  }
});

test("o servidor de e2e liga a variável, os carregadores consultam e só os testes com Supabase no navegador pedem", () => {
  assert.match(ler("../scripts/validation/e2e-server.mjs"), /PIRACANJUBA_E2E: "1"/);
  assert.match(ler("../src/lib/prefeitura-ssr.ts"), /if \(await buscaNoServidorDesligada\(\)\) return/);
  assert.match(ler("../src/app/camara/[aba]/bloco-servidor.tsx"), /if \(await buscaNoServidorDesligada\(\)\) return null;/);
  for (const spec of ["prefeitura-folha", "servidor-resumo"]) {
    assert.match(ler(`./e2e/${spec}.spec.ts`), new RegExp(`name: "${COOKIE_SEM_BUSCA_SERVIDOR}", value: "1"`));
  }
  // O teste que confere o HTML do servidor não pode desligar a busca.
  assert.doesNotMatch(ler("./e2e/abas-orgaos.spec.ts"), new RegExp(COOKIE_SEM_BUSCA_SERVIDOR));
});
