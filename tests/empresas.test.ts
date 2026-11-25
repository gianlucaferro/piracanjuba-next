import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, parse } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { EMPRESAS, type Empresa } from "../src/data/empresas.ts";
import {
  SLUGS_EMPRESAS,
  caminhoCanonicoEmpresa,
  ehPaginaDeEmpresa,
  ehSlugEmpresa,
} from "../src/data/empresas-slugs.ts";
import {
  LIMITES_EMPRESA,
  colunasDestaques,
  colunasGaleria,
  colunasPassos,
  papelItemGaleria,
} from "../src/lib/empresas-layout.ts";
import { SITE_URL, imagemPrincipal, schemaEmpresa, schemaFaq } from "../src/lib/empresas-schema.ts";
import { formatarTelefoneBr, linkWhatsapp, numeroWhatsappValido } from "../src/lib/whatsapp.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

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

// Chaves que não viram texto na página: links, arquivos, estilo da marca e
// anotações internas (procedência de imagem, fonte de um fato, autorização).
// "imagem" não entra: ela guarda objetos com alt, que é lido por leitor de tela
// e indexado; só o caminho do arquivo fica de fora (ehCaminhoDeArquivo).
const CHAVES_INTERNAS = new Set([
  "url",
  "src",
  "logoSchema",
  "vinculoOrganizacao",
  "whatsapp",
  "slug",
  "fontes",
  "tipoSchema",
  "conferidoEm",
  "atendimento",
  "tema",
  "motivo",
  "origem",
  "fonte",
  "tipo",
  "desenho",
  "icone",
  "autorizacao",
]);

/** Caminho de arquivo em public (por exemplo "/empresas/x/og.jpg"), que não é texto. */
function ehCaminhoDeArquivo(valor: string): boolean {
  return /^\/\S+\.(?:png|jpe?g|webp|avif|gif|svg)$/i.test(valor);
}

function textosVisiveis(valor: unknown, chave = ""): string[] {
  if (CHAVES_INTERNAS.has(chave)) return [];
  if (typeof valor === "string") {
    return /^#[0-9a-f]{6}$/i.test(valor) || ehCaminhoDeArquivo(valor) ? [] : [valor];
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
  assert.equal(ehPaginaDeEmpresa("/evadvocacia"), true);
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
  assert.equal(caminhoCanonicoEmpresa("/EV-Advocacia"), "/evadvocacia");
  assert.equal(caminhoCanonicoEmpresa("/ClaroPiracanjuba"), "/claro");
  assert.equal(caminhoCanonicoEmpresa("/Claro"), "/claro");
  assert.equal(caminhoCanonicoEmpresa("/ÓticasDiego"), "/oticas-diego");
  assert.equal(caminhoCanonicoEmpresa("/oticas-diego"), null);
  assert.equal(caminhoCanonicoEmpresa("/Kamilla-Morranna"), "/kamillamorranna");
  assert.equal(caminhoCanonicoEmpresa("/kamillamorranna"), null);
  assert.equal(caminhoCanonicoEmpresa("/Estacionamento-Aeroporto"), "/estacionamentoaeroporto");
  assert.equal(caminhoCanonicoEmpresa("/estacionamentoaeroporto"), null);
  assert.equal(caminhoCanonicoEmpresa("/evadvocacia"), null);
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
    for (const imagem of [empresa.logo.src, empresa.foto?.src, empresa.seo.imagem.src, empresa.seo.logoSchema].filter(Boolean)) {
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

test("a conferência de texto lê o alt da mídia do topo e da imagem de compartilhamento", () => {
  for (const empresa of empresas) {
    const textos = textosVisiveis(empresa);
    const midia = empresa.midiaTopo;
    if (midia && midia.tipo !== "ilustracao") {
      assert.ok(textos.includes(midia.imagem.alt), `${empresa.slug}: alt do topo fora da conferência`);
    }
    assert.ok(textos.includes(empresa.seo.imagem.alt), `${empresa.slug}: alt da imagem de compartilhamento fora da conferência`);
    assert.equal(textos.includes(empresa.seo.imagem.src), false, `${empresa.slug}: caminho de arquivo tratado como texto`);
  }
  // Controle: um alt proibido dentro de midiaTopo.imagem é apanhado.
  const sintetica = {
    midiaTopo: { tipo: "recorte", imagem: { src: "/x.webp", alt: "Frasco 100% original \u2014 R$ 49" } },
  };
  assert.deepEqual(textosVisiveis(sintetica), ["Frasco 100% original \u2014 R$ 49"]);
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

test("horário e mapa, quando a empresa informa, vêm limpos e com link seguro do Google Maps", () => {
  for (const empresa of empresas) {
    const { horario, mapaUrl } = empresa.endereco;
    if (horario !== undefined) {
      assert.ok(horario.trim().length > 0, `${empresa.slug}: horário vazio`);
      assert.doesNotMatch(horario, /[–—]/, `${empresa.slug}: horário com travessão`);
    }
    if (mapaUrl !== undefined) {
      const url = new URL(mapaUrl);
      assert.equal(url.protocol, "https:", `${empresa.slug}: mapa sem https`);
      assert.match(url.hostname, /(^|\.)google\.com$|^maps\.app\.goo\.gl$|^goo\.gl$/, `${empresa.slug}: mapa fora do Google Maps`);
    }
  }
});

type ImagemDeclarada = { src: string; largura: number; altura: number };

/** Toda imagem com src, largura e altura declaradas em qualquer ponto da ficha. */
function imagensDeclaradas(valor: unknown): ImagemDeclarada[] {
  if (Array.isArray(valor)) return valor.flatMap(imagensDeclaradas);
  if (!valor || typeof valor !== "object") return [];
  const objeto = valor as Record<string, unknown>;
  const propria =
    typeof objeto.src === "string" && typeof objeto.largura === "number" && typeof objeto.altura === "number"
      ? [objeto as ImagemDeclarada]
      : [];
  return [...propria, ...Object.values(objeto).flatMap(imagensDeclaradas)];
}

/** Lê largura e altura do cabeçalho de PNG, WebP, JPEG ou SVG, sem dependência. */
function dimensoes(caminho: string): { largura: number; altura: number } {
  const dados = readFileSync(caminho);
  if (caminho.endsWith(".svg")) {
    const texto = dados.toString("utf8");
    const largura = Number(/<svg[^>]*\swidth="(\d+)"/.exec(texto)?.[1]);
    const altura = Number(/<svg[^>]*\sheight="(\d+)"/.exec(texto)?.[1]);
    return { largura, altura };
  }
  if (dados.readUInt32BE(0) === 0x89504e47) {
    return { largura: dados.readUInt32BE(16), altura: dados.readUInt32BE(20) };
  }
  if (dados.toString("ascii", 0, 4) === "RIFF" && dados.toString("ascii", 8, 12) === "WEBP") {
    const bloco = dados.toString("ascii", 12, 16);
    if (bloco === "VP8X") {
      return { largura: dados.readUIntLE(24, 3) + 1, altura: dados.readUIntLE(27, 3) + 1 };
    }
    if (bloco === "VP8L") {
      const bits = dados.readUInt32LE(21);
      return { largura: (bits & 0x3fff) + 1, altura: ((bits >> 14) & 0x3fff) + 1 };
    }
    return { largura: dados.readUInt16LE(26) & 0x3fff, altura: dados.readUInt16LE(28) & 0x3fff };
  }
  if (dados[0] === 0xff && dados[1] === 0xd8) {
    let posicao = 2;
    while (posicao < dados.length) {
      const marcador = dados[posicao + 1];
      const tamanho = dados.readUInt16BE(posicao + 2);
      if (marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador)) {
        return { altura: dados.readUInt16BE(posicao + 5), largura: dados.readUInt16BE(posicao + 7) };
      }
      posicao += 2 + tamanho;
    }
  }
  throw new Error(`formato de imagem não reconhecido: ${caminho}`);
}

test("toda imagem da ficha existe em public com as dimensões declaradas", () => {
  for (const empresa of empresas) {
    const imagens = imagensDeclaradas(empresa);
    assert.ok(imagens.length > 0, `${empresa.slug}: nenhuma imagem declarada`);
    for (const imagem of imagens) {
      const caminho = join(RAIZ, "public", imagem.src);
      assert.ok(existsSync(caminho), `${empresa.slug}: falta ${imagem.src}`);
      assert.deepEqual(
        dimensoes(caminho),
        { largura: imagem.largura, altura: imagem.altura },
        `${empresa.slug}: dimensões de ${imagem.src}`,
      );
    }
  }
});

test("topo, vitrine e compartilhamento só com imagem real: sem IA, com procedência e sem pessoa reconhecível sem autorização", () => {
  for (const empresa of empresas) {
    const midia = empresa.midiaTopo;
    if (midia && midia.tipo !== "ilustracao") {
      assert.notEqual(midia.imagem.geradaPorIA, true, `${empresa.slug}: topo com imagem gerada por IA`);
      assert.ok(midia.imagem.origem?.trim(), `${empresa.slug}: topo sem procedência`);
    }
    // A imagem de compartilhamento (WhatsApp, Instagram, Facebook) declara a
    // procedência e diz explicitamente que não foi gerada por IA.
    const og = empresa.seo.imagem;
    assert.equal(og.geradaPorIA, false, `${empresa.slug}: ${og.src} sem declarar que não é gerada por IA`);
    assert.ok(og.origem?.trim(), `${empresa.slug}: ${og.src} sem procedência`);
    assert.ok(og.alt.trim(), `${empresa.slug}: ${og.src} sem alt`);
    assert.deepEqual({ largura: og.largura, altura: og.altura }, { largura: 1200, altura: 630 }, `${empresa.slug}: ${og.src} fora de 1200x630`);
    for (const item of empresa.galeria?.itens ?? []) {
      assert.notEqual(item.geradaPorIA, true, `${empresa.slug}: ${item.src} gerada por IA`);
      assert.ok(item.origem?.trim(), `${empresa.slug}: ${item.src} sem procedência`);
      assert.ok(item.alt.trim().length > 0 && item.legenda.trim().length > 0, `${empresa.slug}: ${item.src} sem alt ou legenda`);
      if (item.pessoaIdentificavel) {
        assert.ok(item.autorizacao?.trim(), `${empresa.slug}: ${item.src} mostra pessoa sem autorização registrada`);
      }
    }
  }
});

function dentroDoLimite(total: number, limite: { min: number; max: number }): boolean {
  return total >= limite.min && total <= limite.max;
}

test("destaques, passos e vitrine respeitam os limites e o trecho em destaque está dentro do título", () => {
  for (const empresa of empresas) {
    if (empresa.destaques) {
      assert.ok(
        dentroDoLimite(empresa.destaques.length, LIMITES_EMPRESA.destaques),
        `${empresa.slug}: ${empresa.destaques.length} destaques`,
      );
    }
    assert.ok(dentroDoLimite(empresa.passos.length, LIMITES_EMPRESA.passos), `${empresa.slug}: ${empresa.passos.length} passos`);
    if (empresa.galeria) {
      assert.ok(
        dentroDoLimite(empresa.galeria.itens.length, LIMITES_EMPRESA.galeria),
        `${empresa.slug}: vitrine com ${empresa.galeria.itens.length} itens`,
      );
    }
    if (empresa.tituloDestaque) {
      assert.ok(empresa.titulo?.includes(empresa.tituloDestaque), `${empresa.slug}: tituloDestaque fora do título`);
    }
  }
});

test("o modelo distribui qualquer quantidade aceita de itens sem colunas vazias", () => {
  // Vitrine: com 3 itens, um destaque e duas laterais; com qualquer outra
  // quantidade, todos em grade (legenda embaixo, sem item com papel de lateral).
  for (let total: number = LIMITES_EMPRESA.galeria.min; total <= LIMITES_EMPRESA.galeria.max; total++) {
    const papeis = Array.from({ length: total }, (_, indice) => papelItemGaleria(indice, total));
    if (total === 3) {
      assert.deepEqual(papeis, ["destaque", "lateral", "lateral"]);
      assert.match(colunasGaleria(total), /md:grid-cols-12/);
    } else {
      assert.ok(papeis.every((papel) => papel === "grade"), `vitrine de ${total}: ${papeis.join(", ")}`);
      const colunas = [...colunasGaleria(total).matchAll(/grid-cols-(\d+)/g)].map((m) => Number(m[1]));
      assert.ok(colunas.length > 0, `vitrine de ${total} sem colunas`);
      // Com até 4 itens, nenhuma linha tem colunas sobrando à direita na maior tela.
      if (total <= 4) assert.ok(colunas[colunas.length - 1] <= Math.max(total, 2), `vitrine de ${total}: ${colunasGaleria(total)}`);
    }
  }
  // Destaques e passos: uma coluna por item no computador, todos na mesma linha.
  for (let total: number = LIMITES_EMPRESA.destaques.min; total <= LIMITES_EMPRESA.destaques.max; total++) {
    assert.equal(colunasDestaques(total), `md:grid-cols-${total}`);
  }
  for (let total: number = LIMITES_EMPRESA.passos.min; total <= LIMITES_EMPRESA.passos.max; total++) {
    assert.equal(colunasPassos(total), `md:grid-cols-${total}`);
  }
});

test("dados estruturados: imagem sem recorte de produto e vínculo só onde a página o declara", () => {
  for (const empresa of empresas) {
    const schema = schemaEmpresa(empresa) as Record<string, unknown>;
    const recortes = [
      ...(empresa.galeria?.itens ?? []).filter((item) => item.tipo === "recorte").map((item) => item.src),
      ...(empresa.midiaTopo?.tipo === "recorte" ? [empresa.midiaTopo.imagem.src] : []),
    ];
    assert.equal(recortes.includes(imagemPrincipal(empresa)), false, `${empresa.slug}: recorte como imagem principal`);
    assert.equal(schema.image, `${SITE_URL}${imagemPrincipal(empresa)}`);
    if (empresa.vinculoOrganizacao) {
      assert.ok(empresa.vinculo?.trim(), `${empresa.slug}: vínculo nos dados sem o texto visível`);
      assert.deepEqual(schema.parentOrganization, { "@id": empresa.vinculoOrganizacao });
    } else {
      assert.equal("parentOrganization" in schema, false, `${empresa.slug}: parentOrganization sem vínculo declarado`);
    }
    // Pessoas não entram nos dados estruturados das empresas.
    assert.doesNotMatch(JSON.stringify(schema), /"Person"|founder|employee/, `${empresa.slug}: pessoa nos dados estruturados`);
  }
  // A Apareça aponta para a Ferro Labs (entidade #publisher do layout); a
  // Vitorino não declara vínculo com o portal.
  assert.deepEqual((schemaEmpresa(EMPRESAS.apareca) as Record<string, unknown>).parentOrganization, {
    "@id": `${SITE_URL}/#publisher`,
  });
  assert.equal(EMPRESAS.vitorinoperfumes.vinculo, undefined);
  assert.equal(EMPRESAS.vitorinoperfumes.vinculoOrganizacao, undefined);
  // Sem foto na vitrine, a imagem é a de compartilhamento.
  assert.equal(imagemPrincipal(EMPRESAS.vitorinoperfumes), EMPRESAS.vitorinoperfumes.seo.imagem.src);
});

test("FAQ tem de 3 a 8 perguntas, sem repetir, e passa pelas mesmas regras de texto", () => {
  for (const empresa of empresas) {
    if (!empresa.faq) continue;
    assert.ok(dentroDoLimite(empresa.faq.length, LIMITES_EMPRESA.faq), `${empresa.slug}: ${empresa.faq.length} perguntas`);
    const perguntas = empresa.faq.map((item) => item.pergunta);
    assert.equal(new Set(perguntas).size, perguntas.length, `${empresa.slug}: pergunta repetida`);
    for (const item of empresa.faq) {
      assert.match(item.pergunta, /\?$/, `${empresa.slug}: "${item.pergunta}" sem ponto de interrogação`);
      assert.ok(item.resposta.trim().length > 0, `${empresa.slug}: resposta vazia`);
      assert.ok(textosVisiveis(empresa).includes(item.resposta), `${empresa.slug}: resposta fora da conferência de texto`);
    }
  }
});

test("o FAQPage dos dados estruturados repete exatamente o FAQ visível", () => {
  for (const empresa of empresas) {
    const schema = schemaFaq(empresa);
    if (!empresa.faq?.length) {
      assert.equal(schema, null, `${empresa.slug}: FAQPage sem FAQ visível`);
      continue;
    }
    assert.ok(schema, `${empresa.slug}: FAQ visível sem FAQPage`);
    assert.equal(schema["@type"], "FAQPage");
    assert.deepEqual(
      schema.mainEntity.map((item) => ({ pergunta: item.name, resposta: item.acceptedAnswer.text })),
      empresa.faq,
      `${empresa.slug}: FAQPage diferente do FAQ visível`,
    );
  }
});
