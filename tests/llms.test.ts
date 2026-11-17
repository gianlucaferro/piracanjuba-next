import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { EMPRESAS } from "../src/data/empresas.ts";
import { SLUGS_EMPRESAS } from "../src/data/empresas-slugs.ts";
import {
  GRUPOS_DINAMICOS,
  SECOES_LLMS,
  SITE_URL,
  caminhoDaUrl,
  dataIso,
  empresasParaLlms,
  montarLlmsFullTxt,
  montarLlmsTxt,
  paginaCurada,
} from "../src/data/llms.ts";
import { NOTA_PNTP } from "../src/data/notaTransparencia.ts";
import { ABAS_CAMARA, ABAS_PREFEITURA, ROTAS_ESTATICAS } from "../src/lib/sitemap-rotas.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const APP = join(RAIZ, "src/app");

// Caminhos fixos do sitemap, da mesma lista que o src/app/sitemap.ts usa
// (src/lib/sitemap-rotas.ts não importa o Supabase, então roda no node --test):
// rotas estáticas e as abas da Prefeitura e da Câmara.
function caminhosEstaticosDoSitemap(): string[] {
  const caminhos = new Set<string>(ROTAS_ESTATICAS.map((rota) => rota.path));
  for (const aba of ABAS_PREFEITURA) caminhos.add(`/prefeitura/${aba}`);
  for (const aba of ABAS_CAMARA) caminhos.add(`/camara/${aba}`);
  return [...caminhos];
}

// Chaves aceitas pelas páginas [aba] (objeto ABAS de cada page.tsx).
function abasAceitas(pasta: string): Set<string> {
  const fonte = readFileSync(join(APP, pasta, "[aba]", "page.tsx"), "utf8");
  const bloco = fonte.slice(fonte.indexOf("const ABAS"), fonte.indexOf("\n};", fonte.indexOf("const ABAS")));
  return new Set([...bloco.matchAll(/^\s*"?([a-z0-9-]+)"?\s*:\s*\{/gm)].map((m) => m[1]));
}

// Resolve um caminho para uma página de src/app, aceitando pasta literal ou dinâmica.
function rotaExiste(caminho: string): boolean {
  if (caminho === "/") return existsSync(join(APP, "page.tsx"));
  const segmentos = caminho.slice(1).split("/");
  let pasta = APP;
  for (const [i, segmento] of segmentos.entries()) {
    if (existsSync(join(pasta, segmento))) {
      pasta = join(pasta, segmento);
      continue;
    }
    const dinamica = readdirSync(pasta).find((nome) => /^\[[^.\]]+\]$/.test(nome));
    if (!dinamica) return false;
    if (dinamica === "[aba]" && !abasAceitas(segmentos.slice(0, i).join("/")).has(segmento)) return false;
    // Na raiz, a rota dinâmica é a página de empresa, que só aceita os slugs vendidos.
    if (dinamica === "[empresa]" && !(SLUGS_EMPRESAS as readonly string[]).includes(segmento)) return false;
    pasta = join(pasta, dinamica);
  }
  return existsSync(join(pasta, "page.tsx"));
}

const ESTATICOS = caminhosEstaticosDoSitemap();
const EMPRESAS_LLMS = empresasParaLlms(SLUGS_EMPRESAS.map((slug) => EMPRESAS[slug]));
const ENTRADA = {
  urls: [
    ...ESTATICOS.map((c) => (c === "/" ? `${SITE_URL}/` : `${SITE_URL}${c}`)),
    ...SLUGS_EMPRESAS.map((slug) => `${SITE_URL}/${slug}`),
    `${SITE_URL}/vereadores/fulano-de-tal`,
    `${SITE_URL}/vereadores/beltrana-silva`,
    `${SITE_URL}/compra-e-venda/0b7c1f8e-0000-4000-8000-000000000001`,
  ],
  empresas: EMPRESAS_LLMS,
  geradoEm: new Date("2026-11-17T15:00:00Z"),
};
const LLMS = montarLlmsTxt(ENTRADA);
const LLMS_FULL = montarLlmsFullTxt(ENTRADA);

test("a leitura do sitemap encontra as seções e as abas", () => {
  assert.ok(ESTATICOS.includes("/"));
  assert.ok(ESTATICOS.includes("/camara"));
  assert.ok(ESTATICOS.includes("/prefeitura/funprepi"));
  assert.ok(ESTATICOS.includes("/camara/prestacao-contas"));
  assert.ok(ESTATICOS.length > 50, `só ${ESTATICOS.length} caminhos lidos do sitemap`);
});

test("todo caminho fixo do sitemap tem descrição curada", () => {
  const semDescricao = ESTATICOS.filter((c) => !paginaCurada(c));
  assert.deepEqual(semDescricao, [], `descreva em src/data/llms.ts: ${semDescricao.join(", ")}`);
  assert.doesNotMatch(LLMS, /## Outras páginas/);
});

test("nenhuma descrição aponta para rota inexistente", () => {
  const caminhos = [
    ...SECOES_LLMS.flatMap((s) => s.paginas.map((p) => p.caminho)),
    ...GRUPOS_DINAMICOS.map((g) => g.caminhoIndice),
    ...GRUPOS_DINAMICOS.map((g) => `${g.prefixo}exemplo`),
  ];
  const quebrados = caminhos.filter((c) => !rotaExiste(c));
  assert.deepEqual(quebrados, []);
  const curados = SECOES_LLMS.flatMap((s) => s.paginas.map((p) => p.caminho));
  const repetidos = curados.filter((c, i) => curados.indexOf(c) !== i);
  assert.deepEqual(repetidos, []);
  assert.equal(rotaExiste("/pagina-que-nao-existe"), false);
  assert.equal(rotaExiste("/prefeitura/aba-que-nao-existe"), false);
});

test("as páginas que o sitemap vai ganhar já têm descrição", () => {
  for (const caminho of ["/clima", "/comparador", "/dados-pba", "/economia", "/indicadores", "/infraestrutura", "/meio-ambiente", "/privacidade"]) {
    assert.ok(paginaCurada(caminho), `${caminho} sem descrição`);
  }
});

test("llms.txt segue o formato do llmstxt.org e linka a versão ampliada", () => {
  const linhas = LLMS.split("\n");
  assert.equal(linhas[0], "# Piracanjuba.ai");
  assert.match(linhas[2], /^> /);
  assert.ok(LLMS.includes(`[llms-full.txt](${SITE_URL}/llms-full.txt)`));
  // A data é a da geração (a rota se regenera a cada hora), não de mudança do conteúdo.
  assert.ok(LLMS.includes("Gerado em: 2026-11-17."));
  assert.ok(LLMS_FULL.includes("Gerado em: 2026-11-17."));
  for (const texto of [LLMS, LLMS_FULL]) assert.doesNotMatch(texto, /Atualizado em/);
  for (const secao of ["Transparência", "Serviços da cidade", "Dados e indicadores", "Sobre e imprensa", "Páginas de empresas", "Fontes oficiais"]) {
    assert.ok(LLMS.includes(`\n## ${secao}\n`), `seção ${secao} ausente`);
  }
  // Toda linha de lista é link markdown.
  for (const l of linhas.filter((x) => x.startsWith("- "))) assert.match(l, /^- \[[^\]]+\]\(https:\/\/[^)]+\)/);
});

test("todo caminho do sitemap aparece no llms.txt, os dinâmicos em resumo", () => {
  for (const caminho of ESTATICOS) {
    const url = caminho === "/" ? `${SITE_URL}/` : `${SITE_URL}${caminho}`;
    assert.ok(LLMS.includes(`](${url})`), `${caminho} fora do llms.txt`);
  }
  for (const slug of SLUGS_EMPRESAS) assert.ok(LLMS.includes(`](${SITE_URL}/${slug})`));
  assert.match(LLMS, /\[Perfis dos vereadores\]\(https:\/\/piracanjuba\.ai\/vereadores\): 2 perfis individuais/);
  assert.match(LLMS, /\[Anúncios do Compra e Venda\]\(https:\/\/piracanjuba\.ai\/compra-e-venda\): 1 anúncio ativo/);
  assert.ok(LLMS_FULL.includes(`- ${SITE_URL}/vereadores/fulano-de-tal`));
});

test("páginas de empresas vêm com o aviso de página paga e o vínculo declarado", () => {
  const secao = LLMS.slice(LLMS.indexOf("## Páginas de empresas"), LLMS.indexOf("## Fontes oficiais"));
  assert.match(secao, /Páginas pagas por empresas/);
  assert.match(secao, /Página patrocinada/);
  for (const empresa of EMPRESAS_LLMS) {
    assert.ok(secao.includes(`[${empresa.nome}]`));
    if (empresa.vinculo) assert.ok(secao.includes(empresa.vinculo));
  }
  // Sob o aviso de página paga só entram as páginas de empresa; /anuncie é do
  // próprio portal e fica em "Sobre e imprensa".
  const linksDaSecao = [...secao.matchAll(/^- \[[^\]]+\]\(([^)]+)\)/gm)].map((m) => m[1]);
  assert.deepEqual(linksDaSecao.sort(), SLUGS_EMPRESAS.map((slug) => `${SITE_URL}/${slug}`).sort());
  const sobre = LLMS.slice(LLMS.indexOf("## Sobre e imprensa"), LLMS.indexOf("## Páginas de empresas"));
  assert.ok(sobre.includes(`[Anuncie sua empresa](${SITE_URL}/anuncie)`));
  assert.ok(SECOES_LLMS.find((s) => s.titulo === "Páginas de empresas")?.paginas.length === 0);
});

test("descrições dizem só o que a tela mostra", () => {
  // /vereadores mostra partido, cargo na Mesa, votos e contato, sem produção legislativa.
  assert.match(paginaCurada("/vereadores")?.descricao ?? "", /cargo na Mesa Diretora, votos na eleição e contato/);
  for (const texto of [LLMS, LLMS_FULL]) {
    assert.doesNotMatch(texto, /produção legislativa/);
    // O perfil traz a declaração de que não há cota, não uma cota.
    assert.doesNotMatch(texto, /(?<!não há )cota parlamentar/);
    assert.match(texto, /declaração oficial da Câmara de que não há cota parlamentar/);
  }
});

test("nota de transparência cita o ranking do TCM-GO pelo nome oficial e com o ano dos dados", () => {
  const descricao = paginaCurada("/nota-pba")?.descricao ?? "";
  assert.ok(descricao.includes(`Ranking da Transparência ${NOTA_PNTP.ano} do TCM-GO`));
  assert.ok(descricao.includes("Programa Nacional de Transparência Pública, PNTP/ATRICON"));
  assert.ok(descricao.includes(`dos ${NOTA_PNTP.executivo.total} municípios de Goiás`));
  for (const texto of [LLMS, LLMS_FULL]) assert.doesNotMatch(texto, /Ranking Nacional/i);
});

test("caminho do sitemap sem descrição não some: vai para Outras páginas", () => {
  const texto = montarLlmsTxt({ ...ENTRADA, urls: [...ENTRADA.urls, `${SITE_URL}/secao-nova`, "https://outro.site/x"] });
  assert.match(texto, /## Outras páginas\n\n- \[\/secao-nova\]\(https:\/\/piracanjuba\.ai\/secao-nova\)/);
  assert.doesNotMatch(texto, /outro\.site/);
});

test("texto sem afirmações proibidas, sem promessas sem tela e sem travessão", () => {
  for (const texto of [LLMS, LLMS_FULL]) {
    assert.doesNotMatch(texto, /fins lucrativos/i);
    assert.doesNotMatch(texto, /vota[cç]/i);
    assert.doesNotMatch(texto, /presen[cç]a em sess/i);
    assert.doesNotMatch(texto, /metodolog/i);
    assert.doesNotMatch(texto, /[\u2013\u2014]/);
    assert.doesNotMatch(texto, /undefined|null|NaN/);
    assert.match(texto, /Ferro Labs Tecnologia LTDA \(CNPJ 66\.034\.538\/0001-25\)/);
    assert.match(texto, /não tem vínculo com a Prefeitura nem com a Câmara/);
  }
});

test("llms-full.txt traz população e área do IBGE com ano", () => {
  assert.match(LLMS_FULL, /População: cerca de 25,4 mil habitantes \(IBGE, estimativa da população residente para 2026\)/);
  assert.match(LLMS_FULL, /Área: 2\.374,232 km² \(IBGE, área territorial oficial de 2025\)/);
  assert.ok(LLMS_FULL.includes(`[llms.txt](${SITE_URL}/llms.txt)`));
});

test("datas e caminhos auxiliares", () => {
  assert.equal(dataIso(new Date("2026-11-18T02:00:00Z")), "2026-11-17");
  assert.equal(caminhoDaUrl(`${SITE_URL}/`), "/");
  assert.equal(caminhoDaUrl(`${SITE_URL}/camara/`), "/camara");
  assert.equal(caminhoDaUrl("https://www.piracanjuba.ai/camara"), null);
  assert.equal(caminhoDaUrl("não é url"), null);
});

test("as rotas têm um só dono: nada de llms*.txt em public/", () => {
  assert.equal(existsSync(join(RAIZ, "public/llms.txt")), false);
  assert.equal(existsSync(join(RAIZ, "public/llms-full.txt")), false);
  assert.ok(existsSync(join(APP, "llms.txt/route.ts")));
  assert.ok(existsSync(join(APP, "llms-full.txt/route.ts")));
});
