import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { test } from "node:test";
import { resumirPagamentosPorAno } from "../src/components/camara/resposta-aba.ts";
import { resumirFolhaCamara } from "../src/lib/camara-folha.ts";

// Leituras do servidor das abas da Câmara (revisão da Onda 2 de SEO, 2026-11-19). Os módulos de
// src/lib/data importam "server-only", "next/cache" e "@/...", que o node --test não resolve: o
// fonte roda num contexto isolado, com unstable_cache sem efeito e um Supabase falso que imita o
// PostgREST deste projeto (no máximo 1.000 linhas por resposta quando a consulta não pede faixa).

const LIMITE_POSTGREST = 1000;

function supabaseFalso(tabelas, falhar = () => false) {
  return {
    from(tabela) {
      const filtros = [];
      let colunas = "*";
      let opcoes = {};
      const ordens = [];
      let faixa = null;
      let limite = null;
      let unica = false;
      const consulta = {
        select(cols = "*", opts = {}) { colunas = cols; opcoes = opts; return consulta; },
        eq(chave, valor) { filtros.push(["eq", chave, valor]); return consulta; },
        in(chave, valores) { filtros.push(["in", chave, valores]); return consulta; },
        order(chave, opts = {}) { ordens.push([chave, opts.ascending !== false]); return consulta; },
        range(de, ate) { faixa = [de, ate + 1]; return consulta; },
        limit(n) { limite = n; return consulta; },
        maybeSingle() { unica = true; return consulta; },
        then(resolver, rejeitar) {
          if (falhar({ tabela, filtros, opcoes })) {
            return Promise.resolve({ data: null, error: { message: "falha simulada" }, count: null }).then(resolver, rejeitar);
          }
          let linhas = (tabelas[tabela] ?? []).filter((linha) => filtros.every(([op, chave, valor]) =>
            op === "eq" ? linha[chave] === valor : valor.includes(linha[chave])));
          const count = opcoes.count === "exact" ? linhas.length : null;
          if (ordens.length) {
            linhas = [...linhas].sort((a, b) => {
              for (const [chave, asc] of ordens) {
                if (a[chave] === b[chave]) continue;
                if (a[chave] === null) return 1;
                if (b[chave] === null) return -1;
                return (a[chave] < b[chave] ? -1 : 1) * (asc ? 1 : -1);
              }
              return 0;
            });
          }
          if (faixa) linhas = linhas.slice(...faixa);
          else if (limite !== null) linhas = linhas.slice(0, limite);
          else linhas = linhas.slice(0, LIMITE_POSTGREST);
          if (colunas !== "*") {
            const nomes = colunas.split(",").map((c) => c.trim());
            linhas = linhas.map((linha) => Object.fromEntries(nomes.map((n) => [n, linha[n]])));
          }
          let data = opcoes.head ? null : linhas;
          if (unica) {
            if (linhas.length > 1) {
              return Promise.resolve({ data: null, error: { message: "mais de uma linha" }, count }).then(resolver, rejeitar);
            }
            data = linhas[0] ?? null;
          }
          return Promise.resolve({ data, error: null, count }).then(resolver, rejeitar);
        },
      };
      return consulta;
    },
  };
}

async function carregar(arquivo, db) {
  const bruto = await readFile(new URL(`../${arquivo}`, import.meta.url), "utf8");
  const fonte = stripTypeScriptTypes(bruto
    .replace(/^import[\s\S]*?;\n/gm, "")
    .replace(/^export type /gm, "type ")
    .replace(/^export const /gm, "var "));
  const escopo = vm.createContext({
    console,
    unstable_cache: (fn) => fn,
    createPublicSupabaseClient: () => db,
    resumirPagamentosPorAno,
    resumirFolhaCamara,
  });
  vm.runInContext(fonte, escopo);
  return escopo;
}

// Objetos criados no contexto isolado têm outro Object.prototype; o deepEqual estrito compara isso.
const plano = (valor) => JSON.parse(JSON.stringify(valor));

// ---------------------------------------------------------------- camara-01

test("pagamentos: o cache guarda o resumo por ano, não as linhas cruas", async () => {
  const camara_despesas = [];
  let id = 0;
  // 2026 com repetição na fonte (como em 2026-11-19): 1.500 linhas, só 30 distintas.
  for (let i = 0; i < 1500; i++) {
    camara_despesas.push({ id: ++id, ano: 2026, credor: `CREDOR ${i % 30}`, descricao: "Serviço", elemento: null, valor: 10, data_pagamento: "2026-03-10" });
  }
  camara_despesas.push({ id: ++id, ano: 2025, credor: "A", descricao: "Serviço", elemento: null, valor: 0.1, data_pagamento: "2025-02-01" });
  camara_despesas.push({ id: ++id, ano: 2025, credor: "B", descricao: "Serviço", elemento: null, valor: 0.2, data_pagamento: "2025-02-01" });
  camara_despesas.push({ id: ++id, ano: 2024, credor: "C", descricao: "Serviço", elemento: null, valor: 99, data_pagamento: "2024-02-01" });

  const escopo = await carregar("src/lib/data/camara-abas.ts", supabaseFalso({ camara_despesas }));
  const resumo = await escopo.fetchPagamentosCamaraAnos([2026, 2025]);
  assert.deepEqual(plano(resumo), [
    { ano: 2026, pagamentos: 1500, total: 15000, repetidos: 1470 },
    { ano: 2025, pagamentos: 2, total: 0.3, repetidos: 0 },
  ]);
  // Poucos bytes por ano: muito abaixo dos 2 MB que o data cache do Next aceita gravar.
  assert.ok(JSON.stringify(resumo).length < 200, `resumo com ${JSON.stringify(resumo).length} bytes`);
  assert.deepEqual(plano(await escopo.fetchPagamentosCamaraAnos([])), []);
});

test("pagamentos: total que não confere com a contagem exata lança erro", async () => {
  const camara_despesas = [{ id: 1, ano: 2025, credor: "A", descricao: null, elemento: null, valor: 1, data_pagamento: null }];
  const escopo = await carregar("src/lib/data/camara-abas.ts", supabaseFalso({ camara_despesas }, ({ tabela }) => tabela === "camara_despesas"));
  await assert.rejects(escopo.fetchPagamentosCamaraAnos([2025]));
});

// ---------------------------------------------------------------- camara-03

function folhaCronologica() {
  // 30 competências de 36 pessoas, gravadas em ordem cronológica (1.080 linhas). Sem ordem nem
  // faixa, a resposta de 1.000 linhas corta 2026-10, 2026-09 e parte de 2026-08.
  const linhas = [];
  let id = 0;
  for (let k = 0; k < 30; k++) {
    const ano = 2024 + Math.floor((4 + k) / 12);
    const mes = ((4 + k) % 12) + 1;
    for (let p = 0; p < 36; p++) {
      linhas.push({ id: ++id, ano, mes, cargo: `CARGO ${p % 11}`, lotacao: p % 2 ? "Gabinete" : "Secretaria" });
    }
  }
  return linhas;
}

test("cadastro de pessoal: usa a última competência mesmo com mais de 1.000 linhas na tabela", async () => {
  const folha_servidor = folhaCronologica();
  assert.equal(folha_servidor.length, 1080);
  assert.deepEqual([folha_servidor.at(-1).ano, folha_servidor.at(-1).mes], [2026, 10]);
  const escopo = await carregar("src/lib/data/folha-camara.ts", supabaseFalso({ folha_servidor }));
  const stats = plano(await escopo.fetchFolhaStats());
  assert.equal(stats.ultima_referencia, "10/2026");
  assert.equal(stats.total_servidores_ultima, 36);
  assert.equal(stats.por_cargo.length, 11);
  assert.equal(stats.por_cargo.reduce((s, c) => s + c.quantidade, 0), 36);
  assert.deepEqual(stats.por_lotacao.map((l) => l.quantidade).sort(), [18, 18]);
});

test("cadastro de pessoal: erro do Supabase lança, para o cache não guardar resumo falso", async () => {
  const escopo = await carregar("src/lib/data/folha-camara.ts", supabaseFalso({ folha_servidor: folhaCronologica() }, () => true));
  await assert.rejects(escopo.fetchFolhaStats());
  const vazio = await carregar("src/lib/data/folha-camara.ts", supabaseFalso({ folha_servidor: [] }));
  assert.equal(await vazio.fetchFolhaStats(), null);
});

// ---------------------------------------------------------------- camara-04

function indicacoes() {
  const linhas = [];
  for (let i = 0; i < 10; i++) linhas.push({ id: `a${i}`, ano: 2026, data_publicacao: `2026-0${(i % 9) + 1}-15` });
  for (let i = 0; i < 5; i++) linhas.push({ id: `b${i}`, ano: 2025, data_publicacao: `2025-0${i + 1}-10` });
  linhas.push({ id: "c0", ano: 2026, data_publicacao: null });
  return linhas;
}

test("indicações: total, contagem do ano pedido e data mais recente", async () => {
  const escopo = await carregar("src/lib/data/camara-abas.ts", supabaseFalso({ indicacao_camara: indicacoes() }));
  assert.deepEqual(plano(await escopo.fetchIndicacoesResumoServidor(2026)), { total: 16, doAno: 11, ultima: "2026-09-15" });
  assert.deepEqual(plano(await escopo.fetchIndicacoesResumoServidor(2025)), { total: 16, doAno: 5, ultima: "2026-09-15" });
});

test("indicações: falha só na contagem do ano lança erro em vez de virar 0", async () => {
  const escopo = await carregar("src/lib/data/camara-abas.ts", supabaseFalso(
    { indicacao_camara: indicacoes() },
    ({ filtros }) => filtros.some(([, chave]) => chave === "ano"),
  ));
  await assert.rejects(escopo.fetchIndicacoesResumoServidor(2026));
});

test("aba de indicações: ano corrente e leitura que lança erro, sem ano fixo", async () => {
  const bloco = await readFile(new URL("../src/app/camara/[aba]/bloco-servidor.tsx", import.meta.url), "utf8");
  const trecho = bloco.slice(bloco.indexOf("async function blocoIndicacoes"), bloco.indexOf("async function blocoProjetos"));
  assert.match(trecho, /const ano = anoEmSaoPaulo\(\);/);
  assert.match(trecho, /fetchIndicacoesResumoServidor\(ano\)/);
  assert.match(trecho, /paragrafoIndicacoes\(\{ total: stats\.total, ano, doAno: stats\.doAno/);
  assert.doesNotMatch(bloco, /fetchIndicacoesStats|ano: 2026/);
});

// ---------------------------------------------------------------- atuação (revisão do PR 56)

function atos(mocoes, requerimentos) {
  const linhas = [];
  for (let i = 0; i < mocoes; i++) linhas.push({ id: `m${i}`, tipo: "MOCAO", ano: 2026 });
  for (let i = 0; i < requerimentos; i++) linhas.push({ id: `r${i}`, tipo: "REQUERIMENTO", ano: 2026 });
  linhas.push({ id: "p0", tipo: "PARECER", ano: 2026 });
  return linhas;
}

test("atuação: totais por contagem exata, sem parar nas 1.000 linhas do PostgREST", async () => {
  const escopo = await carregar("src/lib/data/camara-abas.ts", supabaseFalso({ ato_camara: atos(1001, 5) }));
  assert.deepEqual(plano(await escopo.fetchAtuacaoResumoServidor()), { mocoes: 1001, requerimentos: 5 });
  const vazio = await carregar("src/lib/data/camara-abas.ts", supabaseFalso({ ato_camara: [] }));
  assert.deepEqual(plano(await vazio.fetchAtuacaoResumoServidor()), { mocoes: 0, requerimentos: 0 });
});

test("atuação: falha na contagem lança erro em vez de virar total", async () => {
  const escopo = await carregar("src/lib/data/camara-abas.ts", supabaseFalso(
    { ato_camara: atos(3, 2) },
    ({ filtros }) => filtros.some(([, chave, valor]) => chave === "tipo" && valor === "REQUERIMENTO"),
  ));
  await assert.rejects(escopo.fetchAtuacaoResumoServidor());
  const bloco = await readFile(new URL("../src/app/camara/[aba]/bloco-servidor.tsx", import.meta.url), "utf8");
  assert.match(bloco, /tentar\("atuacao-resumo", \(\) => fetchAtuacaoResumoServidor\(\)\)/);
  assert.doesNotMatch(bloco, /fetchAtosStats/);
});

// ---------------------------------------------------------------- CodeRabbit, PR 56 (2026-11-19)

test("listas de licitações, indicações e atos lançam erro do Supabase em vez de cachear lista vazia", async () => {
  const falhaSempre = () => true;
  const licitacoes = await carregar("src/lib/data/licitacoes-camara.ts", supabaseFalso({}, falhaSempre));
  await assert.rejects(licitacoes.fetchLicitacoesRecentes(150));
  const indicacoes = await carregar("src/lib/data/indicacoes-camara.ts", supabaseFalso({}, falhaSempre));
  await assert.rejects(indicacoes.fetchIndicacoesRecentes(200));
  const atos = await carregar("src/lib/data/atos-camara.ts", supabaseFalso({}, falhaSempre));
  await assert.rejects(atos.fetchAtosPorTipo("MOCAO", 20));
  // Sem erro, a lista vem normalmente.
  const ok = await carregar("src/lib/data/licitacoes-camara.ts", supabaseFalso({ licitacao_camara: [{ id: 1, data_publicacao: "2026-11-01" }] }));
  assert.equal((await ok.fetchLicitacoesRecentes(150)).length, 1);
});
