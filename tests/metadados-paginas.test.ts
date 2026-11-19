import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SUFIXO_TITULO } from "../src/lib/abas-orgaos.ts";

// Avisos do Bing Webmaster Tools lidos em 2026-11-19: título longo em /historia-pba (84
// caracteres) e /sobre (102, com travessão), description fora de 120 a 160 caracteres nas
// duas, e imagem de fundo da home sem alt. As páginas importam "@/...", que o node --test
// não resolve, então o teste lê o metadata direto do fonte.

function fonte(arquivo: string): string {
  return readFileSync(new URL(arquivo, import.meta.url), "utf8");
}

function metadataDaPagina(arquivo: string): { title: string; description: string } {
  const m = fonte(arquivo).match(
    /export const metadata = pageMetadata\(\{\s*title:\s*"([^"]+)",\s*description:\s*"([^"]+)"/
  );
  assert.ok(m, `${arquivo}: não achei title e description em pageMetadata`);
  return { title: m[1], description: m[2] };
}

for (const [rota, arquivo] of [
  ["/historia-pba", "../src/app/historia-pba/page.tsx"],
  ["/sobre", "../src/app/sobre/page.tsx"],
] as const) {
  test(`${rota}: título até 60 caracteres e description de 120 a 160, sem travessão`, () => {
    const { title, description } = metadataDaPagina(arquivo);
    // O layout aplica o template "%s | Piracanjuba.ai" às páginas internas.
    const renderizado = title + SUFIXO_TITULO;
    assert.ok(renderizado.length <= 60, `título renderizado com ${renderizado.length} caracteres`);
    assert.ok(description.length >= 120 && description.length <= 160, `description com ${description.length}`);
    assert.doesNotMatch(title + description, /[\u2013\u2014]/);
    assert.doesNotMatch(title, /\|/, "o sufixo vem do layout");
  });
}

test("home: título sem travessão e imagem de fundo com alt descritivo", () => {
  // Na home o template do layout não se aplica (mesmo segmento de rota), o título vai como está.
  const { title } = metadataDaPagina("../src/app/page.tsx");
  assert.doesNotMatch(title, /[\u2013\u2014]/);
  assert.match(title, /^Piracanjuba\.ai/);

  const home = fonte("../src/app/page.tsx");
  const hero = home.match(/<Image\s+src="\/hero-piracanjuba\.webp"[\s\S]*?\/>/);
  assert.ok(hero, "não achei a imagem de fundo da home");
  const alt = hero[0].match(/\balt="([^"]*)"/);
  assert.ok(alt && alt[1].trim().length > 10, "imagem de fundo sem alt descritivo");
  // Com alt informativo, a imagem não fica escondida dos leitores de tela.
  assert.doesNotMatch(hero[0], /aria-hidden/);
});
