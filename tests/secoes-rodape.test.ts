import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { SECOES_RODAPE } from "../src/data/secoesRodape.ts";

const APP = join(fileURLToPath(new URL("..", import.meta.url)), "src", "app");
const LINKS = SECOES_RODAPE.flatMap((grupo) => grupo.links);

// Rota estática (src/app/<caminho>/page.tsx) ou aba de /camara e /prefeitura,
// que moram em src/app/<órgão>/[aba]/page.tsx com a chave no mapa ABAS.
function rotaExiste(href: string): boolean {
  if (existsSync(join(APP, href, "page.tsx"))) return true;
  const partes = href.split("/").filter(Boolean);
  if (partes.length !== 2) return false;
  const [orgao, aba] = partes;
  const arquivo = join(APP, orgao, "[aba]", "page.tsx");
  if (!existsSync(arquivo)) return false;
  const chave = new RegExp(`^\\s*"?${aba}"?\\s*:\\s*\\{`, "m");
  return chave.test(readFileSync(arquivo, "utf8"));
}

test("cada link do bloco Seções aponta para uma rota que existe em src/app", () => {
  assert.ok(LINKS.length > 0);
  for (const { href } of LINKS) {
    assert.match(href, /^\/[a-z0-9-]+(\/[a-z0-9-]+)?$/, `href fora do padrão: ${href}`);
    assert.ok(rotaExiste(href), `rota inexistente: ${href}`);
  }
});

test("o bloco Seções cobre as páginas que não recebiam link interno (LINK-02)", () => {
  const hrefs = new Set(LINKS.map((link) => link.href));
  for (const obrigatoria of [
    "/vereadores",
    "/atuacao-parlamentar",
    "/noticias",
    "/emendas",
    "/investigacoes",
    "/historia-pba",
    "/nota-pba",
    "/dados-pba",
  ]) {
    assert.ok(hrefs.has(obrigatoria), `falta ${obrigatoria}`);
  }
});

test("links do bloco Seções não se repetem e têm âncora descritiva", () => {
  const hrefs = LINKS.map((link) => link.href);
  assert.equal(new Set(hrefs).size, hrefs.length, "href repetido");
  for (const { rotulo } of LINKS) {
    assert.ok(rotulo.trim().split(/\s+/).length >= 2, `âncora curta demais: ${rotulo}`);
    assert.doesNotMatch(rotulo, /^(ver|saiba|clique|mais|acesse)\b/i, `âncora genérica: ${rotulo}`);
    assert.doesNotMatch(rotulo, /[\u2013\u2014]/, `travessão na âncora: ${rotulo}`);
  }
});
