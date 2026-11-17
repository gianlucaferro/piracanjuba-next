import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  deveTrocarAbaNoCliente,
  hrefAbaCamara,
  hrefAbaPrefeitura,
  tituloAbaCamara,
  tituloAbaPrefeitura,
  type CliqueAba,
} from "../src/lib/abas-orgaos.ts";

const cliqueSimples: CliqueAba = {
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
};

test("aba padrão mora na raiz do órgão e as demais em /<órgão>/<aba>", () => {
  assert.equal(hrefAbaPrefeitura("visao-geral"), "/prefeitura");
  assert.equal(hrefAbaPrefeitura("contratos"), "/prefeitura/contratos");
  assert.equal(hrefAbaPrefeitura("tcm-go"), "/prefeitura/tcm-go");
  assert.equal(hrefAbaCamara("vereadores"), "/camara");
  assert.equal(hrefAbaCamara("decretos-leg"), "/camara/decretos-leg");
});

test("H1 diz o tema da aba e volta ao nome do órgão fora das abas conhecidas", () => {
  assert.equal(tituloAbaPrefeitura("contratos"), "Contratos da Prefeitura de Piracanjuba");
  assert.equal(tituloAbaPrefeitura("visao-geral"), "Prefeitura de Piracanjuba");
  assert.equal(tituloAbaPrefeitura("admin"), "Prefeitura de Piracanjuba");
  assert.equal(tituloAbaCamara("servidores"), "Servidores da Câmara Municipal de Piracanjuba");
  assert.equal(tituloAbaCamara("atuacao"), "Atuação parlamentar dos vereadores de Piracanjuba");
  assert.equal(tituloAbaCamara("vereadores"), "Câmara Municipal de Piracanjuba");
  // Chaves herdadas de Object não podem virar título.
  assert.equal(tituloAbaCamara("toString"), "Câmara Municipal de Piracanjuba");
});

// Lê as chaves de ABAS da rota, para o H1 não ficar para trás quando uma aba nova entrar lá.
function abasDaRota(arquivo: string): string[] {
  const fonte = readFileSync(new URL(arquivo, import.meta.url), "utf8");
  const bloco = fonte.slice(fonte.indexOf("const ABAS"), fonte.indexOf("};", fonte.indexOf("const ABAS")));
  return [...bloco.matchAll(/^\s+"?([a-z-]+)"?: \{ title:/gm)].map((m) => m[1]);
}

test("toda aba das rotas tem H1 próprio e sem travessão", () => {
  const abasPrefeitura = abasDaRota("../src/app/prefeitura/[aba]/page.tsx");
  const abasCamara = abasDaRota("../src/app/camara/[aba]/page.tsx");
  assert.ok(abasPrefeitura.length > 10, "não achei as abas da Prefeitura na rota");
  assert.ok(abasCamara.length > 10, "não achei as abas da Câmara na rota");
  for (const aba of abasPrefeitura) {
    const titulo = tituloAbaPrefeitura(aba);
    assert.notEqual(titulo, "Prefeitura de Piracanjuba", `aba ${aba} sem H1 próprio`);
    assert.doesNotMatch(titulo, /[\u2013\u2014]/);
  }
  for (const aba of abasCamara) {
    const titulo = tituloAbaCamara(aba);
    assert.notEqual(titulo, "Câmara Municipal de Piracanjuba", `aba ${aba} sem H1 próprio`);
    assert.doesNotMatch(titulo, /[\u2013\u2014]/);
  }
});

test("clique simples troca a aba sem navegar", () => {
  assert.equal(deveTrocarAbaNoCliente(cliqueSimples), true);
  assert.equal(deveTrocarAbaNoCliente(cliqueSimples, "_self"), true);
});

test("Ctrl, Cmd, Shift, Alt, botão do meio e outra janela ficam com o navegador", () => {
  assert.equal(deveTrocarAbaNoCliente({ ...cliqueSimples, ctrlKey: true }), false);
  assert.equal(deveTrocarAbaNoCliente({ ...cliqueSimples, metaKey: true }), false);
  assert.equal(deveTrocarAbaNoCliente({ ...cliqueSimples, shiftKey: true }), false);
  assert.equal(deveTrocarAbaNoCliente({ ...cliqueSimples, altKey: true }), false);
  assert.equal(deveTrocarAbaNoCliente({ ...cliqueSimples, button: 1 }), false);
  assert.equal(deveTrocarAbaNoCliente(cliqueSimples, "_blank"), false);
});

test("clique já tratado por outro handler não troca a aba", () => {
  assert.equal(deveTrocarAbaNoCliente({ ...cliqueSimples, defaultPrevented: true }), false);
});
