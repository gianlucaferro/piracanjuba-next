import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SUFIXO_TITULO } from "../src/lib/abas-orgaos.ts";
import { FUNDO_ELEITORAL_2024 } from "../src/lib/data/fundo-eleitoral-2024.ts";
import {
  identidadeParlamentar,
  nomeUrnaDiferente,
  outrosNomes,
  textoBuscaParlamentar,
} from "../src/app/vereadores/identidade.ts";
import { listaVereadoresJsonLd, pessoaVereadorJsonLd, serializarJsonLd } from "../src/app/vereadores/schema.ts";
import { fraseSubsidioParlamentar } from "../src/app/vereadores/remuneracao.ts";
import {
  referenciaParlamentar,
  tituloPerfilParlamentar,
  tratamentoParlamentar,
  urlBiografiaCamara,
} from "../src/app/vereadores/tratamento.ts";

// Os 11 slugs em produção (2026-11-19), com o nome exibido gravado em vereadores.
const NOMES: Record<string, string> = {
  "adriana-pinheiro": "Adriana Dias",
  "aparecida-divani": "Aparecida Cordeiro",
  "douglas-miranda": "Douglas Miranda",
  "edimar-lopes": "Edimar Lopes",
  "fernando-abraao": "Fernando Silva",
  "marco-antonio": "Marco Antônio",
  "reginaldo-moreira": "Reginaldo Silva",
  "sirley-wehbe": "Sirley de Fatima",
  "welton-eterno": "Welton da Silva",
  "wennder-trindade": "Wennder Trindade",
  "yuri-santiago": "Yuri Santiago",
};

test("todo parlamentar com tratamento tem nome de urna e nome civil conferidos", () => {
  for (const slug of Object.keys(NOMES)) {
    const id = identidadeParlamentar(slug);
    assert.ok(id, slug);
    assert.ok(id.nomeUrna.length > 0 && id.nomeCivil.length > 0, slug);
    assert.notEqual(tratamentoParlamentar(slug), "Vereador(a)", slug);
    assert.ok(urlBiografiaCamara(slug), slug);
  }
  assert.equal(identidadeParlamentar("slug-novo"), null);
  assert.equal(identidadeParlamentar("constructor"), null);
  assert.equal(identidadeParlamentar(null), null);
});

test("nome de urna da eleição de 2024 (resultado do TSE e biografia da Câmara)", () => {
  assert.equal(identidadeParlamentar("edimar-lopes")?.nomeUrna, "Edimar Taboca");
  assert.equal(identidadeParlamentar("sirley-wehbe")?.nomeUrna, "Sirley do Postinho");
  assert.equal(identidadeParlamentar("douglas-miranda")?.nomeUrna, "Professor Douglas");
  assert.equal(identidadeParlamentar("marco-antonio")?.nomeUrna, "Marcão Serra Negra");
  assert.equal(identidadeParlamentar("adriana-pinheiro")?.nomeUrna, "Adriana Pinheiro");
  assert.equal(identidadeParlamentar("aparecida-divani")?.nomeUrna, "Cida do Carmindo");
  // Igual ao nome exibido: não repete.
  assert.equal(nomeUrnaDiferente("Fernando Silva", "fernando-abraao"), null);
  assert.equal(nomeUrnaDiferente("Edimar Lopes", "edimar-lopes"), "Edimar Taboca");
  assert.equal(nomeUrnaDiferente("Qualquer", "slug-novo"), null);
});

test("outros nomes não repetem o nome exibido nem entre si", () => {
  assert.deepEqual(outrosNomes("Edimar Lopes", "edimar-lopes"), ["Edimar Taboca", "Edimar Lopes Machado"]);
  assert.deepEqual(outrosNomes("Fernando Silva", "fernando-abraao"), ["Fernando Abraão Magalhães Silva"]);
  assert.deepEqual(outrosNomes("Wennder Trindade", "wennder-trindade"), ["Wennder Trindade e Silva"]);
  assert.deepEqual(outrosNomes("Alguém", "slug-novo"), []);
  // Busca acha pelo nome de urna e pelo nome civil.
  assert.match(textoBuscaParlamentar("Marco Antônio", "marco-antonio"), /Marcão Serra Negra/);
  assert.match(textoBuscaParlamentar("Marco Antônio", "marco-antonio"), /Antunes da Cruz/);
});

test("Person do perfil: cargo pelo tratamento, Câmara, partido e só fonte oficial", () => {
  const p = pessoaVereadorJsonLd({
    nome: "Aparecida Cordeiro",
    slug: "aparecida-divani",
    partido: "PDT",
    cargo_mesa: "2ª Secretária",
    foto_url: "https://piracanjuba.go.leg.br/wp-content/uploads/2026/04/cida.jpg",
  });
  assert.equal(p["@type"], "Person");
  assert.equal(p["@id"], "https://piracanjuba.ai/vereadores/aparecida-divani#pessoa");
  assert.equal(p.name, "Aparecida Cordeiro");
  assert.deepEqual(p.alternateName, ["Cida do Carmindo", "Aparecida Divani Rocha Cordeiro"]);
  assert.equal(p.jobTitle, "Vereadora");
  assert.equal(p.memberOf["@id"], "https://piracanjuba.ai/#camara");
  assert.equal(p.memberOf.name, "Câmara Municipal de Piracanjuba");
  assert.deepEqual(p.affiliation, { "@type": "Organization", name: "PDT" });
  assert.equal(p.image, "https://piracanjuba.go.leg.br/wp-content/uploads/2026/04/cida.jpg");
  assert.deepEqual(p.sameAs, ["https://piracanjuba.go.leg.br/vereador/aparecida-cordeiro/"]);
  assert.equal(
    p.description,
    "Vereadora de Piracanjuba (GO), PDT, 2ª Secretária da Mesa Diretora, na Câmara Municipal de Piracanjuba.",
  );

  const semDado = pessoaVereadorJsonLd({ nome: "Pessoa Nova", slug: "slug-novo", partido: null, foto_url: null });
  assert.equal(semDado.jobTitle, "Vereador(a)");
  for (const chave of ["affiliation", "image", "sameAs", "alternateName"]) {
    assert.equal(chave in semDado, false, chave);
  }
});

test("ItemList de /vereadores com uma Person por perfil, na ordem da página", () => {
  const lista = listaVereadoresJsonLd([
    { nome: "Adriana Dias", slug: "adriana-pinheiro" },
    { nome: "Sem Perfil", slug: null },
    { nome: "Edimar Lopes", slug: "edimar-lopes" },
  ]);
  assert.equal(lista.numberOfItems, 2);
  assert.deepEqual(
    lista.itemListElement.map((i) => [i.position, i.item.name, i.item.url, i.item.jobTitle]),
    [
      [1, "Adriana Dias", "https://piracanjuba.ai/vereadores/adriana-pinheiro", "Vereadora"],
      [2, "Edimar Lopes", "https://piracanjuba.ai/vereadores/edimar-lopes", "Vereador"],
    ],
  );
  assert.deepEqual(lista.itemListElement[1].item.alternateName, ["Edimar Taboca", "Edimar Lopes Machado"]);
  assert.equal(serializarJsonLd({ a: "<b>" }), '{"a":"\\u003cb>"}');
});

test("frase-resposta do perfil segue o formato de /vereadores, com nome de urna", () => {
  const referencia = referenciaParlamentar(
    tratamentoParlamentar("aparecida-divani"),
    NOMES["aparecida-divani"],
    nomeUrnaDiferente(NOMES["aparecida-divani"], "aparecida-divani"),
  );
  assert.equal(
    fraseSubsidioParlamentar(referencia, { competencia: "2026-07", valor: 9721.92 }).replace(/\s/g, " "),
    "O subsídio mensal da vereadora Aparecida Cordeiro (Cida do Carmindo) é R$ 9.721,92 (competência 2026-07)",
  );
  assert.equal(
    referenciaParlamentar("Vereador", "Fernando Silva", nomeUrnaDiferente("Fernando Silva", "fernando-abraao")),
    "do vereador Fernando Silva",
  );
});

test("título dos 11 perfis cabe em 60 caracteres com o sufixo do layout", () => {
  // O layout aplica "%s | Piracanjuba.ai" a /vereadores/[slug] (segmento filho).
  for (const [slug, nome] of Object.entries(NOMES)) {
    const titulo = tituloPerfilParlamentar(nome, slug);
    const renderizado = titulo + SUFIXO_TITULO;
    assert.ok(renderizado.length <= 60, `${slug}: título renderizado com ${renderizado.length} caracteres`);
    assert.ok(titulo.startsWith(`${tratamentoParlamentar(slug)} `), slug);
    assert.ok(titulo.includes(identidadeParlamentar(slug)!.nomeUrna), `${slug}: sem o nome de urna`);
    assert.ok(titulo.endsWith(" em Piracanjuba"), slug);
    assert.doesNotMatch(titulo, /[\u2013\u2014|]/, slug);
  }
  // O mais longo dos 11 (2026-11-19) fica exatamente no limite.
  assert.equal(
    tituloPerfilParlamentar("Sirley de Fatima", "sirley-wehbe") + SUFIXO_TITULO,
    "Vereadora Sirley do Postinho em Piracanjuba | Piracanjuba.ai",
  );
  // Sem nome de urna conferido, usa o nome exibido e o tratamento neutro.
  assert.equal(tituloPerfilParlamentar("Pessoa Nova", "slug-novo"), "Vereador(a) Pessoa Nova em Piracanjuba");
});

test("generateMetadata do perfil usa o título curto", () => {
  const fonte = readFileSync(new URL("../src/app/vereadores/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(fonte, /title:\s*tituloPerfilParlamentar\(vereador\.nome, slug\)/);
});

test("tabela do fundo eleitoral usa o nome exibido de cada vereador, um por perfil", () => {
  // Mesmo nome da tabela vereadores (e da lista, do ItemList e do Person em /vereadores).
  const exibidos = Object.values(NOMES);
  const nomesFefc = FUNDO_ELEITORAL_2024.vereadores.map((v) => v.nome);
  for (const nome of nomesFefc) {
    assert.ok(exibidos.includes(nome), `nome fora da tabela vereadores no FEFC: ${nome}`);
  }
  assert.deepEqual([...nomesFefc].sort(), [...exibidos].sort());
  assert.equal(nomesFefc.includes("Wennder Silva"), false);
});
