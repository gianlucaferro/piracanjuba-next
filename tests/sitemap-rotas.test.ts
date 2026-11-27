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
import { FICHAS_REBAIXADAS, SLUGS_PAGINAS_EMPRESARIAIS } from "../src/data/empresas-slugs.ts";

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

const SLUGS_FICHAS_ZAP = new Set<string>(
  (JSON.parse(readFileSync(join(RAIZ, "src/data/previas-zap.json"), "utf8")) as { slug: string }[]).map(({ slug }) => slug),
);

/**
 * Rota que responde 200: página estática de src/app, ficha do catálogo do guia em
 * /zap-pba/<slug> ou aba conhecida da Prefeitura ou da Câmara.
 */
function rotaExiste(rota: string): boolean {
  if (PAGINAS.has(rota)) return true;
  const ficha = rota.match(/^\/zap-pba\/([a-z0-9-]+)$/);
  if (ficha) return SLUGS_FICHAS_ZAP.has(ficha[1]);
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
    ["/zap-pba/oticas-diego", "/oticas-diego"],
    ["/zap-pba/box-87-auto-center", "/box-87-auto-center"],
    ["/zap-pba/viaggi-vistos", "/viaggi-vistos"],
    ["/zap-pba/smart-especializada", "/smart-especializada"],
    ["/zap-pba/as-meninas-multimarcas", "/as-meninas-multimarcas"],
    ["/zap-pba/superfrio-ar-condicionado", "/superfrio-ar-condicionado"],
  ]) {
    assert.equal(REDIRECIONAMENTOS_PERMANENTES[origem], destino);
    assert.ok(!fichas.some(({ slug }) => `/zap-pba/${slug}` === origem));
    assert.ok(NO_SITEMAP.has(destino));
    assert.ok(Object.values(vinculos).includes(destino));
    assert.ok(!Object.values(vinculos).includes(origem));
  }
});

test("empresa que recusou a landing volta à ficha neutra do guia, sem página nem marca", async () => {
  // Procedimento em docs/empresa-recusou-landing.md (decisão do operador de 2026-11-26).
  const fichas: { slug: string; logo?: string; cor?: string }[] = JSON.parse(readFileSync(join(RAIZ, "src/data/previas-zap.json"), "utf8"));
  const vinculos: Record<string, string> = JSON.parse(readFileSync(join(RAIZ, "src/data/zap-pba-paginas.json"), "utf8"));
  const rewrites = await nextConfig.rewrites?.();
  const listaRewrites = Array.isArray(rewrites) ? rewrites : [...(rewrites?.beforeFiles ?? []), ...(rewrites?.afterFiles ?? []), ...(rewrites?.fallback ?? [])];
  assert.deepEqual(FICHAS_REBAIXADAS.map(({ slug }) => slug).sort(), [
    "adriana-manicure-e-pedicure", "agro-franca", "b10-auto-center", "claro", "kamilla-morranna", "master-tech-auto-center",
  ]);
  const curtasAntigas: Record<string, string> = { claro: "claro-piracanjuba" };
  for (const { slug, curta: semBarra } of FICHAS_REBAIXADAS) {
    const curta = `/${semBarra}`;
    const ficha = `/zap-pba/${slug}`;
    // A URL curta serve a ficha por rewrite, nunca por 308: o 308 antigo ficha -> curta pode
    // estar guardado no navegador, e o novo formaria um laço.
    assert.ok(listaRewrites.some(({ source, destination }) => source === curta && destination === ficha), `${curta} deve servir a ficha por rewrite`);
    assert.ok(!(curta in REDIRECIONAMENTOS_PERMANENTES), `${curta} não pode redirecionar`);
    assert.ok(!PAGINAS.has(curta), `${curta} ainda tem page.tsx`);
    assert.ok(!SLUGS_PAGINAS_EMPRESARIAIS.includes(semBarra), `${semBarra} ainda está entre as páginas de empresa`);
    assert.ok(!NO_SITEMAP.has(curta), `${curta} ainda está no sitemap`);
    assert.ok(!(ficha in REDIRECIONAMENTOS_PERMANENTES), `${ficha} não pode redirecionar para a antiga landing`);
    for (const pasta of new Set([slug, semBarra, curtasAntigas[slug]].filter(Boolean))) {
      assert.ok(!existsSync(join(RAIZ, "public", "empresas", pasta)), `public/empresas/${pasta} ainda existe`);
    }
    const registro = fichas.find((item) => item.slug === slug);
    assert.ok(registro, `${slug} saiu do catálogo do guia`);
    assert.equal(registro.logo, undefined, `${slug} não pode levar logo`);
    assert.equal(registro.cor, undefined, `${slug} não pode levar a cor da marca`);
    // B10 e Agro França nunca tiveram cadastro no diretório do Zap PBA: não há vínculo a apontar.
    if (!["b10-auto-center", "agro-franca"].includes(slug)) assert.ok(Object.values(vinculos).includes(ficha), `o guia não aponta para ${ficha}`);
    assert.ok(!Object.values(vinculos).includes(curta), `o guia ainda aponta para ${curta}`);
    assert.ok(existsSync(join(RAIZ, "public", "marcas-zap", "compartilhar", `${slug}.jpg`)), `falta o cartão de ${slug}`);
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

test("atalhos das fichas rebaixadas levam à ficha do guia com 308", () => {
  assert.equal(REDIRECIONAMENTOS_PERMANENTES["/mastertech"], "/zap-pba/master-tech-auto-center");
  assert.equal(REDIRECIONAMENTOS_PERMANENTES["/claro-piracanjuba"], "/zap-pba/claro");
  assert.equal(REDIRECIONAMENTOS_PERMANENTES["/b10"], "/zap-pba/b10-auto-center");
});
