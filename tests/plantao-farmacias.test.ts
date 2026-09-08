import assert from "node:assert/strict";
import test from "node:test";
import {
  PLANTAO_FARMACIAS,
  gerarTextoCompartilhamento,
  getPeriodo,
  getTelefoneLink,
} from "../src/data/plantaoFarmacias.ts";

test("escala atualizada destaca Vitae em 2026-09-05 e mantém a ordem das demais", () => {
  const idx = PLANTAO_FARMACIAS.findIndex((semana) => semana.inicio === "2026-09-05");
  const semana = PLANTAO_FARMACIAS[idx];
  assert.equal(semana.farmacia24h?.nome, "Drogaria Vitae");
  assert.deepEqual(semana.demais.map((farmacia) => farmacia.nome), [
    "Drogaria São Sebastião", "Drogamais", "Drogaria Do Lar", "Drogaria JM Popular",
  ]);
  assert.deepEqual(getPeriodo(semana, PLANTAO_FARMACIAS[idx + 1]), {
    de: "5 de setembro", ate: "11 de setembro",
  });
  const texto = gerarTextoCompartilhamento(semana, PLANTAO_FARMACIAS[idx + 1]);
  assert.match(texto, /Farmácia 24h:\*\nDrogaria Vitae\n/);
  assert.doesNotMatch(texto, /undefined|null/);
});

test("semana sem indicação 24h conserva as cinco farmácias sem inventar responsável", () => {
  const semana = PLANTAO_FARMACIAS[0];
  assert.equal(semana.inicio, "2026-03-14");
  assert.equal(semana.farmacia24h, null);
  assert.equal(semana.demais.length, 5);
  const texto = gerarTextoCompartilhamento(semana, PLANTAO_FARMACIAS[1]);
  assert.match(texto, /Farmácia 24h não informada nesta escala/);
  for (const farmacia of semana.demais) assert.ok(texto.includes(farmacia.nome));
});

test("telefone não informado não cria contato inválido; contatos existentes continuam válidos", () => {
  assert.equal(getTelefoneLink({ nome: "Drogaria Vitae", telefone: "", tipo: "fixo" }), null);
  assert.equal(getTelefoneLink({ nome: "Teste", telefone: "(64) 3405-1734", tipo: "fixo" }), "tel:+556434051734");
  assert.ok(getTelefoneLink({ nome: "Teste", telefone: "(64) 99265-4341", tipo: "whatsapp" })?.startsWith("https://wa.me/5564992654341?text="));
});
