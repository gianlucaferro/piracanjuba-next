import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SUFIXO_TITULO } from "../src/lib/abas-orgaos.ts";
import {
  COLUNAS_ANUNCIO_PUBLICO,
  anuncioPublico,
  cortarPorPalavra,
  dataLocal,
  descricaoAnuncio,
  fraseRespostaAnuncios,
  listaAnunciosJsonLd,
  precoDaOferta,
  produtoJsonLd,
  resumirAnuncios,
  serializarJsonLd,
  tituloAnuncio,
  type AnuncioPublico,
} from "../src/components/classificados/anuncio-publico.ts";
import { buscarAnuncios, CHAVE_LISTA_ANUNCIOS } from "../src/components/classificados/buscar-anuncios.ts";

const agora = new Date("2026-11-19T15:00:00Z");
const espacos = (s: string) => s.replace(/\s/g, " ");

const anuncio = (parcial: Partial<AnuncioPublico>): AnuncioPublico => ({
  id: "aba8734c-52ea-4b6b-b62d-9dc0e088a291",
  nome: "Anunciante",
  whatsapp: "64999999999",
  categoria: "veiculos",
  titulo: "Ford Ka 2019",
  descricao: "Carro revisado.",
  preco: 45000,
  preco_tipo: "negociavel",
  fotos: ["https://oinweocqcptwxqsztlcl.supabase.co/storage/v1/object/public/classificados/a.webp"],
  status: "ativo",
  denuncias: 0,
  visualizacoes: 10,
  whatsapp_clicks: 0,
  expira_em: null,
  created_at: "2026-04-15T01:00:00Z",
  updated_at: "2026-04-15T01:20:29Z",
  bairro: "Centro",
  foto_perfil: null,
  ...parcial,
});

test("colunas públicas não levam o código de gestão nem o user_id ao HTML", () => {
  const colunas = COLUNAS_ANUNCIO_PUBLICO.split(",").map((c) => c.trim());
  for (const proibida of ["codigo_gestao", "notificado_expiracao", "user_id", "*"]) {
    assert.equal(colunas.includes(proibida), false, proibida);
  }
  // Toda chave do tipo AnuncioPublico é lida, e só elas.
  assert.deepEqual([...colunas].sort(), Object.keys(anuncio({})).sort());
});

test("lista do servidor e do cliente usam a mesma consulta e a mesma query key", async () => {
  assert.deepEqual([...CHAVE_LISTA_ANUNCIOS], ["classificados"]);
  const chamadas: unknown[][] = [];
  const consulta = {
    select: (...a: unknown[]) => (chamadas.push(["select", ...a]), consulta),
    in: (...a: unknown[]) => (chamadas.push(["in", ...a]), consulta),
    order: (...a: unknown[]) => {
      chamadas.push(["order", ...a]);
      return Promise.resolve({ data: [anuncio({})], error: null });
    },
  };
  const cliente = { from: (t: string) => (chamadas.push(["from", t]), consulta) };
  const dados = await buscarAnuncios<AnuncioPublico>(cliente as never);
  assert.equal(dados.length, 1);
  assert.deepEqual(chamadas, [
    ["from", "classificados"],
    ["select", COLUNAS_ANUNCIO_PUBLICO],
    ["in", "status", ["ativo", "vendido"]],
    ["order", "created_at", { ascending: false }],
  ]);
  const comErro = {
    from: () => ({
      select: () => ({ in: () => ({ order: () => Promise.resolve({ data: null, error: new Error("falhou") }) }) }),
    }),
  };
  await assert.rejects(() => buscarAnuncios(comErro as never), /falhou/);
});

test("anúncio removido, em análise, expirado ou vencido não é público", () => {
  assert.equal(anuncioPublico(anuncio({}), agora), true);
  assert.equal(anuncioPublico(anuncio({ status: "vendido" }), agora), true);
  for (const status of ["removido", "denunciado", "expirado", "qualquer"]) {
    assert.equal(anuncioPublico(anuncio({ status }), agora), false, status);
  }
  assert.equal(anuncioPublico(anuncio({ expira_em: "2026-11-19T14:59:59Z" }), agora), false);
  assert.equal(anuncioPublico(anuncio({ expira_em: "2026-12-01T00:00:00Z" }), agora), true);
});

test("preço da oferta só existe quando o anúncio informa", () => {
  assert.equal(precoDaOferta(anuncio({})), 45000);
  assert.equal(precoDaOferta(anuncio({ preco: "32000" as unknown as number })), 32000);
  assert.equal(precoDaOferta(anuncio({ preco_tipo: "gratuito", preco: null })), 0);
  assert.equal(precoDaOferta(anuncio({ preco: null })), null);
  assert.equal(precoDaOferta(anuncio({ preco: 0, preco_tipo: "fixo" })), null);
});

test("Product traz nome, descrição, imagem e oferta em BRL, sem nota inventada", () => {
  const p = produtoJsonLd(anuncio({}));
  assert.equal(p["@type"], "Product");
  assert.equal(p.name, "Ford Ka 2019");
  assert.equal(p.url, "https://piracanjuba.ai/compra-e-venda/aba8734c-52ea-4b6b-b62d-9dc0e088a291");
  assert.equal(p.description, "Carro revisado.");
  assert.equal(p.category, "Veículos");
  assert.deepEqual(p.image, [anuncio({}).fotos![0]]);
  assert.deepEqual(p.offers, {
    "@type": "Offer",
    url: p.url,
    price: 45000,
    priceCurrency: "BRL",
    availability: "https://schema.org/InStock",
  });
  for (const inventado of ["aggregateRating", "review", "brand", "itemCondition", "sku"]) {
    assert.equal(inventado in p, false, inventado);
  }
  assert.equal(produtoJsonLd(anuncio({ status: "vendido" })).offers?.availability, "https://schema.org/SoldOut");
  const semDado = produtoJsonLd(anuncio({ preco: null, descricao: "  ", fotos: ["http://inseguro/x.jpg"] }));
  assert.equal("offers" in semDado, false);
  assert.equal("description" in semDado, false);
  assert.equal("image" in semDado, false);
});

test("ItemList segue a ordem do lote exibido", () => {
  const lista = listaAnunciosJsonLd([
    { id: "a", titulo: "Casa" },
    { id: "b", titulo: "Moto" },
  ]);
  assert.equal(lista.numberOfItems, 2);
  assert.deepEqual(
    lista.itemListElement.map((i) => [i.position, i.url, i.name]),
    [
      [1, "https://piracanjuba.ai/compra-e-venda/a", "Casa"],
      [2, "https://piracanjuba.ai/compra-e-venda/b", "Moto"],
    ],
  );
});

test("frase-resposta da lista tem número, categorias, faixa de preço, data e fonte", () => {
  // Composição de produção em 2026-11-19: 3 veículos e 2 imóveis.
  const lista = [
    anuncio({ categoria: "veiculos", preco: 45000 }),
    anuncio({ categoria: "imoveis", preco: 550000 }),
    anuncio({ categoria: "veiculos", preco: 32000, preco_tipo: "fixo" }),
    anuncio({ categoria: "imoveis", preco: 620000 }),
    anuncio({ categoria: "veiculos", preco: 105000, preco_tipo: "fixo" }),
    anuncio({ categoria: "agro", status: "removido" }),
  ];
  const resumo = resumirAnuncios(lista, agora);
  assert.deepEqual(resumo, {
    ativos: 5,
    vendidos: 0,
    categorias: [
      { categoria: "veiculos", total: 3 },
      { categoria: "imoveis", total: 2 },
    ],
    precoMin: 32000,
    precoMax: 620000,
  });
  assert.equal(
    espacos(fraseRespostaAnuncios(resumo, dataLocal(agora))),
    "O Compra e Venda PBA tem 5 anúncios ativos em Piracanjuba: 3 de veículos e 2 de imóveis, com preços de R$ 32.000,00 a R$ 620.000,00 (dados de 2026-11-19, segundo os anúncios publicados pelos próprios moradores no Piracanjuba.ai). Anunciar é grátis, e o contato é direto com o anunciante pelo WhatsApp.",
  );
});

test("frase-resposta sem anúncio, com um só e com vendidos", () => {
  const vazio = resumirAnuncios([], agora);
  assert.match(fraseRespostaAnuncios(vazio, "2026-11-19"), /^O Compra e Venda PBA não tem anúncios ativos no momento \(dados de 2026-11-19,/);
  const um = resumirAnuncios(
    [anuncio({ categoria: "outros", preco: null }), anuncio({ status: "vendido" }), anuncio({ status: "vendido" })],
    agora,
  );
  const frase = espacos(fraseRespostaAnuncios(um, "2026-11-19"));
  assert.match(frase, /tem 1 anúncio ativo em Piracanjuba: 1 de outras categorias \(dados de 2026-11-19,/);
  assert.match(frase, / Outros 2 já foram marcados como vendidos\. /);
  assert.equal(frase.includes("R$"), false);
});

test("data do dado sai no fuso de Piracanjuba e o JSON-LD não fecha a tag script", () => {
  assert.equal(dataLocal(new Date("2026-11-20T02:30:00Z")), "2026-11-19");
  assert.equal(dataLocal(new Date("2026-11-20T03:30:00Z")), "2026-11-20");
  const s = serializarJsonLd({ name: "</script><script>alert(1)</script>" });
  assert.equal(s.includes("<"), false);
  assert.deepEqual(JSON.parse(s), { name: "</script><script>alert(1)</script>" });
});

// Inspirado nos 5 anúncios ativos em produção em 2026-11-19 (3 sem descrição e 1 com 95
// caracteres); títulos reais, descrições simplificadas. Antes, o título renderizado ia de 74 a 148 caracteres e o fallback da
// description tinha 44.
const PRODUCAO: Partial<AnuncioPublico>[] = [
  { titulo: "Ford ka 2019", categoria: "veiculos", preco: 45000, preco_tipo: "negociavel", bairro: "Setor Magalhães" },
  {
    titulo: "Casa 3 quartos sendo uma suíte, todos com ar condicionado, com armários e mini poço.5",
    categoria: "imoveis",
    preco: 550000,
    preco_tipo: "negociavel",
    bairro: "Parque machado. Avenida das palmeiras.",
    descricao: null,
  },
  { titulo: "Palio Acttractive 12/13", categoria: "veiculos", preco: 32000, preco_tipo: "fixo", bairro: "Piracanjuba", descricao: null },
  {
    titulo: "Casa 3 quartos toda no porcelanato e na laje, garagem ampla, mini poço...",
    categoria: "imoveis",
    preco: 620000,
    preco_tipo: "negociavel",
    bairro: "Jardim goiás 1ª etapa",
    descricao: null,
  },
  {
    titulo: "Tracker premier",
    categoria: "veiculos",
    preco: 105000,
    preco_tipo: "fixo",
    bairro: "Norte",
    descricao: "Carro novo, revisado na concessionária, completo, único dono, IPVA pago e manual em dia aqui.",
  },
];

test("título do detalhe cabe em 60 caracteres com o sufixo do layout, sem repetir título", () => {
  const titulos = PRODUCAO.map((p) => tituloAnuncio(anuncio(p).titulo));
  for (const titulo of titulos) {
    const renderizado = titulo + SUFIXO_TITULO;
    assert.ok(renderizado.length <= 60, `${renderizado} (${renderizado.length})`);
    assert.doesNotMatch(titulo, /[\u2013\u2014|]/);
  }
  assert.deepEqual(titulos, [
    "Ford ka 2019 em Piracanjuba",
    "Casa 3 quartos sendo uma suíte",
    "Palio Acttractive 12/13 em Piracanjuba",
    "Casa 3 quartos toda no porcelanato",
    "Tracker premier em Piracanjuba",
  ]);
  // Título que já cita a cidade não ganha "em Piracanjuba" de novo.
  assert.equal(tituloAnuncio("Lote em Piracanjuba"), "Lote em Piracanjuba");
});

test("corte por palavra não parte palavra nem termina em pontuação ou ligação", () => {
  assert.equal(cortarPorPalavra("Casa 3 quartos toda no porcelanato e na laje", 39), "Casa 3 quartos toda no porcelanato");
  assert.equal(cortarPorPalavra("  Moto   revisada, ", 40), "Moto revisada");
  assert.equal(cortarPorPalavra("Palavragigante", 5), "Palav");
});

test("description do detalhe fica entre 120 e 160 caracteres, só com dados do anúncio", () => {
  const descricoes = PRODUCAO.map((p) => espacos(descricaoAnuncio(anuncio(p))));
  for (const d of descricoes) {
    assert.ok(d.length >= 120 && d.length <= 160, `${d} (${d.length})`);
    assert.doesNotMatch(d, /[\u2013\u2014]/);
  }
  assert.equal(
    descricoes[2],
    "Palio Acttractive 12/13 em Piracanjuba, por R$ 32.000,00. Anúncio na categoria Veículos do Compra e Venda PBA, com contato direto pelo WhatsApp.",
  );
  // Descrição curta do anunciante (95 caracteres) dá lugar à frase montada, com o bairro.
  assert.equal(
    descricoes[4],
    "Tracker premier em Piracanjuba (Norte), por R$ 105.000,00. Anúncio na categoria Veículos do Compra e Venda PBA, com contato direto pelo WhatsApp.",
  );
  // Descrição longa do anunciante é usada, cortada por palavra.
  const longa = "Carro conservado, revisado, pneus novos, documentação em dia, IPVA pago, único dono, aceito troca por moto de menor valor e financiamento pelo banco, chame no WhatsApp.";
  const propria = descricaoAnuncio(anuncio({ descricao: longa }));
  assert.ok(propria.length >= 120 && propria.length <= 160, String(propria.length));
  assert.ok(longa.startsWith(propria));
  // Sem preço informado e gratuito: nada de valor inventado.
  const consultar = espacos(descricaoAnuncio(anuncio({ preco: null, descricao: null, titulo: "Sofá", categoria: "outros" })));
  assert.match(consultar, /^Sofá em Piracanjuba \(Centro\), preço a consultar\. /);
  assert.equal(consultar.includes("R$"), false);
  const gratis = descricaoAnuncio(anuncio({ preco: null, preco_tipo: "gratuito", descricao: null, titulo: "TV", bairro: null }));
  assert.ok(gratis.length >= 120 && gratis.length <= 160, String(gratis.length));
  assert.match(gratis, /^TV em Piracanjuba, grátis\. /);
});

function fonte(arquivo: string): string {
  return readFileSync(new URL(arquivo, import.meta.url), "utf8");
}

test("/compra-e-venda: título até 60 caracteres e description de 120 a 160, sem travessão", () => {
  const m = fonte("../src/app/compra-e-venda/page.tsx").match(
    /export const metadata = pageMetadata\(\{\s*title:\s*"([^"]+)",\s*description:\s*"([^"]+)"/,
  );
  assert.ok(m, "não achei title e description em pageMetadata");
  const [, title, description] = m;
  const renderizado = title + SUFIXO_TITULO;
  assert.ok(renderizado.length <= 60, `título renderizado com ${renderizado.length} caracteres`);
  assert.ok(description.length >= 120 && description.length <= 160, `description com ${description.length}`);
  assert.doesNotMatch(title + description, /[\u2013\u2014|]/);
});

test("detalhe do anúncio monta title e description pelas funções testadas", () => {
  const detalhe = fonte("../src/app/compra-e-venda/[id]/page.tsx");
  assert.match(detalhe, /title:\s*tituloAnuncio\(anuncio\.titulo\)/);
  assert.match(detalhe, /description:\s*descricaoAnuncio\(anuncio\)/);
});
