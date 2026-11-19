import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SUFIXO_TITULO } from "../src/lib/abas-orgaos.ts";

// Revisão adversarial da Onda 2 (2026-11-19, achado zap-03): o title de /zap-pba
// renderizava "Zap PBA | WhatsApp de empresas e serviços em Piracanjuba | Piracanjuba.ai",
// com 73 caracteres e dois "|". A página importa "@/...", que o node --test não resolve,
// então o teste lê o metadata direto do fonte, como tests/metadados-paginas.test.ts.
const fonte = readFileSync(new URL("../src/app/zap-pba/page.tsx", import.meta.url), "utf8");
const m = fonte.match(
  /export const metadata = pageMetadata\(\{\s*title:\s*"([^"]+)",\s*description:\s*"([^"]+)"/,
);

test("/zap-pba: título curto com o sufixo, sem segundo separador", () => {
  assert.ok(m, "não achei title e description em pageMetadata");
  const [, title, description] = m;
  // O layout aplica o template "%s | Piracanjuba.ai" (src/app/zap-pba não tem layout próprio).
  const renderizado = title + SUFIXO_TITULO;
  // Até 61: os dois-pontos depois da marca custam 1 caractere e evitam o título emendado.
  assert.ok(renderizado.length <= 61, `título renderizado com ${renderizado.length} caracteres`);
  assert.doesNotMatch(title, /\|/, "o sufixo com | vem do layout");
  assert.match(title, /Zap PBA/);
  assert.match(title, /WhatsApp de empresas em Piracanjuba/);
  assert.ok(description.length >= 120 && description.length <= 160, `description com ${description.length}`);
  assert.doesNotMatch(title + description, /[\u2013\u2014]/);
});
