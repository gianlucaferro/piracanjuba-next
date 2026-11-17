import assert from "node:assert/strict";
import test from "node:test";
import {
  codigoValido,
  linkCartaoDoPedido,
  linkComprovante,
  pixDoPedido,
  sugerirEndereco,
} from "../src/lib/pedidoPaginaEmpresa.ts";
import { crc16 } from "../src/lib/pix.ts";

test("PIX do pedido usa a chave CNPJ da Ferro Labs, R$ 600 e o código como txid", () => {
  const codigo = pixDoPedido("PBA7K3Q9X");
  assert.match(codigo, /0114660345380001255204000053039865406600\.005802BR/);
  assert.match(codigo, /5921FERRO LABS TECNOLOGIA6011PIRACANJUBA/);
  assert.match(codigo, /62130509PBA7K3Q9X6304[0-9A-F]{4}$/);
  assert.equal(codigo.slice(-4), crc16(codigo.slice(0, -4)));
});

test("link de cartão leva só o código do pedido", () => {
  const link = "https://buy.stripe.com/test_abc123";
  assert.equal(linkCartaoDoPedido("PBA7K3Q9X", link), "https://buy.stripe.com/test_abc123?client_reference_id=PBA7K3Q9X");
  assert.equal(linkCartaoDoPedido("PBA7K3Q9X", ""), null);
  assert.equal(linkCartaoDoPedido("maria@exemplo.com", link), null);
});

test("código do pedido segue o formato da função", () => {
  assert.equal(codigoValido("PBA23456Z"), true);
  assert.equal(codigoValido("PBA2345OZ"), false);
  assert.equal(codigoValido("pba23456z"), false);
  assert.equal(codigoValido(undefined), false);
});

test("mensagem do comprovante cita o código e mais nada da pessoa", () => {
  const url = new URL(linkComprovante("PBA23456Z"));
  assert.equal(url.origin + url.pathname, "https://wa.me/5564992375458");
  assert.equal(
    url.searchParams.get("text"),
    "Olá! Fiz o pedido PBA23456Z da página de empresa no Piracanjuba.ai e paguei pelo PIX. Segue o comprovante.",
  );
});

test("endereço sugerido vira slug sem acento", () => {
  assert.equal(sugerirEndereco("Padaria Pão Quente!"), "padaria-pao-quente");
  assert.equal(sugerirEndereco("  --Ótica  São José-- "), "otica-sao-jose");
  assert.equal(sugerirEndereco("a".repeat(39) + " bc"), "a".repeat(39));
});

test("contrato: o corpo que o formulário monta passa na validação da função", async () => {
  const { CAMPO_ISCA, camposVazios, montarCorpoPedido } = await import("../src/lib/pedidoPaginaEmpresa.ts");
  const funcao = await import("../supabase/functions/_shared/pedido-pagina-empresa.ts");
  assert.equal(CAMPO_ISCA, funcao.CAMPO_ISCA);
  const campos = {
    ...camposVazios(),
    comprador_nome: "Maria Souza",
    comprador_email: "maria@exemplo.com.br",
    comprador_whatsapp: "(64) 99123-4567",
    empresa_nome: "Padaria Pão Quente",
    empresa_categoria: "Padaria",
    empresa_oferta: "Pães, bolos e salgados feitos todo dia cedo.",
    empresa_whatsapp: "(64) 3405-1234",
    endereco_desejado: "Padaria Pão Quente",
  };
  const resultado = funcao.validarPedido(montarCorpoPedido(campos, "cartao", true, ""));
  assert.equal(resultado.ok, true);
  if (resultado.ok) {
    assert.equal(resultado.isca, false);
    assert.equal(resultado.pedido.endereco_desejado, "padaria-pao-quente");
    assert.equal(resultado.pedido.forma_pagamento, "cartao");
    assert.equal(resultado.pedido.comprador_documento, null);
  }
  // Todo campo do formulário é conhecido pela função (nada se perde no caminho).
  for (const campo of Object.keys(campos)) {
    assert.ok(campo in resultado.pedido, `campo ${campo} não chega à função`);
  }
});
