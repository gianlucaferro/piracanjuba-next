import assert from "node:assert/strict";
import test from "node:test";
import {
  COLUNAS_ANUNCIO_PUBLICO,
  anuncioPublico,
  dataLocal,
  fraseRespostaAnuncios,
  listaAnunciosJsonLd,
  precoDaOferta,
  produtoJsonLd,
  resumirAnuncios,
  serializarJsonLd,
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
