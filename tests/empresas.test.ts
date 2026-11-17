import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join, parse } from "node:path";
import test from "node:test";
import { EMPRESAS, type Empresa } from "../src/data/empresas.ts";
import {
  SLUGS_EMPRESAS,
  caminhoCanonicoEmpresa,
  ehPaginaDeEmpresa,
  ehSlugEmpresa,
} from "../src/data/empresas-slugs.ts";
import { formatarTelefoneBr, linkWhatsapp, numeroWhatsappValido } from "../src/lib/whatsapp.ts";

const RAIZ = new URL("..", import.meta.url).pathname;

// Nomes que o Next ou a hospedagem já usam na raiz, mesmo sem pasta em src/app.
const RESERVADOS = [
  "_next",
  "api",
  "auth",
  "admin",
  "sitemap",
  "robots",
  "manifest",
  "icon",
  "apple-icon",
  "opengraph-image",
  "twitter-image",
  "favicon",
  "not-found",
  "404",
  "500",
];

function textosVisiveis(valor: unknown, chave = ""): string[] {
  if (typeof valor === "string") {
    return ["url", "src", "imagem", "logoSchema", "whatsapp", "slug", "fontes", "tipoSchema", "conferidoEm", "atendimento"].includes(chave) ||
      /^#[0-9a-f]{6}$/i.test(valor)
      ? []
      : [valor];
  }
  if (Array.isArray(valor)) return valor.flatMap((item) => textosVisiveis(item, chave));
  if (valor && typeof valor === "object") {
    return Object.entries(valor).flatMap(([k, v]) => textosVisiveis(v, k));
  }
  return [];
}

const empresas = Object.values(EMPRESAS) as Empresa[];

test("cada slug da lista tem ficha e cada ficha usa o próprio slug", () => {
  assert.deepEqual(Object.keys(EMPRESAS).sort(), [...SLUGS_EMPRESAS].sort());
  for (const slug of SLUGS_EMPRESAS) assert.equal(EMPRESAS[slug].slug, slug);
});

// Primeiro segmento de cada rota: grupos "(nome)" não entram na URL, então
// a busca desce neles; pastas "[param]" e "_privadas" não são nomes fixos.
function segmentosDaRaiz(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true })
    .filter((item) => item.isDirectory() && !item.name.startsWith("[") && !item.name.startsWith("_"))
    .flatMap((item) =>
      /^\(.*\)$/.test(item.name) ? segmentosDaRaiz(join(pasta, item.name)) : [item.name],
    );
}

test("slugs são minúsculos, sem acento e não colidem com seções nem arquivos públicos", () => {
  const app = segmentosDaRaiz(join(RAIZ, "src/app"));
  const publicos = readdirSync(join(RAIZ, "public")).flatMap((nome) => [nome, parse(nome).name]);
  const ocupados = new Set([...app, ...publicos, ...RESERVADOS].map((nome) => nome.toLowerCase()));

  assert.ok(app.includes("sobre") && app.includes("anuncie"), "a leitura de src/app precisa achar as seções");
  for (const slug of SLUGS_EMPRESAS) {
    assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(ocupados.has(slug), false, `o slug "${slug}" colide com uma rota ou arquivo existente`);
  }
});

test("identifica a página de empresa só no primeiro nível do caminho", () => {
  assert.equal(ehPaginaDeEmpresa("/apareca"), true);
  assert.equal(ehPaginaDeEmpresa("/vitorinoperfumes/"), true);
  assert.equal(ehPaginaDeEmpresa("/apareca?utm_source=teste"), true);
  assert.equal(ehPaginaDeEmpresa("/apareca/outra"), false);
  assert.equal(ehPaginaDeEmpresa("/"), false);
  assert.equal(ehPaginaDeEmpresa("/sobre"), false);
  assert.equal(ehPaginaDeEmpresa(null), false);
  assert.equal(ehSlugEmpresa("Apareca"), false);
});

test("endereço digitado com maiúscula, acento ou hífen redireciona para a página da empresa", () => {
  assert.equal(caminhoCanonicoEmpresa("/VitorinoPerfumes"), "/vitorinoperfumes");
  assert.equal(caminhoCanonicoEmpresa("/vitorino-perfumes"), "/vitorinoperfumes");
  assert.equal(caminhoCanonicoEmpresa("/APARECA/"), "/apareca");
  assert.equal(caminhoCanonicoEmpresa("/apare%C3%A7a"), "/apareca");
  assert.equal(caminhoCanonicoEmpresa("/Apareça"), "/apareca");
  // Já certo, outra seção, dois níveis ou codificação inválida: sem redirecionar.
  assert.equal(caminhoCanonicoEmpresa("/apareca"), null);
  assert.equal(caminhoCanonicoEmpresa("/Sobre"), null);
  assert.equal(caminhoCanonicoEmpresa("/apareca/precos"), null);
  assert.equal(caminhoCanonicoEmpresa("/%E0%A4%A"), null);
  assert.equal(caminhoCanonicoEmpresa("/"), null);
});

test("monta o link do WhatsApp com a mensagem codificada e formata o telefone", () => {
  assert.equal(
    linkWhatsapp("5564992472510", "Olá! Vi no Piracanjuba.ai & quero saber"),
    "https://wa.me/5564992472510?text=Ol%C3%A1!%20Vi%20no%20Piracanjuba.ai%20%26%20quero%20saber",
  );
  assert.equal(linkWhatsapp("5564992638815"), "https://wa.me/5564992638815");
  assert.throws(() => linkWhatsapp("64992472510"), /inválido/);
  assert.equal(formatarTelefoneBr("5564992472510"), "(64) 99247-2510");
  assert.equal(formatarTelefoneBr("556433211234"), "(64) 3321-1234");
});

test("fichas têm WhatsApp válido, imagens existentes e SEO no tamanho certo", () => {
  for (const empresa of empresas) {
    assert.ok(numeroWhatsappValido(empresa.contato.whatsapp), `${empresa.slug}: WhatsApp inválido`);
    for (const imagem of [empresa.logo.src, empresa.foto?.src, empresa.seo.imagem, empresa.seo.logoSchema].filter(Boolean)) {
      assert.ok(existsSync(join(RAIZ, "public", imagem as string)), `${empresa.slug}: falta ${imagem}`);
    }
    assert.ok(empresa.seo.titulo.length <= 60, `${empresa.slug}: título com ${empresa.seo.titulo.length} caracteres`);
    assert.ok(
      empresa.seo.descricao.length >= 70 && empresa.seo.descricao.length <= 160,
      `${empresa.slug}: descrição com ${empresa.seo.descricao.length} caracteres`,
    );
    assert.match(empresa.conferidoEm, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("textos sem travessão, sem preço e sem promessas proibidas", () => {
  const proibidos = [
    /—|–/,
    /R\$\s?\d/,
    /100\s?% origina/i,
    /autenticidade garantida/i,
    /economi[az] de até/i,
    /\bgarantimos\b/i,
    /advogad/i,
  ];
  for (const empresa of empresas) {
    for (const texto of textosVisiveis(empresa)) {
      for (const padrao of proibidos) {
        assert.doesNotMatch(texto, padrao, `${empresa.slug}: "${texto}"`);
      }
    }
  }
});

test("a marca aparece como Apareça Ai no texto visível; o domínio fica só no link do site", () => {
  const apareca = EMPRESAS.apareca;
  const { site, ...contatoSemSite } = apareca.contato;
  assert.equal(apareca.nome, "Apareça Ai");
  assert.equal(site?.url, "https://apareca.ai");
  for (const texto of textosVisiveis({ ...apareca, contato: contatoSemSite })) {
    assert.doesNotMatch(texto, /aparec[aç]a\.ai/i, texto);
  }
});
