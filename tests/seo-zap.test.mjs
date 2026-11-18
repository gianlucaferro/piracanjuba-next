import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";

const aliases = registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      specifier = new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href;
    }
    return next(specifier, context);
  },
});
const { metadadosFichaZap, jsonLdFichaZap } = await import("../src/lib/seo-zap.ts");
aliases.deregister();

const catalogo = JSON.parse(readFileSync(new URL("../src/data/previas-zap.json", import.meta.url), "utf8"));
const vinculos = JSON.parse(readFileSync(new URL("../src/data/zap-pba-paginas.json", import.meta.url), "utf8"));
const exemplo = {
  slug: "oficina-exemplo",
  nome: "Oficina Exemplo",
  atividade: "Oficina",
  resumo: "Manutenção de veículos.",
  telefones: ["5564999990000"],
  endereco: "Av. Principal, 40 - Centro, Piracanjuba - GO, 75640-000",
};

test("cada ficha ativa tem vínculo no diretório, canonical e cartão próprios", () => {
  const destinos = new Set(Object.values(vinculos));
  const titulos = new Set();
  for (const ficha of catalogo) {
    const caminho = `/zap-pba/${ficha.slug}`;
    const meta = metadadosFichaZap(ficha);
    assert.ok(destinos.has(caminho), caminho);
    assert.equal(meta.alternates.canonical, caminho);
    assert.equal(meta.openGraph.url, `https://piracanjuba.ai${caminho}`);
    assert.equal(meta.openGraph.images[0].url, `/marcas-zap/compartilhar/${ficha.slug}.jpg`);
    assert.equal(meta.description, ficha.resumo);
    assert.ok(meta.title.includes(ficha.nome));
    assert.equal(meta.robots, undefined);
    titulos.add(meta.title);
  }
  assert.equal(titulos.size, catalogo.length);
});

test("JSON-LD descreve a unidade local só com endereço e distingue os canais da rede", () => {
  const ficha = {
    ...exemplo,
    contatoRede: true,
    site: "https://example.org",
    siteRede: true,
    instagram: "https://www.instagram.com/exemplo",
    instagramRede: true,
    foto: "/marcas-zap/setores/oficina.webp",
  };
  const [pagina, navegacao, negocio] = JSON.parse(jsonLdFichaZap(ficha))["@graph"];
  assert.equal(pagina.mainEntity["@id"], negocio["@id"]);
  assert.equal(pagina.breadcrumb["@id"], navegacao["@id"]);
  assert.equal(navegacao.itemListElement.at(-1).item, pagina.url);
  assert.equal(negocio["@type"], "LocalBusiness");
  assert.equal(negocio.address.streetAddress, "Av. Principal, 40 - Centro");
  assert.equal(negocio.address.postalCode, "75640-000");
  for (const campo of ["url", "sameAs", "telephone", "image", "openingHours", "aggregateRating"]) {
    assert.ok(!(campo in negocio), campo);
  }
});

test("sem logradouro confirmado, publica apenas página e navegação com texto seguro", () => {
  const resumo = "Peças <sob encomenda> e acessórios.";
  for (const endereco of [undefined, "Piracanjuba, Goiás", "Av. Principal, Goiânia - GO"]) {
    const texto = jsonLdFichaZap({ ...exemplo, endereco, resumo });
    assert.ok(!texto.includes("<"));
    const grafo = JSON.parse(texto)["@graph"];
    assert.deepEqual(grafo.map((no) => no["@type"]), ["WebPage", "BreadcrumbList"]);
    assert.equal(grafo[0].description, resumo);
    assert.ok(!grafo[0].mainEntity);
  }
});
