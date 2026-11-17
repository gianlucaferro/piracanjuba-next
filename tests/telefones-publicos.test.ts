import assert from "node:assert/strict";
import test from "node:test";
import {
  FONTES_TELEFONES,
  TELEFONES,
  formatarTelefone,
  linkTelefone,
  type TelefonePublico,
} from "../src/data/telefones.ts";

const entradas = Object.entries(TELEFONES) as [string, TelefonePublico][];

test("formata celular com nono dígito e fixo com 8 dígitos", () => {
  assert.equal(formatarTelefone("5564992382040"), "(64) 99238-2040");
  assert.equal(formatarTelefone("556434054045"), "(64) 3405-4045");
  assert.equal(formatarTelefone("5562985956139"), "(62) 98595-6139");
  assert.equal(formatarTelefone("190"), "190");
});

test("todo número tem DDI 55, DDD e 8 (fixo) ou 9 dígitos (celular começando com 9)", () => {
  for (const [chave, { numero }] of entradas) {
    assert.match(numero, /^55\d{10,11}$/, chave);
    const local = numero.slice(4);
    if (local.length === 9) assert.equal(local[0], "9", `${chave}: celular sem o nono dígito`);
    else assert.match(local, /^[2-5]\d{7}$/, `${chave}: fixo fora do padrão`);
  }
});

test("WhatsApp só em celular; fixo abre tel:", () => {
  for (const [chave, telefone] of entradas) {
    if (telefone.canal === "whatsapp") assert.equal(telefone.numero.length, 13, chave);
  }
  assert.equal(linkTelefone(TELEFONES.delegacia), "tel:+556420880557");
  assert.equal(linkTelefone(TELEFONES.prefeituraFixo), "tel:+556434054045");
  assert.equal(
    linkTelefone(TELEFONES.trocaLampada, "Olá"),
    "https://wa.me/5564933008200?text=Ol%C3%A1",
  );
});

test("serviços diferentes não compartilham o mesmo número", () => {
  const vistos = new Map<string, string>();
  for (const [chave, { numero }] of entradas) {
    assert.equal(vistos.get(numero), undefined, `${chave} repete o número de ${vistos.get(numero)}`);
    vistos.set(numero, chave);
  }
});

test("números corrigidos em 2026-11-17 batem com as fontes oficiais", () => {
  assert.equal(formatarTelefone(TELEFONES.prefeituraFixo.numero), "(64) 3405-4045");
  assert.equal(formatarTelefone(TELEFONES.prefeituraCelular.numero), "(64) 99238-2040");
  assert.equal(formatarTelefone(TELEFONES.secSaude.numero), "(64) 99601-5760");
  assert.equal(formatarTelefone(TELEFONES.secAssistenciaSocial.numero), "(64) 99955-8619");
  assert.equal(formatarTelefone(TELEFONES.secEsportes.numero), "(64) 99298-0102");
  assert.equal(formatarTelefone(TELEFONES.delegacia.numero), "(64) 2088-0557");
  assert.equal(TELEFONES.delegacia.fonte, FONTES_TELEFONES.policiaCivil);
  for (const fonte of Object.values(FONTES_TELEFONES)) {
    assert.match(fonte.url, /^https:\/\//);
    assert.match(fonte.conferidoEm, /^\d{4}-\d{2}-\d{2}$/);
  }
});
