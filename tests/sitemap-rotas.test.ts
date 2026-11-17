import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import test from "node:test";
import {
  ABAS_CAMARA,
  ABAS_PREFEITURA,
  ROTAS_DINAMICAS_NO_SITEMAP,
  ROTAS_ESTATICAS,
  ROTAS_FORA_DO_SITEMAP,
} from "../src/lib/sitemap-rotas.ts";

const RAIZ = new URL("..", import.meta.url).pathname;
const APP = join(RAIZ, "src", "app");
const ARQUIVO_DE_PAGINA = /^page\.(tsx|ts|jsx|js|mdx)$/;
const NOINDEX = /noIndex:\s*true|index:\s*false/;

/** Rota pública de cada page.* em src/app (grupos "(x)" não entram no endereço). */
function paginasDoApp(): Map<string, string> {
  const rotas = new Map<string, string>();
  const visitar = (pasta: string) => {
    for (const item of readdirSync(pasta, { withFileTypes: true })) {
      const caminho = join(pasta, item.name);
      if (item.isDirectory()) {
        // Pastas privadas (_x) e slots paralelos (@x) não viram endereço próprio.
        if (!item.name.startsWith("_") && !item.name.startsWith("@")) visitar(caminho);
        continue;
      }
      if (!ARQUIVO_DE_PAGINA.test(item.name)) continue;
      const segmentos = relative(APP, pasta)
        .split(sep)
        .filter((s) => s && !/^\(.*\)$/.test(s));
      rotas.set(`/${segmentos.join("/")}`, caminho);
    }
  };
  visitar(APP);
  return rotas;
}

const PAGINAS = paginasDoApp();
const NO_SITEMAP = new Set(ROTAS_ESTATICAS.map((r) => r.path));
const ehDinamica = (rota: string) => rota.includes("[");

function chavesDeAbas(arquivo: string): string[] {
  const fonte = readFileSync(join(APP, arquivo), "utf8");
  const inicio = fonte.indexOf("const ABAS");
  assert.ok(inicio >= 0, `const ABAS não encontrado em src/app/${arquivo}`);
  const bloco = fonte.slice(inicio, fonte.indexOf("\n};", inicio));
  return [...bloco.matchAll(/^\s*"?([a-z0-9-]+)"?\s*:\s*\{/gm)].map((m) => m[1]);
}

test("o varredor encontra as páginas de src/app", () => {
  assert.ok(PAGINAS.size > 40, `só ${PAGINAS.size} páginas encontradas`);
  assert.ok(PAGINAS.has("/"));
  assert.ok(PAGINAS.has("/clima"));
});

test("toda página estática de src/app está no sitemap ou tem motivo para ficar fora", () => {
  const faltando = [...PAGINAS.keys()]
    .filter((rota) => !ehDinamica(rota))
    .filter((rota) => !NO_SITEMAP.has(rota) && !(rota in ROTAS_FORA_DO_SITEMAP))
    .sort();
  assert.deepEqual(
    faltando,
    [],
    "Página nova fora do sitemap: incluir em ROTAS_ESTATICAS ou, com o motivo, em ROTAS_FORA_DO_SITEMAP (src/lib/sitemap-rotas.ts)",
  );
});

test("toda rota dinâmica declara de onde vêm as URLs dela no sitemap", () => {
  const semOrigem = [...PAGINAS.keys()].filter((rota) => ehDinamica(rota) && !(rota in ROTAS_DINAMICAS_NO_SITEMAP)).sort();
  assert.deepEqual(semOrigem, [], "Rota dinâmica nova: declarar em ROTAS_DINAMICAS_NO_SITEMAP (src/lib/sitemap-rotas.ts)");
});

test("sitemap, exclusões e rotas dinâmicas só citam páginas que existem", () => {
  const citadas = [...NO_SITEMAP, ...Object.keys(ROTAS_FORA_DO_SITEMAP), ...Object.keys(ROTAS_DINAMICAS_NO_SITEMAP)];
  const inexistentes = citadas.filter((rota) => !PAGINAS.has(rota)).sort();
  assert.deepEqual(inexistentes, []);
});

test("nenhuma rota repete no sitemap nem está ao mesmo tempo dentro e fora dele", () => {
  assert.equal(NO_SITEMAP.size, ROTAS_ESTATICAS.length, "rota repetida em ROTAS_ESTATICAS");
  const nosDois = Object.keys(ROTAS_FORA_DO_SITEMAP).filter((rota) => NO_SITEMAP.has(rota));
  assert.deepEqual(nosDois, []);
});

test("página com noindex fica fora do sitemap e a exclusão diz que ela é noindex", () => {
  for (const [rota, arquivo] of PAGINAS) {
    if (ehDinamica(rota) || !NOINDEX.test(readFileSync(arquivo, "utf8"))) continue;
    assert.ok(!NO_SITEMAP.has(rota), `${rota} é noindex e não pode estar no sitemap`);
    assert.equal(ROTAS_FORA_DO_SITEMAP[rota]?.noindex, true, `${rota} é noindex: marcar noindex: true na exclusão`);
  }
  for (const [rota, { noindex }] of Object.entries(ROTAS_FORA_DO_SITEMAP)) {
    const fonte = readFileSync(PAGINAS.get(rota) ?? "", "utf8");
    assert.equal(NOINDEX.test(fonte), noindex, `${rota}: noindex declarado na exclusão não bate com a página`);
  }
});

test("abas do sitemap batem com as abas aceitas pelas páginas da Prefeitura e da Câmara", () => {
  assert.deepEqual([...ABAS_PREFEITURA].sort(), chavesDeAbas("prefeitura/[aba]/page.tsx").sort());
  assert.deepEqual([...ABAS_CAMARA].sort(), chavesDeAbas("camara/[aba]/page.tsx").sort());
});

test("as oito páginas que faltavam no sitemap (IDX-04 e KW-08) estão nele", () => {
  for (const rota of ["/clima", "/comparador", "/dados-pba", "/economia", "/indicadores", "/infraestrutura", "/meio-ambiente", "/privacidade"]) {
    assert.ok(NO_SITEMAP.has(rota), `${rota} fora do sitemap`);
  }
});
