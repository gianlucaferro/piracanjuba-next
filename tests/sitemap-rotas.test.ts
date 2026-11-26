import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import nextConfig from "../next.config.ts";
import {
  ABAS_CAMARA,
  ABAS_PREFEITURA,
  REDIRECIONAMENTOS_PERMANENTES,
  ROTAS_DINAMICAS_NO_SITEMAP,
  ROTAS_ESTATICAS,
  ROTAS_FORA_DO_SITEMAP,
} from "../src/lib/sitemap-rotas.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
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

// Onda 2 (IDX-03 e CONT-03, 2026-11-19): seis páginas /transparencia/* foram levadas para a aba
// equivalente da Câmara e respondem 308. As duas sem aba equivalente ficam e entram no sitemap.

/** Rota que responde 200: página estática de src/app ou aba conhecida da Prefeitura ou da Câmara. */
function rotaExiste(rota: string): boolean {
  if (PAGINAS.has(rota)) return true;
  const aba = rota.match(/^\/(camara|prefeitura)\/([a-z0-9-]+)$/);
  if (!aba) return false;
  const abas: readonly string[] = aba[1] === "camara" ? ABAS_CAMARA : ABAS_PREFEITURA;
  return abas.includes(aba[2]);
}

// Rewrite de imagem antiga (cartão de compartilhamento de prévia que virou página própria):
// o destino precisa existir em public/, senão o cartão que circula no WhatsApp quebra em silêncio.
test("todo rewrite para um arquivo aponta para um arquivo que existe em public", async () => {
  const rewrites = await nextConfig.rewrites?.();
  const lista = Array.isArray(rewrites) ? rewrites : [...(rewrites?.beforeFiles ?? []), ...(rewrites?.afterFiles ?? []), ...(rewrites?.fallback ?? [])];
  const deArquivo = lista.filter(({ destination }) => /\.[a-z0-9]+$/i.test(destination));
  assert.ok(deArquivo.length > 0);
  for (const { source, destination } of deArquivo) {
    assert.ok(existsSync(join(RAIZ, "public", destination)), `${source} reescreve para ${destination}, que não existe em public`);
  }
});

test("os redirects permanentes de next.config.ts são os de REDIRECIONAMENTOS_PERMANENTES", async () => {
  const redirects = (await nextConfig.redirects?.()) ?? [];
  const permanentes = Object.fromEntries(redirects.filter((r) => r.permanent === true).map((r) => [r.source, r.destination]));
  assert.deepEqual(permanentes, { ...REDIRECIONAMENTOS_PERMANENTES });
});

test("cada origem do redirect aponta para rota que existe e não tem mais página própria", () => {
  assert.equal(Object.keys(REDIRECIONAMENTOS_PERMANENTES).filter((rota) => rota.startsWith("/transparencia/")).length, 6);
  for (const [origem, destino] of Object.entries(REDIRECIONAMENTOS_PERMANENTES)) {
    assert.ok(rotaExiste(destino), `${origem} aponta para ${destino}, que não existe`);
    assert.ok(!PAGINAS.has(origem), `${origem} redireciona, mas a page.tsx dela continua em src/app`);
    assert.ok(!(destino in REDIRECIONAMENTOS_PERMANENTES), `${destino} também redireciona (cadeia de redirects)`);
  }
});

test("prévias com página própria saem do catálogo e apontam à canônica do sitemap e do guia", () => {
  const fichas: { slug: string }[] = JSON.parse(readFileSync(join(RAIZ, "src/data/previas-zap.json"), "utf8"));
  const vinculos: Record<string, string> = JSON.parse(readFileSync(join(RAIZ, "src/data/zap-pba-paginas.json"), "utf8"));
  for (const [origem, destino] of [
    ["/zap-pba/ellen-vieira-advocacia", "/evadvocacia"],
    ["/zap-pba/claro", "/claro"],
    ["/zap-pba/oticas-diego", "/oticas-diego"],
    ["/zap-pba/kamilla-morranna", "/kamillamorranna"],
    ["/zap-pba/box-87-auto-center", "/box-87-auto-center"],
    ["/zap-pba/master-tech-auto-center", "/master-tech-auto-center"],
    ["/zap-pba/viaggi-vistos", "/viaggi-vistos"],
    ["/zap-pba/smart-especializada", "/smart-especializada"],
    ["/zap-pba/as-meninas-multimarcas", "/as-meninas-multimarcas"],
  ]) {
    assert.equal(REDIRECIONAMENTOS_PERMANENTES[origem], destino);
    assert.ok(!fichas.some(({ slug }) => `/zap-pba/${slug}` === origem));
    assert.ok(NO_SITEMAP.has(destino));
    assert.ok(Object.values(vinculos).includes(destino));
    assert.ok(!Object.values(vinculos).includes(origem));
  }
});

test("a página do Hotel Via Sul fica em /hotel, com os atalhos em 308", () => {
  assert.ok(PAGINAS.has("/hotel"));
  assert.ok(NO_SITEMAP.has("/hotel"));
  assert.equal(REDIRECIONAMENTOS_PERMANENTES["/hotelviasul"], "/hotel");
  assert.equal(REDIRECIONAMENTOS_PERMANENTES["/hotel-via-sul"], "/hotel");
});

test("nada redirecionado fica no sitemap nem nas exclusões", () => {
  for (const origem of Object.keys(REDIRECIONAMENTOS_PERMANENTES)) {
    assert.ok(!NO_SITEMAP.has(origem), `${origem} redireciona e não pode estar no sitemap`);
    assert.ok(!(origem in ROTAS_FORA_DO_SITEMAP), `${origem} redireciona: tirar de ROTAS_FORA_DO_SITEMAP`);
  }
});

test("as páginas /transparencia/* que ficaram têm destino definido", () => {
  const restantes = [...PAGINAS.keys()].filter((rota) => rota.startsWith("/transparencia/")).sort();
  assert.deepEqual(restantes, ["/transparencia/cotas-parlamentares", "/transparencia/processos-publicos"]);
  assert.ok(NO_SITEMAP.has("/transparencia/cotas-parlamentares"), "/transparencia/cotas-parlamentares fora do sitemap");
  // Processos judiciais de pessoas nomeadas: alcance pendente de decisão do operador (2026-11-19).
  assert.ok(!NO_SITEMAP.has("/transparencia/processos-publicos"), "/transparencia/processos-publicos não entra no sitemap sem decisão do operador");
  assert.ok("/transparencia/processos-publicos" in ROTAS_FORA_DO_SITEMAP);
});

test("B10 Auto Center: canônica no sitemap e endereços curtos com 308", () => {
  assert.ok(PAGINAS.has("/b10-auto-center"));
  assert.ok(NO_SITEMAP.has("/b10-auto-center"));
  assert.equal(REDIRECIONAMENTOS_PERMANENTES["/zap-pba/b10-auto-center"], "/b10-auto-center");
  assert.equal(REDIRECIONAMENTOS_PERMANENTES["/b10"], "/b10-auto-center");
});
