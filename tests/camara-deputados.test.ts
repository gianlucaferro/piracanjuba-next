import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  agruparEmendasPorDeputado,
  casarAutorComDeputado,
  consultarPerfisDeputadosFederais,
  dataDoHeader,
  ehAutorDeputadoFederal,
  extrairAutor,
  legislaturaDoAno,
  legislaturasDosAnos,
  lerDetalheDeputado,
  lerListaDeputados,
  normalizarNome,
  nucleoDoNome,
  termosDeBusca,
  type BuscarJson,
  type DeputadoListado,
  type EmendaAutor,
  type PerfilDeputadoFederal,
} from "../src/lib/camara-deputados.ts";

// Fixtures no formato da API v2 da Câmara, conferido com respostas reais em 2026-11-25
// (GET /deputados?nome=...&idLegislatura=... e GET /deputados/{id}). Nenhum teste usa rede.
const BASE = "https://dadosabertos.camara.leg.br/api/v2";
const DATE = "Wed, 25 Nov 2026 21:18:54 GMT";

const item = (id: number, nome: string, siglaUf: string, idLegislatura: number, siglaPartido = "PT") => ({
  id,
  uri: `${BASE}/deputados/${id}`,
  nome,
  siglaPartido,
  uriPartido: `${BASE}/partidos/1`,
  siglaUf,
  idLegislatura,
  urlFoto: `https://www.camara.leg.br/internet/deputado/bandep/${id}.jpg`,
  email: null,
});

const lista = (dados: unknown[], rels = ["self", "first", "last"]) => ({
  dados,
  links: rels.map((rel) => ({ rel, href: `${BASE}/deputados?pagina=1` })),
});

const detalhe = (id: number, nome: string, situacao: string, extra: Record<string, unknown> = {}) => ({
  dados: {
    id,
    uri: `${BASE}/deputados/${id}`,
    nomeCivil: "NOME CIVIL DE TESTE",
    ultimoStatus: {
      id,
      uri: `${BASE}/deputados/${id}`,
      nome,
      siglaPartido: "MDB",
      uriPartido: null,
      siglaUf: "GO",
      idLegislatura: 57,
      urlFoto: `https://www.camara.leg.br/internet/deputado/bandep/${id}.jpg`,
      email: null,
      data: "2023-02-01",
      nomeEleitoral: nome,
      gabinete: { nome: null, predio: null, sala: null, andar: null, telefone: null, email: null },
      situacao,
      condicaoEleitoral: "Titular",
      descricaoStatus: null,
      ...extra,
    },
    cpf: "00000000000",
    sexo: "F",
    dataNascimento: "1970-01-01",
    municipioNascimento: "Goiânia",
  },
  links: [{ rel: "self", href: `${BASE}/deputados/${id}` }],
});

const candidatos = (dados: ReturnType<typeof item>[]): DeputadoListado[] => lerListaDeputados(lista(dados)).itens;

test("normalização tira acento, pontuação e caixa", () => {
  assert.equal(normalizarNome("Dr. Zacharias Calil"), "DR ZACHARIAS CALIL");
  assert.equal(normalizarNome("  Lêda   Borges "), "LEDA BORGES");
  assert.equal(normalizarNome("José Nelto"), "JOSE NELTO");
  assert.equal(normalizarNome("Conceição D'Ávila"), "CONCEICAO D AVILA");
  assert.equal(normalizarNome("RUBENS OTONI"), normalizarNome("Rubens Otoni"));
});

test("núcleo do nome tira título inicial e partículas, mas nunca fica vazio", () => {
  assert.equal(nucleoDoNome("Delegada Adriana Accorsi"), "ADRIANA ACCORSI");
  assert.equal(nucleoDoNome("Glaustin da Fokus"), "GLAUSTIN FOKUS");
  assert.equal(nucleoDoNome("Dr. Zacharias Calil"), "ZACHARIAS CALIL");
  assert.equal(nucleoDoNome("Professor Alcides"), "ALCIDES");
  assert.equal(nucleoDoNome("Pastor"), "PASTOR");
});

test("autor federal chega como 'Nome (PARTIDO-UF)' e é separado", () => {
  assert.deepEqual(extrairAutor("Adriana Accorsi (PT-GO)"), { nome: "Adriana Accorsi", partido: "PT", uf: "GO" });
  assert.deepEqual(extrairAutor("Dr. Zacharias Calil (União-GO)"), { nome: "Dr. Zacharias Calil", partido: "União", uf: "GO" });
  assert.deepEqual(extrairAutor("Fulano de Tal (PCdoB/SP)"), { nome: "Fulano de Tal", partido: "PCdoB", uf: "SP" });
  assert.deepEqual(extrairAutor("Fulano de Tal (GO)"), { nome: "Fulano de Tal", partido: null, uf: "GO" });
  assert.deepEqual(extrairAutor("Fulano de Tal (PL-ZZ)"), { nome: "Fulano de Tal", partido: "PL-ZZ", uf: null });
  assert.deepEqual(extrairAutor("Amauri Ribeiro"), { nome: "Amauri Ribeiro", partido: null, uf: null });
});

test("só deputado federal vai para a Câmara: estadual, senador e bancada ficam de fora", () => {
  assert.equal(ehAutorDeputadoFederal({ parlamentar_nome: "Rubens Otoni (PT-GO)", parlamentar_esfera: "federal" }), true);
  assert.equal(ehAutorDeputadoFederal({ parlamentar_nome: "Rubens Otoni (PT-GO)", parlamentar_esfera: " Federal " }), true);
  assert.equal(ehAutorDeputadoFederal({ parlamentar_nome: "Amauri Ribeiro", parlamentar_esfera: "estadual" }), false);
  assert.equal(ehAutorDeputadoFederal({ parlamentar_nome: "Amauri Ribeiro", parlamentar_esfera: null }), false);
  assert.equal(ehAutorDeputadoFederal({ parlamentar_nome: "Senador Fulano (PSD-GO)", parlamentar_esfera: "federal" }), false);
  assert.equal(ehAutorDeputadoFederal({ parlamentar_nome: "Bancada de Goiás", parlamentar_esfera: "federal" }), false);
});

test("legislaturas: emenda do ano Y consulta a legislatura de Y-1 e a de Y", () => {
  assert.equal(legislaturaDoAno(2018), 55);
  assert.equal(legislaturaDoAno(2019), 56);
  assert.equal(legislaturaDoAno(2022), 56);
  assert.equal(legislaturaDoAno(2023), 57);
  assert.equal(legislaturaDoAno(2027), 58);
  assert.equal(legislaturaDoAno(1500), null);
  assert.deepEqual(legislaturasDosAnos([2023]), [56, 57]);
  assert.deepEqual(legislaturasDosAnos([2025, 2024]), [57]);
  assert.deepEqual(legislaturasDosAnos([2022, 2025]), [56, 57]);
});

test("termo de busca é o maior pedaço do núcleo, com o núcleo inteiro de reserva", () => {
  assert.deepEqual(termosDeBusca("Glaustin Fokus"), ["GLAUSTIN", "GLAUSTIN FOKUS"]);
  assert.deepEqual(termosDeBusca("Delegado Waldir"), ["WALDIR"]);
  assert.deepEqual(termosDeBusca("Dr. Zacharias Calil"), ["ZACHARIAS", "ZACHARIAS CALIL"]);
  assert.deepEqual(termosDeBusca("Zé"), []);
});

test("casa pelo nome igual, inclusive com variantes antigas do mesmo deputado", () => {
  const glaustin = candidatos([
    item(204419, "Glaustin da Fokus", "GO", 56, "PSC"),
    item(204419, "Glaustin da Fokus", "GO", 57, "PODE"),
    item(204419, "Glaustin Fokus", "GO", 56, "PSC"),
  ]);
  assert.deepEqual(casarAutorComDeputado("Glaustin Fokus (PODE-GO)", glaustin), { id: 204419, criterio: "nome" });
});

test("casa sem o título quando a emenda omite 'Delegada'", () => {
  const busca = candidatos([item(220565, "Delegada Adriana Accorsi", "GO", 57), item(999001, "Adriana Ventura", "SP", 57)]);
  assert.deepEqual(casarAutorComDeputado("Adriana Accorsi (PT-GO)", busca), { id: 220565, criterio: "nome_sem_titulo" });
});

test("nome igual vence o núcleo: 'Professor Alcides' não vira 'Alcides Rodrigues'", () => {
  const busca = candidatos([item(204390, "Professor Alcides", "GO", 57, "PL"), item(204413, "Alcides Rodrigues", "GO", 56, "PRB")]);
  assert.deepEqual(casarAutorComDeputado("Professor Alcides (PL-GO)", busca), { id: 204390, criterio: "nome" });
});

test("núcleo de um pedaço só não casa: 'Delegado Waldir' não vira 'Coronel Waldir'", () => {
  const busca = candidatos([item(999002, "Coronel Waldir", "GO", 57)]);
  assert.equal(casarAutorComDeputado("Delegado Waldir (União-GO)", busca), null);
});

test("homônimos: sem UF na emenda prefere GO; com UF exige a mesma UF", () => {
  const busca = candidatos([item(1, "Maria Silva", "SP", 57), item(2, "Maria Silva", "GO", 56)]);
  assert.deepEqual(casarAutorComDeputado("Maria Silva", busca), { id: 2, criterio: "nome" });
  assert.deepEqual(casarAutorComDeputado("Maria Silva (PT-GO)", busca), { id: 2, criterio: "nome" });
  assert.deepEqual(casarAutorComDeputado("Maria Silva (PT-SP)", busca), { id: 1, criterio: "nome" });
  const soSp = candidatos([item(1, "Maria Silva", "SP", 57)]);
  assert.equal(casarAutorComDeputado("Maria Silva (PT-GO)", soSp), null);
});

test("continua ambíguo depois da UF: não associa", () => {
  const busca = candidatos([item(1, "Maria Silva", "GO", 56), item(2, "Maria Silva", "GO", 57)]);
  assert.equal(casarAutorComDeputado("Maria Silva (PT-GO)", busca), null);
  assert.equal(casarAutorComDeputado("Maria Silva", busca), null);
  assert.equal(casarAutorComDeputado("Maria Silva", []), null);
});

test("lista da Câmara: formato validado e paginação detectada", () => {
  const pagina = lerListaDeputados(lista([item(160598, "Flávia Morais", "GO", 57, "MDB")]));
  assert.deepEqual(pagina, {
    itens: [{ id: 160598, nome: "Flávia Morais", siglaUf: "GO", idLegislatura: 57 }],
    temProximaPagina: false,
  });
  assert.equal(lerListaDeputados(lista([], ["self", "next", "last"])).temProximaPagina, true);
  const cheia = Array.from({ length: 100 }, (_, i) => item(1000 + i, `Deputado ${i}`, "SP", 57));
  assert.equal(lerListaDeputados(lista(cheia)).temProximaPagina, true);

  assert.throws(() => lerListaDeputados(null));
  assert.throws(() => lerListaDeputados({ dados: "x" }));
  assert.throws(() => lerListaDeputados(lista([{ ...item(1, "A B", "GO", 57), id: "1" }])));
  assert.throws(() => lerListaDeputados(lista([{ ...item(1, "", "GO", 57) }])));
  assert.throws(() => lerListaDeputados(lista([{ ...item(1, "A B", "XX", 57) }])));
  assert.throws(() => lerListaDeputados(lista([{ ...item(1, "A B", "GO", 57), idLegislatura: 5.5 }])));
});

test("detalhe da Câmara: devolve só os campos exibidos, sem CPF nem dados pessoais", () => {
  const perfil = lerDetalheDeputado(detalhe(160598, "Flávia Morais", "Exercício"), 160598);
  assert.deepEqual(perfil, {
    id: 160598,
    nome: "Flávia Morais",
    partido: "MDB",
    uf: "GO",
    situacao: "Exercício",
    emExercicio: true,
    urlFoto: "https://www.camara.leg.br/internet/deputado/bandep/160598.jpg",
    urlPerfil: "https://www.camara.leg.br/deputados/160598",
  });
  assert.doesNotMatch(JSON.stringify(perfil), /cpf|00000000000|1970|nomeCivil/i);

  const fora = lerDetalheDeputado(detalhe(164359, "Delegado Waldir", "Fim de Mandato", { siglaPartido: "UNIÃO" }), 164359);
  assert.equal(fora.emExercicio, false);
  assert.equal(fora.situacao, "Fim de Mandato");
  assert.equal(fora.partido, "UNIÃO");

  // Foto fora do domínio da Câmara, ou sem HTTPS, não é exibida.
  assert.equal(lerDetalheDeputado(detalhe(1, "A B", "Exercício", { urlFoto: "https://exemplo.com/a.jpg" }), 1).urlFoto, null);
  assert.equal(lerDetalheDeputado(detalhe(1, "A B", "Exercício", { urlFoto: "http://www.camara.leg.br/a.jpg" }), 1).urlFoto, null);
  assert.equal(lerDetalheDeputado(detalhe(1, "A B", "Exercício", { urlFoto: "https://camara.leg.br.exemplo.com/a.jpg" }), 1).urlFoto, null);
  // Sigla com caractere inesperado some; o restante do perfil continua.
  assert.equal(lerDetalheDeputado(detalhe(1, "A B", "Exercício", { siglaPartido: "<b>X</b>" }), 1).partido, null);
  // Sem nome eleitoral, usa o nome.
  assert.equal(lerDetalheDeputado(detalhe(1, "A B", "Exercício", { nomeEleitoral: null }), 1).nome, "A B");

  assert.throws(() => lerDetalheDeputado(detalhe(2, "A B", "Exercício"), 1), /id diferente/);
  assert.throws(() => lerDetalheDeputado({ dados: { id: 1 } }, 1));
  assert.throws(() => lerDetalheDeputado({ dados: { id: 1, ultimoStatus: { nome: "", nomeEleitoral: null } } }, 1));
  assert.throws(() => lerDetalheDeputado([], 1));
});

test("header Date vira data de Brasília", () => {
  assert.equal(dataDoHeader(DATE), "2026-11-25");
  // 01:30 UTC de 2026-11-26 ainda é 2026-11-25 em Brasília.
  assert.equal(dataDoHeader("Thu, 26 Nov 2026 01:30:00 GMT"), "2026-11-25");
  assert.equal(dataDoHeader("ontem"), null);
  assert.equal(dataDoHeader(null), null);
});

const EMENDAS: EmendaAutor[] = [
  { parlamentar_nome: "Adriana Accorsi (PT-GO)", parlamentar_esfera: "federal", ano: 2025, valor_empenhado: 200000, valor_pago: 200000 },
  { parlamentar_nome: "Adriana Accorsi (PT-GO)", parlamentar_esfera: "federal", ano: 2023, valor_empenhado: 100000, valor_pago: 100000 },
  { parlamentar_nome: "Delegado Waldir (União-GO)", parlamentar_esfera: "federal", ano: 2022, valor_empenhado: 150000, valor_pago: 150000 },
  { parlamentar_nome: "Fulano Inexistente (PL-GO)", parlamentar_esfera: "federal", ano: 2025, valor_empenhado: 50000, valor_pago: 0 },
  { parlamentar_nome: "Amauri Ribeiro", parlamentar_esfera: "estadual", ano: 2025, valor_empenhado: 90000, valor_pago: 90000 },
  { parlamentar_nome: "Senador Fulano (PSD-GO)", parlamentar_esfera: "federal", ano: 2025, valor_empenhado: 10, valor_pago: 10 },
];

function fakeCamara(rotas: Record<string, unknown | Error>) {
  const pedidos: string[] = [];
  const buscarJson: BuscarJson = async (url) => {
    pedidos.push(url);
    const parsed = new URL(url);
    const chave = parsed.pathname.endsWith("/deputados") ? `busca:${parsed.searchParams.get("nome")}` : `detalhe:${parsed.pathname.split("/").pop()}`;
    const resposta = rotas[chave];
    if (resposta === undefined) throw new Error(`rota não prevista: ${chave}`);
    if (resposta instanceof Error) throw resposta;
    return { json: resposta, data: DATE };
  };
  return { buscarJson, pedidos };
}

test("consulta completa: associa por nome, ignora estaduais e senadores e guarda a data", async () => {
  const { buscarJson, pedidos } = fakeCamara({
    "busca:ADRIANA": lista([item(220565, "Delegada Adriana Accorsi", "GO", 57), item(999001, "Adriana Ventura", "SP", 57)]),
    "busca:WALDIR": lista([item(164359, "Delegado Waldir", "GO", 56, "PSL"), item(164359, "Delegado Waldir", "GO", 56, "UNIÃO")]),
    "busca:INEXISTENTE": lista([], ["self"]),
    "detalhe:220565": detalhe(220565, "Delegada Adriana Accorsi", "Exercício", { siglaPartido: "PT" }),
    "detalhe:164359": detalhe(164359, "Delegado Waldir", "Fim de Mandato", { siglaPartido: "UNIÃO", idLegislatura: 56 }),
  });
  const resultado = await consultarPerfisDeputadosFederais(EMENDAS, { buscarJson });

  assert.equal(resultado.status, "ok");
  assert.equal(resultado.consultadoEm, "2026-11-25");
  assert.deepEqual(Object.keys(resultado.perfis).sort(), ["Adriana Accorsi (PT-GO)", "Delegado Waldir (União-GO)"]);
  assert.equal(resultado.perfis["Adriana Accorsi (PT-GO)"].nome, "Delegada Adriana Accorsi");
  assert.equal(resultado.perfis["Delegado Waldir (União-GO)"].emExercicio, false);
  assert.deepEqual(resultado.semPerfil, ["Fulano Inexistente (PL-GO)"]);

  // Waldir (emenda de 2022) é procurado na legislatura 56; Adriana (2023 e 2025), na 56 e na 57.
  const busca = (termo: string) => new URL(pedidos.find((url) => url.includes(`nome=${termo}&`)) as string);
  assert.equal(busca("WALDIR").origin + busca("WALDIR").pathname, `${BASE}/deputados`);
  assert.deepEqual(busca("WALDIR").searchParams.getAll("idLegislatura"), ["56"]);
  assert.deepEqual(busca("ADRIANA").searchParams.getAll("idLegislatura"), ["56", "57"]);
  assert.equal(busca("WALDIR").searchParams.get("itens"), "100");
  // Estadual e senador nunca vão para a Câmara.
  assert.equal(pedidos.some((url) => /AMAURI|SENADOR/i.test(url)), false);
  assert.equal(pedidos.length, 5);
});

test("Câmara fora do ar: nenhuma exceção, status indisponível e todos sem perfil", async () => {
  const buscarJson: BuscarJson = async () => {
    throw new Error("timeout");
  };
  const resultado = await consultarPerfisDeputadosFederais(EMENDAS, { buscarJson });
  assert.deepEqual(resultado, {
    status: "indisponivel",
    perfis: {},
    semPerfil: ["Adriana Accorsi (PT-GO)", "Delegado Waldir (União-GO)", "Fulano Inexistente (PL-GO)"],
    consultadoEm: null,
  });
});

test("JSON fora do formato em parte das respostas: status parcial, sem perfil só naquele autor", async () => {
  const { buscarJson } = fakeCamara({
    "busca:ADRIANA": lista([item(220565, "Delegada Adriana Accorsi", "GO", 57)]),
    "busca:WALDIR": { dados: [{ id: "164359", nome: "Delegado Waldir" }] },
    "busca:INEXISTENTE": new Error("HTTP 503"),
    "detalhe:220565": detalhe(220565, "Delegada Adriana Accorsi", "Exercício"),
  });
  const resultado = await consultarPerfisDeputadosFederais(EMENDAS, { buscarJson });
  assert.equal(resultado.status, "parcial");
  assert.deepEqual(Object.keys(resultado.perfis), ["Adriana Accorsi (PT-GO)"]);
  assert.deepEqual(resultado.semPerfil, ["Delegado Waldir (União-GO)", "Fulano Inexistente (PL-GO)"]);
});

test("detalhe inválido tira o perfil: id trocado na resposta não vira foto de outra pessoa", async () => {
  const { buscarJson } = fakeCamara({
    "busca:ADRIANA": lista([item(220565, "Delegada Adriana Accorsi", "GO", 57)]),
    "busca:WALDIR": lista([]),
    "busca:INEXISTENTE": lista([]),
    "detalhe:220565": detalhe(111111, "Outra Pessoa", "Exercício"),
  });
  const resultado = await consultarPerfisDeputadosFederais(EMENDAS, { buscarJson });
  assert.equal(resultado.status, "parcial");
  assert.deepEqual(resultado.perfis, {});
});

test("busca paginada não é usada para casar: tenta o núcleo inteiro e, se continuar paginada, desiste", async () => {
  const cheia = lista([item(5, "Maria Silva Souza", "GO", 57)], ["self", "next", "last"]);
  const { buscarJson, pedidos } = fakeCamara({
    "busca:MARIA": cheia,
    "busca:MARIA SILVA SOUZA": lista([item(5, "Maria Silva Souza", "GO", 57)]),
    "detalhe:5": detalhe(5, "Maria Silva Souza", "Exercício"),
  });
  const emendas: EmendaAutor[] = [{ parlamentar_nome: "Maria Silva Souza (PT-GO)", parlamentar_esfera: "federal", ano: 2025 }];
  const resultado = await consultarPerfisDeputadosFederais(emendas, { buscarJson });
  assert.equal(resultado.perfis["Maria Silva Souza (PT-GO)"]?.id, 5);
  assert.equal(pedidos.length, 3);

  const { buscarJson: sempreCheia } = fakeCamara({ "busca:MARIA": cheia, "busca:MARIA SILVA SOUZA": cheia });
  const semCasar = await consultarPerfisDeputadosFederais(emendas, { buscarJson: sempreCheia });
  assert.equal(semCasar.status, "ok");
  assert.deepEqual(semCasar.semPerfil, ["Maria Silva Souza (PT-GO)"]);
});

test("sem autor federal, não consulta a Câmara", async () => {
  const { buscarJson, pedidos } = fakeCamara({});
  const resultado = await consultarPerfisDeputadosFederais(EMENDAS.filter((e) => e.parlamentar_esfera !== "federal"), { buscarJson });
  assert.equal(resultado.status, "sem_autores");
  assert.equal(pedidos.length, 0);
});

test("agrupa por deputado da Câmara, soma totais e separa os federais sem perfil", () => {
  const perfil: PerfilDeputadoFederal = {
    id: 204419,
    nome: "Glaustin da Fokus",
    partido: "PODE",
    uf: "GO",
    situacao: "Exercício",
    emExercicio: true,
    urlFoto: null,
    urlPerfil: "https://www.camara.leg.br/deputados/204419",
  };
  const emendas: EmendaAutor[] = [
    { parlamentar_nome: "Glaustin Fokus (PODE-GO)", parlamentar_esfera: "federal", ano: 2025, valor_empenhado: 150000, valor_pago: 150000 },
    { parlamentar_nome: "Glaustin da Fokus (PSC-GO)", parlamentar_esfera: "federal", ano: 2022, valor_empenhado: 100000, valor_pago: 50000 },
    { parlamentar_nome: "Fulano Inexistente (PL-GO)", parlamentar_esfera: "federal", ano: 2025, valor_empenhado: 50000, valor_pago: 0 },
    { parlamentar_nome: "Amauri Ribeiro", parlamentar_esfera: "estadual", ano: 2025, valor_empenhado: 90000, valor_pago: 90000 },
  ];
  const { grupos, semPerfil } = agruparEmendasPorDeputado(emendas, {
    "Glaustin Fokus (PODE-GO)": perfil,
    "Glaustin da Fokus (PSC-GO)": perfil,
  });
  assert.equal(grupos.length, 1);
  assert.deepEqual(grupos[0], {
    perfil,
    nomesNaEmenda: ["Glaustin da Fokus (PSC-GO)", "Glaustin Fokus (PODE-GO)"],
    totalEmpenhado: 250000,
    totalPago: 200000,
    quantidade: 2,
  });
  assert.deepEqual(semPerfil, [{ nome: "Fulano Inexistente (PL-GO)", totalEmpenhado: 50000, totalPago: 0, quantidade: 1 }]);
  // Chave herdada do protótipo não vira perfil.
  assert.equal(agruparEmendasPorDeputado([{ parlamentar_nome: "toString", parlamentar_esfera: "federal", ano: 2025 }], {}).semPerfil.length, 1);
});

test("camada de dados consulta no servidor com cache de 24 h, timeout e origem fixa fora do e2e", () => {
  const fonte = readFileSync(new URL("../src/lib/data/camara-deputados.ts", import.meta.url), "utf8");
  assert.match(fonte, /^import "server-only";/);
  assert.match(fonte, /signal: AbortSignal\.any\(\[AbortSignal\.timeout\(CAMARA_TIMEOUT_MS\), prazo\]\)/);
  assert.match(fonte, /criarBuscarJson\(AbortSignal\.timeout\(CAMARA_PRAZO_TOTAL_MS\)\)/);
  assert.match(fonte, /next: \{ revalidate: CAMARA_REVALIDATE_SECONDS/);
  assert.match(fonte, /redirect: "error"/);
  assert.match(fonte, /process\.env\.PIRACANJUBA_E2E === "1" \? process\.env\.CAMARA_API_BASE_URL/);
  const pagina = readFileSync(new URL("../src/app/emendas/page.tsx", import.meta.url), "utf8");
  assert.match(pagina, /await fetchPerfisDeputadosFederais\(nominais\)/);
});
