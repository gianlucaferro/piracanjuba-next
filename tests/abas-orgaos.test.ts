import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  abaDaUrlPrefeitura,
  abaDoCaminho,
  abaExibida,
  abaPermitidaPrefeitura,
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

test("toda aba das rotas sai do caminho, com e sem barra final, e volta ao mesmo endereço", () => {
  const abasPrefeitura = abasDaRota("../src/app/prefeitura/[aba]/page.tsx");
  const abasCamara = abasDaRota("../src/app/camara/[aba]/page.tsx");
  assert.ok(abasPrefeitura.length > 10 && abasCamara.length > 10);
  for (const aba of abasPrefeitura) {
    assert.equal(abaDoCaminho(`/prefeitura/${aba}`, "prefeitura"), aba);
    assert.equal(abaDoCaminho(`/prefeitura/${aba}/`, "prefeitura"), aba);
    assert.equal(abaDoCaminho(hrefAbaPrefeitura(aba), "prefeitura"), aba);
  }
  for (const aba of abasCamara) {
    assert.equal(abaDoCaminho(`/camara/${aba}`, "camara"), aba);
    assert.equal(abaDoCaminho(`/camara/${aba}/`, "camara"), aba);
    assert.equal(abaDoCaminho(hrefAbaCamara(aba), "camara"), aba);
  }
});

test("a raiz do órgão é a aba padrão", () => {
  assert.equal(abaDoCaminho("/prefeitura", "prefeitura"), "visao-geral");
  assert.equal(abaDoCaminho("/prefeitura/", "prefeitura"), "visao-geral");
  assert.equal(abaDoCaminho("/camara", "camara"), "vereadores");
  assert.equal(abaDoCaminho("/camara/", "camara"), "vereadores");
  assert.equal(abaDoCaminho(hrefAbaPrefeitura("visao-geral"), "prefeitura"), "visao-geral");
  assert.equal(abaDoCaminho(hrefAbaCamara("vereadores"), "camara"), "vereadores");
});

test("query e hash não mudam a aba do caminho", () => {
  assert.equal(abaDoCaminho("/camara/projetos?tipo=x#topo", "camara"), "projetos");
  assert.equal(abaDoCaminho("/prefeitura?tab=leis", "prefeitura"), "visao-geral");
  assert.equal(abaDoCaminho("/camara#topo", "camara"), "vereadores");
});

test("aba inválida, aba sem rota e caminho de outra página devolvem null", () => {
  assert.equal(abaDoCaminho("/camara/nao-existe", "camara"), null);
  assert.equal(abaDoCaminho("/prefeitura/nao-existe", "prefeitura"), null);
  // A aba admin da Prefeitura não tem rota própria.
  assert.equal(abaDoCaminho("/prefeitura/admin", "prefeitura"), null);
  // A aba padrão mora na raiz, não em /<órgão>/<aba padrão>.
  assert.equal(abaDoCaminho("/camara/vereadores", "camara"), null);
  assert.equal(abaDoCaminho("/prefeitura/visao-geral", "prefeitura"), null);
  // Chaves herdadas de Object não viram aba.
  assert.equal(abaDoCaminho("/camara/toString", "camara"), null);
  assert.equal(abaDoCaminho("/camara/projetos/extra", "camara"), null);
  // Aba de um órgão não vale no outro.
  assert.equal(abaDoCaminho("/prefeitura/projetos", "prefeitura"), null);
  assert.equal(abaDoCaminho("/camara/projetos", "prefeitura"), null);
  assert.equal(abaDoCaminho("/vereadores", "camara"), null);
  assert.equal(abaDoCaminho("/", "camara"), null);
  assert.equal(abaDoCaminho("", "camara"), null);
  assert.equal(abaDoCaminho(null, "prefeitura"), null);
  assert.equal(abaDoCaminho(undefined, "prefeitura"), null);
});

test("na raiz da Prefeitura vale ?tab=; em /prefeitura/<aba> manda o caminho", () => {
  assert.equal(abaDaUrlPrefeitura("/prefeitura", "tcm-go"), "tcm-go");
  assert.equal(abaDaUrlPrefeitura("/prefeitura", "admin"), "admin");
  assert.equal(abaDaUrlPrefeitura("/prefeitura", null), "visao-geral");
  assert.equal(abaDaUrlPrefeitura("/prefeitura", ""), "visao-geral");
  assert.equal(abaDaUrlPrefeitura("/prefeitura/contratos", "leis"), "contratos");
  assert.equal(abaDaUrlPrefeitura("/prefeitura/nao-existe", "leis"), null);
});

test("a escolha do clique vale até a URL do roteador mudar", () => {
  const escolha = { aba: "servidores", url: "/camara/projetos" };
  // Logo depois do clique, o roteador ainda está na URL antiga: a aba troca na hora.
  assert.equal(abaExibida(escolha, "/camara/projetos", "projetos"), "servidores");
  // O roteador chegou à URL da aba escolhida.
  assert.equal(abaExibida(escolha, "/camara/servidores", "servidores"), "servidores");
  // Link do rodapé, Voltar ou Avançar levaram a outra aba: vale a URL.
  assert.equal(abaExibida(escolha, "/camara/contratos", "contratos"), "contratos");
  // Sem clique, vale a URL.
  assert.equal(abaExibida(null, "/camara/projetos", "projetos"), "projetos");
});

test("a aba admin, que não muda a URL, fica até a URL mudar", () => {
  const escolha = { aba: "admin", url: "/prefeitura/contratos?" };
  assert.equal(abaExibida(escolha, "/prefeitura/contratos?", "contratos"), "admin");
  assert.equal(abaExibida(escolha, "/prefeitura/leis?", "leis"), "leis");
});

test("sem o token de /admin, ?tab=admin cai na visão geral; com o token, a aba admin fica", () => {
  // /prefeitura?tab=admin: no servidor e na hidratação nunca há token.
  const daUrl = abaDaUrlPrefeitura("/prefeitura", "admin") ?? "visao-geral";
  assert.equal(abaPermitidaPrefeitura(daUrl, false), "visao-geral");
  assert.equal(tituloAbaPrefeitura(abaPermitidaPrefeitura(daUrl, false)), "Prefeitura de Piracanjuba");
  assert.equal(abaPermitidaPrefeitura(daUrl, true), "admin");
  // A escolha do clique na aba admin também depende do token.
  const escolha = { aba: "admin", url: "/prefeitura?" };
  assert.equal(abaPermitidaPrefeitura(abaExibida(escolha, "/prefeitura?", "visao-geral"), false), "visao-geral");
  assert.equal(abaPermitidaPrefeitura(abaExibida(escolha, "/prefeitura?", "visao-geral"), true), "admin");
  // As abas públicas não dependem do token.
  for (const aba of ["visao-geral", "contratos", "tcm-go", "leis"]) {
    assert.equal(abaPermitidaPrefeitura(aba, false), aba);
    assert.equal(abaPermitidaPrefeitura(aba, true), aba);
  }
});

test("a Prefeitura decide a aba ativa (H1 e conteúdo) passando pelo token de /admin", () => {
  const fonte = readFileSync(new URL("../src/components/prefeitura/PrefeituraClient.tsx", import.meta.url), "utf8");
  assert.match(fonte, /const activeTab = abaPermitidaPrefeitura\(abaExibida\([^)]*\), temTokenAdmin\);/);
  // O token é lido antes de activeTab, que alimenta o H1 e o <Tabs value>.
  assert.ok(fonte.indexOf("const temTokenAdmin") < fonte.indexOf("const activeTab"));
  assert.match(fonte, /tituloAbaPrefeitura\(activeTab\)/);
  assert.match(fonte, /<Tabs value=\{activeTab\}/);
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
