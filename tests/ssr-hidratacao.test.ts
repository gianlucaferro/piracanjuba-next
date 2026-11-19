import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buscaNoServidorDesligada } from "../src/lib/ssr-hidratacao.ts";

// Os testes de navegador simulam o Supabase no navegador; o servidor de e2e precisa desligar a
// busca no servidor das abas de Prefeitura e Câmara (Onda 2 de SEO, 2026-11-19).
const ler = (caminho: string) => readFileSync(new URL(caminho, import.meta.url), "utf8");

test("a busca no servidor só desliga com a variável do servidor de e2e", () => {
  const antes = process.env.PIRACANJUBA_E2E_SEM_BUSCA_SERVIDOR;
  try {
    delete process.env.PIRACANJUBA_E2E_SEM_BUSCA_SERVIDOR;
    assert.equal(buscaNoServidorDesligada(), false);
    process.env.PIRACANJUBA_E2E_SEM_BUSCA_SERVIDOR = "0";
    assert.equal(buscaNoServidorDesligada(), false);
    process.env.PIRACANJUBA_E2E_SEM_BUSCA_SERVIDOR = "1";
    assert.equal(buscaNoServidorDesligada(), true);
  } finally {
    if (antes === undefined) delete process.env.PIRACANJUBA_E2E_SEM_BUSCA_SERVIDOR;
    else process.env.PIRACANJUBA_E2E_SEM_BUSCA_SERVIDOR = antes;
  }
});

test("o servidor de e2e liga a variável e os dois carregadores a consultam", () => {
  assert.match(ler("../scripts/validation/e2e-server.mjs"), /PIRACANJUBA_E2E_SEM_BUSCA_SERVIDOR: "1"/);
  assert.match(ler("../src/lib/prefeitura-ssr.ts"), /if \(buscaNoServidorDesligada\(\)\) return/);
  assert.match(ler("../src/app/camara/[aba]/bloco-servidor.tsx"), /if \(buscaNoServidorDesligada\(\)\) return null;/);
});
