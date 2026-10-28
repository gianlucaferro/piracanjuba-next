import assert from "node:assert/strict";
import test from "node:test";
import { normalizarServidorRemuneracao, somarFolhaPorOrgao } from "../src/components/prefeitura/folha-destaques.ts";

test("folha separa Prefeitura e Câmara nas duas formas de relação do Supabase", () => {
  const resultado = somarFolhaPorOrgao([
    { bruto: 1500, servidores: { orgao_tipo: "prefeitura" } },
    { bruto: 2500, servidores: [{ orgao_tipo: "prefeitura" }] },
    { bruto: 900, servidores: { orgao_tipo: "camara" } },
    { bruto: 700, servidores: [{ orgao_tipo: "camara" }] },
    { bruto: null, servidores: { orgao_tipo: "prefeitura" } },
    { bruto: 0, servidores: { orgao_tipo: "camara" } },
  ]);

  assert.deepEqual(resultado, {
    prefeitura: { total: 4000, count: 3 },
    camara: { total: 1600, count: 3 },
  });
});

test("folha não atribui valores sem órgão reconhecido ou com relação ambígua", () => {
  const resultado = somarFolhaPorOrgao([
    { bruto: 99999, servidores: null },
    { bruto: 99999, servidores: [] },
    { bruto: 99999, servidores: { orgao_tipo: "outro" } },
    { bruto: 99999, servidores: [{ orgao_tipo: "prefeitura" }, { orgao_tipo: "camara" }] },
  ]);

  assert.deepEqual(resultado, {
    prefeitura: { total: 0, count: 0 },
    camara: { total: 0, count: 0 },
  });
});

test("normalização preserva nome e cargo do servidor para os destaques", () => {
  const servidor = { nome: "Servidor municipal", cargo: "Professor", orgao_tipo: "prefeitura" };
  assert.deepEqual(normalizarServidorRemuneracao(servidor), servidor);
  assert.deepEqual(normalizarServidorRemuneracao([servidor]), servidor);
});
