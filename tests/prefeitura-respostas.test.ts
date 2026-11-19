import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  cargoComArtigo,
  cargoCorrespondeAoPapel,
  competenciaEmBrasilia,
  competenciaPorExtenso,
  dataCurta,
  dataPorExtenso,
  diaEmBrasilia,
  DIAS_MATURIDADE_DESPESAS,
  diasAteVencimento,
  escolherMesFechado,
  escolherSubsidio,
  formatarReais,
  fotoAbsoluta,
  hojeEmBrasilia,
  mesMaduro,
  montarRespostaChefia,
  montarRespostaContratos,
  montarRespostaDespesas,
  montarRespostaSecretarias,
  montarRespostaServidores,
  nomesCoincidem,
  papelDoTipo,
  pessoaExecutivoJsonLd,
  vinculosDoCargo,
  type PessoaExecutivo,
  type SubsidioExecutivo,
} from "../src/lib/prefeitura-respostas.ts";
import { ehLoteInicial, LOTE_CONTRATOS, MARCA_LOTE_INICIAL, SERVIDORES_POR_PAGINA } from "../src/lib/prefeitura-lote.ts";
import {
  COLUNAS_CONTRATOS,
  consultarDespesasMensaisRecentes,
  consultarLoteContratos,
  consultarRemuneracaoExecutivo,
  MESES_DESPESAS_RECENTES,
  consultarServidoresPagina,
} from "../src/lib/prefeitura-consultas.ts";

const TRAVESSAO = /[\u2013\u2014]/;

// Cadastro do Executivo e folha conferidos no banco em 2026-11-19 (formato devolvido pelo PostgREST).
const prefeita: PessoaExecutivo = {
  tipo: "prefeita", nome: "Lenizia Alves Canedo", partido: "PP",
  mandato_inicio: "2025-01-01", mandato_fim: "2028-12-31",
  foto_url: "/images/prefeita-lenizia.webp", fonte_url: "https://piracanjuba.go.gov.br/secretariado/",
  updated_at: "2026-02-28T06:52:29.272268+00:00",
};
const vice: PessoaExecutivo = {
  tipo: "vice", nome: "Milton Justus", partido: "PDT",
  mandato_inicio: "2025-01-01", mandato_fim: "2028-12-31",
  foto_url: null, fonte_url: "https://piracanjuba.go.gov.br/secretariado/",
  updated_at: "2026-02-28T06:52:29.272268+00:00",
};
const subsidios: SubsidioExecutivo[] = [
  { nome: "Lenizia Alves Canedo", tipo: "prefeita", valor: 20650.12, competencia: "2026-10", fonteUrl: null },
  { nome: "Milton Justus", tipo: "vice", valor: 10260.12, competencia: "2026-10", fonteUrl: null },
];

test("datas e competências por extenso, sem depender do fuso de quem renderiza", () => {
  assert.equal(competenciaPorExtenso("2026-10"), "outubro de 2026");
  assert.equal(competenciaPorExtenso("2026-13"), "2026-13");
  assert.equal(dataPorExtenso("2026-11-10"), "10 de novembro de 2026");
  assert.equal(dataPorExtenso("2026-01-01"), "1º de janeiro de 2026");
  // Formato do Postgres e do PostgREST, em UTC.
  assert.equal(dataPorExtenso("2026-11-10 06:25:01.066+00"), "10 de novembro de 2026");
  assert.equal(diaEmBrasilia("2026-11-10T01:00:00+00:00"), "2026-11-09");
  // Data pura não passa por Date: "2026-11-17" não vira 16/11 no fuso de Brasília.
  assert.equal(dataCurta("2026-11-17"), "17/11/2026");
  assert.equal(dataCurta(null), null);
  assert.equal(dataCurta("lixo"), null);
  assert.equal(hojeEmBrasilia(new Date("2026-11-20T02:00:00Z")), "2026-11-19");
  assert.equal(competenciaEmBrasilia(new Date("2026-12-01T02:00:00Z")), "2026-11");
});

test("dias até o vencimento contam o dia de hoje e marcam vencido desde o dia seguinte ao fim", () => {
  assert.equal(diasAteVencimento("2026-11-19", "2026-11-19"), 1);
  assert.equal(diasAteVencimento("2026-11-20", "2026-11-19"), 2);
  assert.equal(diasAteVencimento("2026-12-19", "2026-11-19"), 31);
  assert.equal(diasAteVencimento("2026-11-18", "2026-11-19"), -1);
  assert.equal(diasAteVencimento(null, "2026-11-19"), null);
});

test("vínculo do cargo: a prefeita professora não entra no subsídio, homônimo de outro cargo também não", () => {
  assert.equal(papelDoTipo("prefeita"), "prefeito");
  assert.equal(papelDoTipo("vice"), "vice");
  assert.equal(cargoCorrespondeAoPapel("PREFEITO MUNICIPAL", "prefeito"), true);
  assert.equal(cargoCorrespondeAoPapel("VICE PREFEITO", "prefeito"), false);
  assert.equal(cargoCorrespondeAoPapel("VICE-PREFEITO", "vice"), true);
  assert.equal(cargoCorrespondeAoPapel("PROFESSOR P-IV", "prefeito"), false);
  const candidatos = [
    { id: "prof", nome: "LENIZIA ALVES CANEDO", cargo: "PROFESSOR P-IV" },
    { id: "pref", nome: "LENIZIA ALVES CANEDO", cargo: "PREFEITO MUNICIPAL" },
    { id: "outra", nome: "MARIA LENIZIA ALVES", cargo: "PREFEITO MUNICIPAL" },
  ];
  assert.deepEqual(vinculosDoCargo(candidatos, "Lenizia Alves Canedo", "prefeito"), ["pref"]);
  assert.deepEqual(vinculosDoCargo(candidatos, "Milton Justus", "vice"), []);
  // Nome inteiro, não trecho: "MARIANA SILVA" contém "ANA SILVA", mas é outra pessoa.
  assert.equal(nomesCoincidem("MARIANA SILVA", "Ana Silva"), false);
  assert.equal(nomesCoincidem("ANA SILVA FILHA", "Ana Silva"), false);
  assert.equal(nomesCoincidem("  LENÍZIA  ALVES-CANEDO ", "Lenizia Alves Canedo"), true);
  assert.equal(nomesCoincidem("ANA SILVA", ""), false);
  assert.deepEqual(vinculosDoCargo([{ id: "outra", nome: "MARIANA SILVA", cargo: "PREFEITO MUNICIPAL" }], "Ana Silva", "prefeito"), []);
});

test("subsídio: folha MENSAL mais recente, sem o adiantamento do 13º e com o reajuste de 2026-03", () => {
  const linhas = [
    { competencia: "2026-10", tipo_folha: "13º SALÁRIO ADIANTAMENTO", bruto: 14455.08 },
    { competencia: "2026-10", tipo_folha: "MENSAL", bruto: "20650.12" },
    { competencia: "2026-03", tipo_folha: "MENSAL", bruto: 20650.12 },
    { competencia: "2026-02", tipo_folha: "MENSAL", bruto: 19875 },
  ];
  assert.deepEqual(escolherSubsidio(linhas), { valor: 20650.12, competencia: "2026-10", fonteUrl: null });
  assert.deepEqual(escolherSubsidio(linhas.slice(2)), { valor: 20650.12, competencia: "2026-03", fonteUrl: null });
  assert.equal(escolherSubsidio([{ competencia: "2026-10", tipo_folha: "RESCISÃO", bruto: 5000 }]), null);
  assert.equal(escolherSubsidio([]), null);
});

test("resposta da chefia: nomes, partidos, mandato e subsídio com competência", () => {
  assert.equal(cargoComArtigo("prefeita"), "a prefeita");
  assert.equal(cargoComArtigo("vice"), "o vice-prefeito");
  assert.equal(
    montarRespostaChefia([vice, prefeita], subsidios),
    "A prefeita de Piracanjuba é Lenizia Alves Canedo (PP), no mandato de 2025 a 2028, e o vice-prefeito é Milton Justus (PDT)." +
    " Na folha mensal de outubro de 2026, o subsídio bruto da prefeita foi de R$ 20.650,12 e o do vice-prefeito, de R$ 10.260,12.",
  );
  // Competências diferentes: uma frase para cada um, cada qual com a sua.
  const separado = montarRespostaChefia([prefeita, vice], [subsidios[0], { ...subsidios[1], competencia: "2026-09" }])!;
  assert.match(separado, /outubro de 2026, o subsídio bruto da prefeita foi de R\$ 20\.650,12\./);
  assert.match(separado, /setembro de 2026, o subsídio bruto do vice-prefeito foi de R\$ 10\.260,12\./);
  // Sem folha, nenhum valor é afirmado; a data passa a ser a do cadastro.
  assert.equal(
    montarRespostaChefia([prefeita, vice], []),
    "A prefeita de Piracanjuba é Lenizia Alves Canedo (PP), no mandato de 2025 a 2028, e o vice-prefeito é Milton Justus (PDT)." +
    " Cadastro atualizado em 28 de fevereiro de 2026.",
  );
  assert.equal(montarRespostaChefia([vice], subsidios), null);
  assert.equal(montarRespostaChefia([], []), null);
});

test("respostas de servidores, contratos, despesas e secretarias saem do dado, com data", () => {
  assert.equal(
    montarRespostaServidores({ mensal: { competencia: "2026-10", bruto: 4567890.12, servidores: 1702 }, publicacaoParcial: false }),
    "Na folha mensal de outubro de 2026, a Prefeitura de Piracanjuba pagou R$ 4.567.890,12 em remuneração bruta a 1.702 vínculos de servidores.",
  );
  assert.match(
    montarRespostaServidores({ mensal: { competencia: "2026-10", bruto: null, servidores: 1 }, publicacaoParcial: true })!,
    /registrou 1 vínculo de servidor\. A publicação mais recente ainda está parcial/,
  );
  // O número é de servidor_id distintos (vínculos), não de pessoas: o texto nunca diz "N servidores".
  assert.doesNotMatch(
    montarRespostaServidores({ mensal: { competencia: "2026-10", bruto: 8335898.76, servidores: 1504 } })!,
    /\d servidores/,
  );
  assert.equal(montarRespostaServidores({ mensal: null }), null);
  assert.equal(montarRespostaServidores(null), null);

  assert.equal(
    montarRespostaContratos([
      { valor: 1000.5, vigencia_inicio: "2026-11-17", updated_at: "2026-11-18T06:10:05+00:00" },
      { valor: "2000", vigencia_inicio: "2026-09-03", updated_at: "2026-11-01T06:10:05+00:00" },
      { valor: null, vigencia_inicio: "2026-10-01", updated_at: null },
    ], 6610),
    "Esta página reúne 6.610 contratos da Prefeitura de Piracanjuba, sincronizados do portal de transparência oficial." +
    " Os 3 contratos mais recentes, com início de vigência entre 3 de setembro de 2026 e 17 de novembro de 2026, somam R$ 3.000,50 (1 sem valor informado)." +
    " Dados atualizados em 18 de novembro de 2026.",
  );
  // Sem a contagem total, o total geral não é afirmado.
  assert.doesNotMatch(montarRespostaContratos([{ valor: 10, vigencia_inicio: "2026-11-17" }], null)!, /reúne/);
  assert.equal(montarRespostaContratos([], 6610), null);
  // Nenhum valor no lote: nada de "R$ 0,00", que seria afirmar um dado que não existe.
  assert.equal(
    montarRespostaContratos([{ valor: null, vigencia_inicio: "2026-11-17" }], null),
    "O contrato mais recente, com início de vigência em 17 de novembro de 2026, não tem valor informado.",
  );
  assert.equal(
    montarRespostaContratos([{ valor: null, vigencia_inicio: null }, { valor: "", vigencia_inicio: "2026-11-17" }], null),
    "Os 2 contratos mais recentes, com início de vigência em 17 de novembro de 2026, não têm valor informado.",
  );
  // Zero gravado é valor informado.
  assert.equal(
    montarRespostaContratos([{ valor: 0, vigencia_inicio: "2026-11-17" }, { valor: null, vigencia_inicio: "2026-11-17" }], null),
    "Os 2 contratos mais recentes, com início de vigência em 17 de novembro de 2026, somam R$ 0,00 (1 sem valor informado).",
  );

  // despesas_mensais conferido no banco em 2026-11-19: as três competências mais recentes,
  // todas coletadas em 2026-11-10. Outubro, coletado 10 dias depois do fim do mês, tem pago de
  // só 39% do empenhado (mês incompleto no portal); setembro, coletado 41 dias depois, é o maduro.
  const mensais = [
    { competencia: "2026-11", valor_empenhado: 1195071.37, valor_liquidado: 1098659.67, valor_pago: 9787.49, data_coleta: "2026-11-10T06:25:01.066+00:00" },
    { competencia: "2026-10", valor_empenhado: "6609950.24", valor_liquidado: 4939277.53, valor_pago: 2575066.85, data_coleta: "2026-11-10T06:25:01.066+00:00" },
    { competencia: "2026-09", valor_empenhado: "15225864.89", valor_liquidado: "14677850.44", valor_pago: "14219391.75", data_coleta: "2026-11-10 06:25:01.066+00" },
  ];
  const setembro = escolherMesFechado(mensais, "2026-11");
  assert.equal(setembro?.competencia, "2026-09");
  assert.equal(
    montarRespostaDespesas(setembro),
    "Em setembro de 2026, a Prefeitura de Piracanjuba empenhou R$ 15.225.864,89, liquidou R$ 14.677.850,44 e pagou R$ 14.219.391,75 em despesas." +
    " Dados coletados em 10 de novembro de 2026.",
  );
  // Entre 2026-12-01 e 2026-12-09 (antes da coleta do dia 10), novembro coletado no meio do mês
  // e outubro coletado 10 dias depois do fim continuam recusados.
  assert.equal(escolherMesFechado(mensais, "2026-12")?.competencia, "2026-09");
  assert.equal(escolherMesFechado(mensais.slice(0, 2), "2026-12"), null);
  assert.equal(escolherMesFechado(mensais.slice(0, 2), "2026-11"), null);
  assert.equal(escolherMesFechado(mensais, "2026-09"), null);
  assert.equal(montarRespostaDespesas({ competencia: "2026-10", valor_empenhado: null, valor_liquidado: null, valor_pago: null }), null);

  assert.equal(
    montarRespostaSecretarias([
      { nome: "Saúde", secretario_nome: "Fulana", updated_at: "2026-03-02T17:54:08+00:00" },
      { nome: "Educação", secretario_nome: null, updated_at: "2026-01-10T10:00:00+00:00" },
    ]),
    "A Prefeitura de Piracanjuba tem 2 secretarias municipais cadastradas, 1 com secretário identificado. Cadastro atualizado em 2 de março de 2026.",
  );
  assert.equal(montarRespostaSecretarias([]), null);
});

test("mês de despesas só conta como maduro com a coleta 30 dias ou mais depois do fim, no dia de Brasília", () => {
  assert.equal(DIAS_MATURIDADE_DESPESAS, 30);
  // Outubro termina em 2026-10-31: 30 dias depois é 2026-11-30.
  assert.equal(mesMaduro("2026-10", "2026-11-30"), true);
  assert.equal(mesMaduro("2026-10", "2026-11-29"), false);
  // 02:00 UTC de 2026-11-30 ainda é 2026-11-29 em Brasília: 29 dias, não conta.
  assert.equal(mesMaduro("2026-10", "2026-11-30T02:00:00+00:00"), false);
  assert.equal(mesMaduro("2026-10", "2026-11-30T03:00:00+00:00"), true);
  // Fevereiro de 2028 (bissexto) termina em 2028-02-29.
  assert.equal(mesMaduro("2028-02", "2028-03-30"), true);
  assert.equal(mesMaduro("2028-02", "2028-03-29"), false);
  // Sem data de coleta ou competência fora do padrão, nada é afirmado.
  assert.equal(mesMaduro("2026-09", null), false);
  assert.equal(mesMaduro("2026-09", "data ruim"), false);
  assert.equal(mesMaduro("2026-9", "2026-11-10"), false);
  assert.equal(escolherMesFechado([{ competencia: "2026-09", data_coleta: null }], "2026-11"), null);
  // O mais recente entre os maduros.
  assert.equal(
    escolherMesFechado([
      { competencia: "2026-07", data_coleta: "2026-11-10" },
      { competencia: "2026-09", data_coleta: "2026-11-10" },
      { competencia: "2026-08", data_coleta: "2026-11-10" },
    ], "2026-11")?.competencia,
    "2026-09",
  );
});

test("consultarDespesasMensaisRecentes lê 6 meses, para o mês maduro estar no lote", async () => {
  assert.equal(MESES_DESPESAS_RECENTES, 6);
  // Coleta de 2026-12-10 que só regravou dezembro (as demais linhas seguem da coleta de
  // 2026-11-10): os três meses mais recentes (dezembro parcial, novembro coletado no meio do mês
  // e outubro coletado 10 dias depois do fim) não têm mês maduro. O lote de 6 ainda traz setembro.
  const competencias = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"];
  const sb = supabaseFalso({
    despesas_mensais: competencias.map((competencia) => ({
      competencia, valor_empenhado: "1", valor_liquidado: "1", valor_pago: "1", fonte_nome: null, fonte_url: null,
      data_coleta: competencia === "2026-12" ? "2026-12-10 06:25:01.066+00" : "2026-11-10 06:25:01.066+00",
    })),
  });
  const linhas = await consultarDespesasMensaisRecentes(sb as never);
  assert.deepEqual(linhas.map((l) => l.competencia), ["2026-12", "2026-11", "2026-10", "2026-09", "2026-08", "2026-07"]);
  assert.deepEqual(sb.chamadas[0].passos.slice(1), [
    ["order", ["competencia", { ascending: false }]],
    ["limit", [MESES_DESPESAS_RECENTES]],
  ]);
  assert.equal(escolherMesFechado(linhas, "2026-12")?.competencia, "2026-09");
  assert.equal(escolherMesFechado(linhas.slice(0, 3), "2026-12"), null);
});

test("nenhum texto gerado tem travessão", () => {
  const textos = [
    montarRespostaChefia([prefeita, vice], subsidios),
    montarRespostaChefia([prefeita, vice], []),
    montarRespostaServidores({ mensal: { competencia: "2026-10", bruto: 1, servidores: 2 }, publicacaoParcial: true }),
    montarRespostaContratos([{ valor: 1, vigencia_inicio: "2026-11-17", updated_at: "2026-11-18" }], 10),
    montarRespostaContratos([{ valor: null, vigencia_inicio: "2026-11-17" }], 10),
    montarRespostaDespesas({ competencia: "2026-10", valor_empenhado: 1, valor_liquidado: 2, valor_pago: 3, data_coleta: "2026-11-10" }),
    montarRespostaSecretarias([{ nome: "Saúde", secretario_nome: "Fulana", updated_at: "2026-03-02" }]),
    formatarReais(1234.5),
  ];
  for (const texto of textos) {
    assert.ok(texto);
    assert.doesNotMatch(texto, TRAVESSAO);
  }
});

test("Person da chefia só com campos que têm fonte e ligado ao @id da Prefeitura", () => {
  const orgao = { "@id": "https://piracanjuba.ai/#prefeitura", name: "Prefeitura Municipal de Piracanjuba", url: "https://piracanjuba.go.gov.br/" };
  const pessoa = pessoaExecutivoJsonLd(prefeita, { paginaUrl: "https://piracanjuba.ai/prefeitura/chefia", orgao });
  assert.equal(pessoa["@type"], "Person");
  assert.equal(pessoa["@id"], "https://piracanjuba.ai/prefeitura/chefia#titular");
  assert.equal(pessoa.name, "Lenizia Alves Canedo");
  assert.equal(pessoa.jobTitle, "Prefeita de Piracanjuba");
  assert.equal(pessoa.description, "Prefeita de Piracanjuba (GO), no mandato de 2025 a 2028.");
  assert.deepEqual(pessoa.worksFor, { "@type": "GovernmentOrganization", ...orgao });
  // O cadastro guarda caminho do site; o schema sai com URL https absoluta.
  assert.equal(pessoa.image, "https://piracanjuba.ai/images/prefeita-lenizia.webp");
  const comFotoExterna = pessoaExecutivoJsonLd({ ...prefeita, foto_url: "https://piracanjuba.go.gov.br/foto.jpg" }, { paginaUrl: "https://piracanjuba.ai/prefeitura/chefia", orgao });
  assert.equal(comFotoExterna.image, "https://piracanjuba.go.gov.br/foto.jpg");
  for (const foto of ["http://piracanjuba.go.gov.br/foto.jpg", "//cdn.test/foto.jpg", "images/foto.jpg", "   "]) {
    assert.equal("image" in pessoaExecutivoJsonLd({ ...prefeita, foto_url: foto }, { paginaUrl: "https://piracanjuba.ai/prefeitura/chefia", orgao }), false, foto);
  }
  assert.equal(fotoAbsoluta("/images/vice-milton.webp", "https://piracanjuba.ai/prefeitura/chefia"), "https://piracanjuba.ai/images/vice-milton.webp");
  assert.equal(fotoAbsoluta("/images/vice-milton.webp", "/prefeitura/chefia"), null);
  const pessoaVice = pessoaExecutivoJsonLd(vice, { paginaUrl: "https://piracanjuba.ai/prefeitura/chefia", orgao });
  assert.equal(pessoaVice["@id"], "https://piracanjuba.ai/prefeitura/chefia#vice");
  assert.equal(pessoaVice.jobTitle, "Vice-prefeito de Piracanjuba");
  assert.equal("image" in pessoaVice, false);
  // Sem salário, partido ou contato no schema: só o que o cadastro sustenta.
  assert.doesNotMatch(JSON.stringify(pessoa), /20650|telefone|PP"/);
});

test("lote do servidor: carimbo próprio, menor que qualquer busca real", () => {
  assert.equal(ehLoteInicial(MARCA_LOTE_INICIAL), true);
  assert.equal(ehLoteInicial(Date.now()), false);
  assert.equal(ehLoteInicial(0), false);
});

// ===== Equivalência com as buscas do navegador =====

const fonte = (caminho: string) => readFileSync(new URL(caminho, import.meta.url), "utf8");

test("lote de contratos usa as mesmas colunas e a mesma ordem de fetchContratos", () => {
  const api = fonte("../src/data/prefeituraApi.ts");
  const corpo = api.slice(api.indexOf("export async function fetchContratos"), api.indexOf("export async function fetchLicitacoes"));
  const cols = /const COLS = "([^"]+)"/.exec(corpo)?.[1];
  assert.equal(cols, COLUNAS_CONTRATOS);
  // Mesma coluna, direção e posição do nulo: o contrato sem início fica no fim nas duas buscas.
  assert.match(corpo, /\.order\("vigencia_inicio", \{ ascending: false, nullsFirst: false \}\)/);
  // A aba mostra 50 contratos antes do "Carregar mais": o lote do servidor tem o mesmo tamanho.
  const cliente = fonte("../src/components/prefeitura/PrefeituraClient.tsx");
  assert.match(cliente, new RegExp(`const \\[visibleCount, setVisibleCount\\] = useState\\(${LOTE_CONTRATOS}\\)`));
  assert.match(cliente, /const PAGE_SIZE = SERVIDORES_POR_PAGINA;/);
  assert.match(cliente, /queryKey: \["servidores", search, page\]/);
});

test("lote de despesas segue a ordem de fetchDespesas", () => {
  const api = fonte("../src/data/prefeituraApi.ts");
  const corpo = api.slice(api.indexOf("export async function fetchDespesas"), api.indexOf("export async function fetchContratos"));
  assert.match(corpo, /\.from\("despesas"\)\s*\.select\("\*"\)\s*\.order\("data", \{ ascending: false \}\)/);
});

// Supabase de mentira: aplica eq, ilike, in, order, limit e range sobre tabelas em memória e
// guarda as chamadas, para conferir a consulta e o resultado sem rede. Os order() somam critérios
// na ordem declarada (o primeiro manda, os seguintes desempatam), como no PostgREST, e o nulo segue
// o padrão do Postgres: último na crescente, primeiro na decrescente, salvo nullsFirst explícito.
type Linha = Record<string, unknown>;
type Resposta = { data: Linha[]; error: null; count: number | null };
type OpcoesOrdem = { ascending?: boolean; nullsFirst?: boolean };
type Construtor = {
  select(colunas: string, opcoes?: { count?: string }): Construtor;
  eq(campo: string, valor: unknown): Construtor;
  ilike(campo: string, padrao: string): Construtor;
  in(campo: string, valores: unknown[]): Construtor;
  order(campo: string, opcoes?: OpcoesOrdem): Construtor;
  limit(n: number): Construtor;
  range(de: number, ate: number): Construtor;
  then(resolver: (r: Resposta) => unknown): Promise<unknown>;
};
function compararPorCriterios(criterios: { campo: string; opcoes?: OpcoesOrdem }[]) {
  return (a: Linha, b: Linha) => {
    for (const { campo, opcoes } of criterios) {
      const crescente = opcoes?.ascending !== false;
      const nuloPrimeiro = opcoes?.nullsFirst ?? !crescente;
      const va = a[campo] ?? null;
      const vb = b[campo] ?? null;
      if (va === null || vb === null) {
        if (va === vb) continue;
        return (va === null) === nuloPrimeiro ? -1 : 1;
      }
      const diferenca = String(va) > String(vb) ? 1 : String(va) < String(vb) ? -1 : 0;
      if (diferenca !== 0) return crescente ? diferenca : -diferenca;
    }
    return 0;
  };
}
function supabaseFalso(tabelas: Record<string, Linha[]>) {
  const chamadas: { tabela: string; passos: [string, unknown[]][] }[] = [];
  const comoRegex = (padrao: string) =>
    new RegExp(`^${padrao.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`, "i");
  return {
    chamadas,
    from(tabela: string): Construtor {
      const registro = { tabela, passos: [] as [string, unknown[]][] };
      chamadas.push(registro);
      let linhas = [...(tabelas[tabela] ?? [])];
      let contar = false;
      let total: number | null = null;
      const criterios: { campo: string; opcoes?: OpcoesOrdem }[] = [];
      // Ordena só quando a página é cortada ou entregue, com todos os critérios de uma vez.
      const ordenar = () => { if (criterios.length) linhas.sort(compararPorCriterios(criterios)); };
      const construtor: Construtor = {
        select(colunas, opcoes) { registro.passos.push(["select", [colunas, opcoes]]); contar = Boolean(opcoes?.count); return construtor; },
        eq(campo, valor) { registro.passos.push(["eq", [campo, valor]]); linhas = linhas.filter((l) => l[campo] === valor); return construtor; },
        ilike(campo, padrao) { registro.passos.push(["ilike", [campo, padrao]]); linhas = linhas.filter((l) => comoRegex(padrao).test(String(l[campo] ?? ""))); return construtor; },
        in(campo, valores) { registro.passos.push(["in", [campo, valores]]); linhas = linhas.filter((l) => valores.includes(l[campo])); return construtor; },
        order(campo, opcoes) {
          registro.passos.push(["order", [campo, opcoes]]);
          criterios.push({ campo, opcoes });
          return construtor;
        },
        limit(n) { registro.passos.push(["limit", [n]]); ordenar(); linhas = linhas.slice(0, n); return construtor; },
        range(de, ate) { registro.passos.push(["range", [de, ate]]); ordenar(); total = linhas.length; linhas = linhas.slice(de, ate + 1); return construtor; },
        then(resolver) {
          ordenar();
          return Promise.resolve(resolver({ data: linhas, error: null, count: contar ? (total ?? linhas.length) : null }));
        },
      };
      return construtor;
    },
  };
}

test("consultarRemuneracaoExecutivo acha o vínculo do cargo e o subsídio mensal de cada um", async () => {
  const sb = supabaseFalso({
    servidores: [
      { id: "prof", nome: "LENIZIA ALVES CANEDO", cargo: "PROFESSOR P-IV", orgao_tipo: "prefeitura" },
      { id: "pref", nome: "LENIZIA ALVES CANEDO", cargo: "PREFEITO MUNICIPAL", orgao_tipo: "prefeitura" },
      { id: "vice", nome: "MILTON JUSTUS", cargo: "VICE PREFEITO", orgao_tipo: "prefeitura" },
      { id: "camara", nome: "MILTON JUSTUS", cargo: "VICE PREFEITO", orgao_tipo: "camara" },
    ],
    remuneracao_servidores: [
      { servidor_id: "prof", competencia: "2026-10", tipo_folha: "MENSAL", bruto: 17955.27, fonte_url: null },
      { servidor_id: "pref", competencia: "2026-10", tipo_folha: "13º SALÁRIO ADIANTAMENTO", bruto: 14455.08, fonte_url: null },
      { servidor_id: "pref", competencia: "2026-10", tipo_folha: "MENSAL", bruto: 20650.12, fonte_url: "https://fonte.test/folha" },
      { servidor_id: "pref", competencia: "2026-02", tipo_folha: "MENSAL", bruto: 19875, fonte_url: null },
      { servidor_id: "vice", competencia: "2026-10", tipo_folha: "MENSAL", bruto: 10260.12, fonte_url: null },
      { servidor_id: "camara", competencia: "2026-11", tipo_folha: "MENSAL", bruto: 99999, fonte_url: null },
    ],
  });
  const resultado = await consultarRemuneracaoExecutivo(sb as never, [
    { nome: "Lenizia Alves Canedo", tipo: "prefeita" },
    { nome: "Milton Justus", tipo: "vice" },
  ]);
  assert.deepEqual(resultado, [
    { nome: "Lenizia Alves Canedo", tipo: "prefeita", valor: 20650.12, competencia: "2026-10", fonteUrl: "https://fonte.test/folha" },
    { nome: "Milton Justus", tipo: "vice", valor: 10260.12, competencia: "2026-10", fonteUrl: null },
  ]);
  // A busca de vínculos fica na Prefeitura: o homônimo da Câmara não entra.
  const buscasServidores = sb.chamadas.filter((c) => c.tabela === "servidores");
  assert.ok(buscasServidores.every((c) => c.passos.some(([p, a]) => p === "eq" && a[0] === "orgao_tipo" && a[1] === "prefeitura")));
});

test("consultarServidoresPagina repete a busca da aba sem texto: Prefeitura, nome e id, 30 por página", async () => {
  const servidores = Array.from({ length: 35 }, (_, i) => ({ id: `id-${String(i).padStart(2, "0")}`, nome: `SERVIDOR ${String(i).padStart(2, "0")}`, orgao_tipo: "prefeitura" }));
  const sb = supabaseFalso({ servidores: [...servidores, { id: "c", nome: "A CAMARA", orgao_tipo: "camara" }] });
  const pagina = await consultarServidoresPagina(sb as never, 0);
  assert.equal(pagina.count, 35);
  assert.equal(pagina.data.length, SERVIDORES_POR_PAGINA);
  assert.equal(pagina.data[0].nome, "SERVIDOR 00");
  assert.deepEqual(sb.chamadas[0].passos, [
    ["select", ["*", { count: "exact" }]],
    ["eq", ["orgao_tipo", "prefeitura"]],
    ["order", ["nome", undefined]],
    ["order", ["id", undefined]],
    ["range", [0, SERVIDORES_POR_PAGINA - 1]],
  ]);
  // A busca do navegador (fetchServidores) ordena igual.
  assert.match(fonte("../src/data/prefeituraApi.ts"), /\.order\("nome"\)\.order\("id"\)\.range\(from, to\)/);
  // Nome manda e id só desempata: com nomes e ids em ordens opostas, ANA vem antes de ZOE.
  const cruzados = supabaseFalso({ servidores: [
    { id: "01", nome: "ZOE", orgao_tipo: "prefeitura" },
    { id: "02", nome: "ANA", orgao_tipo: "prefeitura" },
    { id: "00", nome: "ZOE", orgao_tipo: "prefeitura" },
  ] });
  const ordem = await consultarServidoresPagina<{ id: string }>(cruzados as never, 0);
  assert.deepEqual(ordem.data.map((s) => s.id), ["02", "00", "01"]);
});

test("lote de contratos: do início de vigência mais recente, contrato sem início no fim", async () => {
  const sb = supabaseFalso({ contratos: [
    { id: "sem-1", vigencia_inicio: null },
    { id: "set", vigencia_inicio: "2026-09-03" },
    { id: "sem-2", vigencia_inicio: null },
    { id: "nov", vigencia_inicio: "2026-11-17" },
  ] });
  const lote = await consultarLoteContratos<{ id: string }>(sb as never, 3);
  assert.deepEqual(lote.map((c) => c.id), ["nov", "set", "sem-1"]);
  assert.deepEqual(sb.chamadas[0].passos, [
    ["select", [COLUNAS_CONTRATOS, undefined]],
    ["order", ["vigencia_inicio", { ascending: false, nullsFirst: false }]],
    ["limit", [3]],
  ]);
});
