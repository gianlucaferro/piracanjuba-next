import assert from "node:assert/strict";
import test from "node:test";
import { estadoListaAtuacao, type ConsultaAtuacao } from "../src/lib/atuacao-carregamento.ts";

const carregando: ConsultaAtuacao = { carregada: false, falhou: false };
const ok: ConsultaAtuacao = { carregada: true, falhou: false };
const falhou: ConsultaAtuacao = { carregada: false, falhou: true };
// Refetch que falhou: status "error", mas os dados antigos continuam no cache.
const refetchFalhou: ConsultaAtuacao = { carregada: true, falhou: true };

test("Todos: espera as duas consultas antes de mostrar a lista e a contagem", () => {
  assert.deepEqual(estadoListaAtuacao("todos", carregando, carregando), { pronta: false, erro: false, faltando: null });
  assert.deepEqual(estadoListaAtuacao("todos", ok, carregando), { pronta: false, erro: false, faltando: null });
  assert.deepEqual(estadoListaAtuacao("todos", carregando, ok), { pronta: false, erro: false, faltando: null });
  assert.deepEqual(estadoListaAtuacao("todos", ok, ok), { pronta: true, erro: false, faltando: null });
});

test("Todos: falha só em projetos mostra as atuações com aviso", () => {
  assert.deepEqual(estadoListaAtuacao("todos", ok, falhou), { pronta: true, erro: false, faltando: "projetos" });
});

test("Todos: falha só na atuação mostra os projetos com aviso", () => {
  assert.deepEqual(estadoListaAtuacao("todos", falhou, ok), { pronta: true, erro: false, faltando: "atuacao" });
});

test("Todos: uma falha espera a outra consulta terminar antes de decidir", () => {
  assert.deepEqual(estadoListaAtuacao("todos", falhou, carregando), { pronta: false, erro: false, faltando: null });
  assert.deepEqual(estadoListaAtuacao("todos", carregando, falhou), { pronta: false, erro: false, faltando: null });
});

test("Todos: erro de tela cheia só quando as duas falham sem dado nenhum", () => {
  assert.deepEqual(estadoListaAtuacao("todos", falhou, falhou), { pronta: false, erro: true, faltando: null });
});

test("refetch que falha com dados no cache mantém a lista, sem erro nem aviso", () => {
  assert.deepEqual(estadoListaAtuacao("todos", ok, refetchFalhou), { pronta: true, erro: false, faltando: null });
  assert.deepEqual(estadoListaAtuacao("todos", refetchFalhou, refetchFalhou), { pronta: true, erro: false, faltando: null });
  assert.deepEqual(estadoListaAtuacao("projetos", carregando, refetchFalhou), { pronta: true, erro: false, faltando: null });
  assert.deepEqual(estadoListaAtuacao("atuacao", refetchFalhou, carregando), { pronta: true, erro: false, faltando: null });
});

test("Projeto de Lei olha só os projetos", () => {
  assert.deepEqual(estadoListaAtuacao("projetos", falhou, ok), { pronta: true, erro: false, faltando: null });
  assert.deepEqual(estadoListaAtuacao("projetos", ok, carregando), { pronta: false, erro: false, faltando: null });
  assert.deepEqual(estadoListaAtuacao("projetos", ok, falhou), { pronta: false, erro: true, faltando: null });
});

test("Indicação, Requerimento e Moção olham só a atuação", () => {
  assert.deepEqual(estadoListaAtuacao("atuacao", ok, falhou), { pronta: true, erro: false, faltando: null });
  assert.deepEqual(estadoListaAtuacao("atuacao", carregando, ok), { pronta: false, erro: false, faltando: null });
  assert.deepEqual(estadoListaAtuacao("atuacao", falhou, ok), { pronta: false, erro: true, faltando: null });
});
