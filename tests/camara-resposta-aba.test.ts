import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  FONTE_PORTAL_CAMARA,
  FONTE_SICONFI,
  INDICACOES_NO_PAINEL,
  INDICACOES_NO_SERVIDOR,
  LICITACOES_EM_CARTAO,
  LICITACOES_NO_SERVIDOR,
  contarPagamentosRepetidos,
  faqContratos,
  faqDespesas,
  faqLicitacoes,
  faqPageJsonLd,
  faqServidores,
  formatarCompetencia,
  formatarData,
  formatarDataCurta,
  formatarPercentual,
  linhaIndicacao,
  linhaLicitacao,
  pagamentosConfiaveis,
  paragrafoAtuacao,
  paragrafoContratos,
  paragrafoDespesas,
  paragrafoIndicacoes,
  paragrafoLicitacoes,
  paragrafoProjetos,
  paragrafoServidores,
  referenciaDoCadastro,
  resumirPagamentosPorAno,
  valorDaLicitacao,
  valorLicitacoes,
  type OrcamentoCamaraAno,
  type RegistroPagamentoCamara,
  type ResumoContratosCamara,
  type ResumoLicitacoesCamara,
} from "../src/components/camara/resposta-aba.ts";

// O Intl separa "R$" do número com espaço não separável; os testes comparam com espaço comum.
const texto = (s: string | null) => (s ?? "").replace(/\u00a0/g, " ");
const SEM_TRAVESSAO = /[\u2013\u2014]/;

// Números conferidos no banco em 2026-11-19 (contrato_camara, camara_orcamento, folha da Câmara).
const CONTRATOS: ResumoContratosCamara = {
  total: 171,
  totalValor: 3911810.86,
  emVigor: 12,
  anoMin: 2013,
  anoMax: 2026,
  maiorFornecedor: { nome: "FORNECEDOR DE TESTE LTDA", qtde: 5, soma: 512345.6 },
  ultimaPublicacao: "2026-10-09",
};

const ORCAMENTOS: OrcamentoCamaraAno[] = [
  { ano: 2026, dotacao: 3800000, liquidada: 1927865.18, periodo_referencia: 4 },
  { ano: 2025, dotacao: 3120000, liquidada: 2914848.58, periodo_referencia: 6 },
  { ano: 2024, dotacao: 2690169.02, liquidada: 2690169.02, periodo_referencia: 6 },
];

const LICITACOES: ResumoLicitacoesCamara = {
  total: 610,
  anoMin: 2015,
  anoMax: 2026,
  modalidadeMaisUsada: { modalidade: "Dispensa", quantidade: 526 },
  homologadas: 503,
  totalHomologado: 0,
  totalEstimado: 4673269.7,
  ultimaPublicacao: "2026-11-11",
};

function pagamento(ano: number, valor: number, extra: Partial<RegistroPagamentoCamara> = {}): RegistroPagamentoCamara {
  return { ano, credor: "CREDOR", descricao: "Serviço", elemento: null, valor, data_pagamento: `${ano}-03-10`, ...extra };
}

test("datas e competências saem absolutas, sem depender de fuso", () => {
  assert.equal(formatarData("2026-10-28"), "28 de outubro de 2026");
  assert.equal(formatarData("2026-11-01T02:00:00Z"), "1 de novembro de 2026");
  assert.equal(formatarData(null), null);
  assert.equal(formatarData("28/10/2026"), null);
  assert.equal(formatarCompetencia("2026-10"), "outubro de 2026");
  assert.equal(formatarCompetencia("2026-13"), null);
  assert.equal(formatarPercentual(2914848.58, 3120000), "93,4%");
  assert.equal(formatarPercentual(1, 0), null);
});

test("parágrafo de contratos traz número, valor, data e fonte nomeada", () => {
  const p = texto(paragrafoContratos(CONTRATOS));
  assert.match(p, /171 contratos registrados de 2013 a 2026/);
  assert.match(p, /R\$ 3\.911\.810,86/);
  assert.match(p, /12 estão em vigor/);
  assert.match(p, /FORNECEDOR DE TESTE LTDA, com 5 contratos que somam R\$ 512\.345,60/);
  assert.match(p, /9 de outubro de 2026/);
  assert.ok(p.includes(FONTE_PORTAL_CAMARA));
  assert.doesNotMatch(p, SEM_TRAVESSAO);
});

test("contratos: singular, um ano só e ausência de dado", () => {
  const p = texto(paragrafoContratos({ ...CONTRATOS, total: 1, emVigor: 1, anoMin: 2026, anoMax: 2026, maiorFornecedor: null, ultimaPublicacao: null }));
  assert.match(p, /1 contrato registrado em 2026/);
  assert.match(p, /1 está em vigor/);
  assert.doesNotMatch(p, /maior fornecedor/);
  assert.equal(paragrafoContratos({ ...CONTRATOS, total: 0 }), null);
  assert.deepEqual(faqContratos({ ...CONTRATOS, total: 0 }), []);
});

test("parágrafo de licitações cita modalidade, homologação e data", () => {
  const p = texto(paragrafoLicitacoes(LICITACOES));
  assert.match(p, /registra 610 licitações de 2015 a 2026/);
  assert.match(p, /Dispensa, com 526 processos/);
  assert.match(p, /503 licitações estão homologadas\./);
  // A fonte não informa valor homologado em 2026-11-19: o texto usa o estimado e nunca diz R$ 0,00.
  assert.match(p, /Os valores estimados informados somam R\$ 4\.673\.269,70/);
  assert.doesNotMatch(p, /R\$ 0,00|valor homologado/);
  const comHomologado = texto(paragrafoLicitacoes({ ...LICITACOES, totalHomologado: 1000 }));
  assert.match(comHomologado, /O valor homologado somado é de R\$ 1\.000,00/);
  assert.equal(valorLicitacoes({ totalHomologado: 0, totalEstimado: 0 }), null);
  assert.match(p, /11 de novembro de 2026/);
  assert.equal(paragrafoLicitacoes({ ...LICITACOES, total: 0 }), null);
  assert.equal(faqLicitacoes(LICITACOES).length, 2);
});

test("despesas: SICONFI do ano corrente parcial, ano fechado e pagamentos do portal", () => {
  const pagamentos = resumirPagamentosPorAno([pagamento(2025, 4000000), pagamento(2025, 406645.98, { credor: "OUTRO" })]);
  const p = texto(paragrafoDespesas(ORCAMENTOS, pagamentos));
  assert.ok(p.startsWith(`Pelo ${FONTE_SICONFI}`));
  assert.match(p, /liquidou R\$ 1\.927\.865,18 em despesas de 2026 até agosto \(4º bimestre\), de R\$ 3\.800\.000,00 orçados/);
  assert.match(p, /Em 2025, a despesa liquidada foi de R\$ 2\.914\.848,58, 93,4% do orçamento de R\$ 3\.120\.000,00/);
  assert.match(p, /lista 2 pagamentos em 2025, que somam R\$ 4\.406\.645,98/);
  assert.match(p, /São fontes diferentes/);
  assert.doesNotMatch(p, SEM_TRAVESSAO);
});

test("despesas: ano com pagamento repetido fica fora do texto", () => {
  const repetido = pagamento(2025, 100);
  const anos = resumirPagamentosPorAno([repetido, { ...repetido }, pagamento(2024, 50)]);
  assert.deepEqual(anos.map((a) => [a.ano, a.pagamentos, a.repetidos]), [[2025, 2, 1], [2024, 1, 0]]);
  assert.deepEqual(pagamentosConfiaveis(anos).map((a) => a.ano), [2024]);
  const p = texto(paragrafoDespesas([], anos));
  assert.match(p, /lista 1 pagamento em 2024/);
  assert.doesNotMatch(p, /2025/);
  assert.doesNotMatch(p, /São fontes diferentes/);
  assert.equal(paragrafoDespesas([], []), null);
  assert.deepEqual(faqDespesas([], []), []);
});

test("soma dos pagamentos em centavos, sem resíduo de ponto flutuante", () => {
  const [ano] = resumirPagamentosPorAno([pagamento(2025, 0.1, { credor: "A" }), pagamento(2025, 0.2, { credor: "B" })]);
  assert.equal(ano.total, 0.3);
  assert.equal(contarPagamentosRepetidos([]), 0);
});

test("servidores: folha mensal com valor e cadastro de pessoal", () => {
  const folha = { competencia: "2026-10", bruto: 239900.63, pessoas: 36 };
  const cadastro = { referencia: "10/2026", pessoas: 36, cargos: 9 };
  const p = texto(paragrafoServidores(folha, cadastro));
  assert.match(p, /Na folha mensal de outubro de 2026, a Câmara Municipal de Piracanjuba pagou R\$ 239\.900,63 brutos a 36 pessoas/);
  assert.match(p, /cadastro de pessoal de 10\/2026 tem 36 pessoas em 9 cargos/);
  assert.match(texto(paragrafoServidores({ ...folha, bruto: null }, null)), /valor bruto não informado na fonte/);
  assert.equal(paragrafoServidores(null, null), null);
  assert.equal(faqServidores({ ...folha, bruto: null }, null).length, 0, "sem valor não há resposta sobre gasto com folha");
});

test("indicações, projetos e atuação: números, data e ausência de dado", () => {
  assert.match(
    texto(paragrafoIndicacoes({ total: 2230, ano: 2026, doAno: 412, ultima: "2026-10-28" })),
    /2\.230 indicações registradas .* 412 delas em 2026; a mais recente foi publicada em 28 de outubro de 2026/,
  );
  assert.equal(paragrafoIndicacoes({ total: 0, ano: 2026, doAno: 0, ultima: null }), null);
  // Começo de ano sem indicação nova: não afirma "0 delas em 2027".
  const janeiro = texto(paragrafoIndicacoes({ total: 2230, ano: 2027, doAno: 0, ultima: "2026-12-18" }));
  assert.doesNotMatch(janeiro, /0 delas/);
  assert.match(janeiro, /2\.230 indicações registradas/);
  assert.match(
    texto(paragrafoProjetos({ total: 175, tipoMaisComum: { tipo: "Projeto de Lei do Executivo", quantidade: 80 }, ultima: "2026-11-04" })),
    /175 atos legislativos.*Projeto de Lei do Executivo, com 80.*4 de novembro de 2026/,
  );
  assert.match(
    texto(paragrafoAtuacao({ mocoes: 40, requerimentos: 27, ultima: "2026-06-29" })),
    /40 moções e 27 requerimentos; o mais recente foi publicado em 29 de junho de 2026/,
  );
  assert.equal(paragrafoAtuacao({ mocoes: 0, requerimentos: 0, ultima: null }), null);
});

test("FAQPage repete exatamente as perguntas e respostas visíveis", () => {
  const itens = faqContratos(CONTRATOS);
  const schema = faqPageJsonLd("https://piracanjuba.ai/camara/contratos", itens);
  assert.ok(schema);
  assert.equal(schema["@id"], "https://piracanjuba.ai/camara/contratos#perguntas");
  assert.deepEqual(
    schema.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]),
    itens.map((i) => [i.pergunta, i.resposta]),
  );
  assert.equal(faqPageJsonLd("https://piracanjuba.ai/camara/contratos", []), null);
  for (const item of [...itens, ...faqLicitacoes(LICITACOES), ...faqDespesas(ORCAMENTOS, [])]) {
    assert.doesNotMatch(`${item.pergunta} ${item.resposta}`, SEM_TRAVESSAO);
  }
});

// O primeiro lote lido no servidor (src/lib/data/camara-abas.ts) entra no react-query com a chave
// do cliente. Se a consulta do cliente mudar e a cópia do servidor não, o cliente passa a receber
// um dado diferente do que buscaria. Os trechos abaixo precisam existir nas duas pontas.
function corpo(arquivo: string, nome: string): string {
  const fonte = readFileSync(new URL(`../${arquivo}`, import.meta.url), "utf8");
  const inicio = fonte.search(new RegExp(`export (async function|const) ${nome}\\b`));
  assert.ok(inicio >= 0, `${nome} não encontrado em ${arquivo}`);
  const fim = fonte.indexOf("\nexport ", inicio + 1);
  return fonte.slice(inicio, fim < 0 ? undefined : fim).replace(/\s+/g, "");
}

const sem = (s: string) => s.replace(/\s+/g, "");

test("contratos: a consulta do servidor é a mesma do cliente", () => {
  const cliente = corpo("src/data/camaraApi.ts", "fetchCamaraContratos");
  const servidor = corpo("src/lib/data/camara-abas.ts", "fetchCamaraContratosServidor");
  for (const trecho of ['.from("camara_contratos")', '.select("*")', '.order("vigencia_inicio", { ascending: false })']) {
    assert.ok(cliente.includes(sem(trecho)), `cliente sem ${trecho}`);
    assert.ok(servidor.includes(sem(trecho)), `servidor sem ${trecho}`);
  }
});

test("servidores: o primeiro lote do servidor é a página 0 do cliente, sem busca", () => {
  const cliente = corpo("src/data/prefeituraApi.ts", "fetchServidores");
  const servidor = corpo("src/lib/data/camara-abas.ts", "fetchServidoresCamaraPrimeiroLote");
  for (const trecho of ['.from("servidores").select("*", { count: "exact" })', '.order("nome").order("id").range(']) {
    assert.ok(cliente.includes(sem(trecho)), `cliente sem ${trecho}`);
    assert.ok(servidor.includes(sem(trecho)), `servidor sem ${trecho}`);
  }
  assert.ok(cliente.includes(sem('.eq("orgao_tipo", orgaoTipo)')));
  assert.ok(servidor.includes(sem('.eq("orgao_tipo", "camara")')));
  assert.ok(servidor.includes(sem(".range(0, pageSize - 1)")));
});

test("resumo da folha: o servidor repete as consultas e a soma do cliente", () => {
  const cliente = corpo("src/data/camaraApi.ts", "fetchCamaraResumoFolha");
  const servidor = corpo("src/lib/data/camara-abas.ts", "fetchResumoFolhaCamaraServidor");
  for (const trecho of [
    '.select("competencia, servidores!inner(orgao_tipo)")',
    '.ilike("tipo_folha", "MENSAL")',
    '.select("id, servidor_id, competencia, tipo_folha, bruto, servidores!inner(orgao_tipo)", { count: "exact" })',
    '.in("competencia", competencias)',
    '.order("id", { ascending: true })',
    "resumirFolhaCamara(registros)",
  ]) {
    assert.ok(cliente.includes(sem(trecho)), `cliente sem ${trecho}`);
    assert.ok(servidor.includes(sem(trecho)), `servidor sem ${trecho}`);
  }
});

test("cliente e servidor usam as mesmas chaves do react-query", () => {
  const ler = (arquivo: string) => readFileSync(new URL(`../${arquivo}`, import.meta.url), "utf8");
  assert.match(ler("src/components/camara/ContratosTab.tsx"), /queryKey: CHAVE_CONTRATOS_CAMARA/);
  assert.match(ler("src/components/camara/ResumoFolhaCamara.tsx"), /queryKey: CHAVE_RESUMO_FOLHA_CAMARA/);
  assert.match(ler("src/components/camara/CamaraClient.tsx"), /queryKey: chaveServidoresCamara\(search, page\)/);
  const servidor = ler("src/app/camara/[aba]/bloco-servidor.tsx");
  assert.match(servidor, /setQueryData\(CHAVE_CONTRATOS_CAMARA,/);
  assert.match(servidor, /setQueryData\(CHAVE_RESUMO_FOLHA_CAMARA,/);
  assert.match(servidor, /setQueryData\(chaveServidoresCamara\("", 0\),/);
});

// ---------------------------------------------------------------- Revisão do CodeRabbit no PR 56

const fonteDe = (arquivo: string) => readFileSync(new URL(`../${arquivo}`, import.meta.url), "utf8");

test("valor de cada licitação: homologado zero não esconde o estimado", () => {
  // O sync grava "0,00" do portal como 0 (19 estimados zerados em 2026-11-19).
  assert.deepEqual(valorDaLicitacao({ valor_homologado: 0, valor_estimado: 100 }), { rotulo: "estimado", valor: 100 });
  assert.deepEqual(valorDaLicitacao({ valor_homologado: null, valor_estimado: 100 }), { rotulo: "estimado", valor: 100 });
  assert.deepEqual(valorDaLicitacao({ valor_homologado: 80, valor_estimado: 100 }), { rotulo: "homologado", valor: 80 });
  assert.equal(valorDaLicitacao({ valor_homologado: 0, valor_estimado: 0 }), null);
  assert.equal(valorDaLicitacao({ valor_homologado: null, valor_estimado: null }), null);
  // O cartão usa a mesma regra, não o `??` que parava no zero.
  const bloco = fonteDe("src/components/camara/BlocosServidorCamara.tsx");
  assert.doesNotMatch(bloco, /valor_homologado \?\?/);
  assert.match(bloco, /valorDaLicitacao\(l\)/);
});

test("licitação e indicação em uma linha: dados da fonte, data absoluta e objeto cortado", () => {
  const licitacao = {
    modalidade: "Dispensa",
    situacao: "Homologada",
    data_publicacao: "2026-11-11",
    valor_homologado: 0,
    valor_estimado: 1234.5,
    descricao: `Aquisição de material ${"x".repeat(600)}`,
  };
  const linha = texto(linhaLicitacao(licitacao));
  assert.ok(linha.startsWith(" (Dispensa, Homologada, publicada em 11/11/2026, valor estimado de R$ 1.234,50): Aquisição de material"));
  assert.ok(linha.endsWith("..."));
  assert.ok(linha.length < 320, `linha com ${linha.length} caracteres`);
  assert.equal(
    texto(linhaLicitacao({ ...licitacao, modalidade: null, situacao: " ", data_publicacao: null, valor_estimado: 0, descricao: null })),
    " (valor não informado)",
  );
  assert.equal(linhaIndicacao({ data_publicacao: "2026-10-09T00:00:00Z", autor: null, ementa: " Pede asfalto. " }), " (09/10/2026): Pede asfalto.");
  assert.equal(linhaIndicacao({ data_publicacao: null, autor: "Vereador X", ementa: null }), " (autor: Vereador X)");
  assert.equal(linhaIndicacao({ data_publicacao: null, autor: " ", ementa: "" }), "");
  assert.equal(formatarDataCurta("2026-10-09"), "09/10/2026");
  assert.equal(formatarDataCurta("09/10/2026"), null);
  for (const l of [linha, linhaIndicacao({ data_publicacao: "2026-10-09", autor: "A", ementa: "B" })]) {
    assert.doesNotMatch(l, SEM_TRAVESSAO);
  }
});

test("as abas alcançam pelo menos o que as páginas /transparencia/* listavam", () => {
  // /transparencia/licitacoes-camara listava 150 e /transparencia/indicacoes, 200 (origin/main antes do 308).
  assert.ok(LICITACOES_NO_SERVIDOR >= 150);
  assert.ok(INDICACOES_NO_SERVIDOR >= 200);
  assert.ok(LICITACOES_EM_CARTAO < LICITACOES_NO_SERVIDOR);
  assert.ok(INDICACOES_NO_PAINEL < INDICACOES_NO_SERVIDOR);
  const servidor = fonteDe("src/app/camara/[aba]/bloco-servidor.tsx");
  assert.match(servidor, /fetchLicitacoesRecentes\(LICITACOES_NO_SERVIDOR\)/);
  assert.match(servidor, /fetchIndicacoesRecentes\(INDICACOES_NO_SERVIDOR\)/);
  // O que passa dos cartões e do painel vai para a lista de uma linha, não é descartado.
  const bloco = fonteDe("src/components/camara/BlocosServidorCamara.tsx");
  assert.match(bloco, /recentes\.slice\(LICITACOES_EM_CARTAO\)/);
  assert.match(bloco, /demais\.map\(\(l\) => \([\s\S]*?linhaLicitacao\(l\)/);
  assert.match(bloco, /indicacoes\.slice\(INDICACOES_NO_PAINEL\)/);
  assert.match(bloco, /demais\.map\(\(i\) => \([\s\S]*?linhaIndicacao\(i\)/);
});

test("cadastro de pessoal: a tabela traz a competência das próprias linhas", () => {
  assert.equal(referenciaDoCadastro([{ ano: 2026, mes: 11 }, { ano: 2026, mes: 11 }]), "11/2026");
  assert.equal(referenciaDoCadastro([{ ano: 2026, mes: 3 }]), "03/2026");
  assert.equal(referenciaDoCadastro([]), null);
  assert.equal(referenciaDoCadastro([{ ano: 2026, mes: 10 }, { ano: 2026, mes: 11 }]), null);
  // Resumo por cargo de 10/2026 (cache ainda velho) e linhas de 11/2026: cada parte com o seu mês.
  const servidor = fonteDe("src/app/camara/[aba]/bloco-servidor.tsx");
  assert.match(servidor, /referenciaTabela=\{referenciaDoCadastro\(cadastro \?\? \[\]\)\}/);
  const bloco = fonteDe("src/components/camara/BlocosServidorCamara.tsx");
  assert.match(bloco, /Cadastro de pessoal\{referenciaTabela \?/);
  assert.match(bloco, /Pessoal por cargo\{referenciaCadastro \?/);
});
