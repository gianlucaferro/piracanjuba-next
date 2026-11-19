import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SUFIXO_TITULO } from "../src/lib/abas-orgaos.ts";
import {
  MAX_IDADE_LEITURA_MS,
  carregarDadosClima,
  diaDaSemana,
  formatarChuva,
  hojeEmBrasilia,
  inicioDoMes,
  instanteDaLeitura,
  janelaDiasEncerrados,
  lerClimaAgora,
  meioDiaEmBrasilia,
  montarPainelClima,
  nomeMes,
  periodoMesEncerrado,
  respostaClima,
  resumoMesTemDado,
  rotuloChuvaHoje,
  rotuloSeloClima,
  somarDias,
  ultimoDiaEncerrado,
  type ClimaDiaLinha,
} from "../src/lib/clima-painel.ts";
import { summarizeRainRisk } from "../src/lib/climate-rain-risk.ts";

const TRAVESSOES = /[–—]/;

function linha(data: string, max: unknown, min: unknown, chuva: unknown, atual: unknown = null): ClimaDiaLinha & { atual: unknown } {
  return {
    data,
    temperatura_max: max,
    temperatura_min: min,
    temperatura_media: 23,
    precipitacao_mm: chuva,
    umidade_media: 88,
    vento_velocidade_max: 12,
    atual,
  };
}

// Recorte real de inmet_clima_diario em 2026-11-19 às 01:21 de Brasília: a linha de hoje traz a
// leitura atual e as seis seguintes são previsão (o selo da home mostrava 2026-11-23 como atual).
const LINHAS = [
  linha("2026-11-18", "28.3", "19.2", "4.7"),
  linha("2026-11-19", "29.4", "20.2", "9.3", { time: "2026-11-19T01:15", temperature: 21.1, humidity: 95, precipitation: 0, wind: 8.8 }),
  linha("2026-11-20", "29.7", "19.7", "8.7"),
  linha("2026-11-21", "29", "20.6", "19.3"),
  linha("2026-11-22", "29.5", "20.1", "19"),
  linha("2026-11-23", "28.4", "20.5", "11.4"),
  linha("2026-11-24", "27.6", "21.2", "12"),
  linha("2026-11-25", "29.9", "21", "10"),
];
// Instante do recorte acima, usado como referência da consulta.
const REF = new Date("2026-11-19T01:21:00-03:00");

test("hoje é a data de Brasília, não a de UTC", () => {
  assert.equal(hojeEmBrasilia(new Date("2026-11-19T04:21:00Z")), "2026-11-19");
  // 23:30 de Brasília em 2026-11-19 já é 2026-11-20 em UTC.
  assert.equal(hojeEmBrasilia(new Date("2026-11-20T02:30:00Z")), "2026-11-19");
});

test("datas: soma de dias, janela dos últimos N dias encerrados e início do mês", () => {
  assert.equal(somarDias("2026-11-30", 1), "2026-12-01");
  assert.equal(somarDias("2026-03-01", -1), "2026-02-28");
  // A linha de hoje soma a chuva já calculada com a prevista para o resto do dia: as janelas
  // de registro param em ontem.
  assert.equal(ultimoDiaEncerrado("2026-11-19"), "2026-11-18");
  assert.equal(ultimoDiaEncerrado("2026-12-01"), "2026-11-30");
  assert.deepEqual(janelaDiasEncerrados("2026-11-19", 30), { inicio: "2026-10-20", fim: "2026-11-18" });
  assert.deepEqual(janelaDiasEncerrados("2026-11-19", 7), { inicio: "2026-11-12", fim: "2026-11-18" });
  assert.deepEqual(janelaDiasEncerrados("2026-11-19", 1), { inicio: "2026-11-18", fim: "2026-11-18" });
  assert.equal(inicioDoMes("2026-11-19"), "2026-11-01");
  assert.deepEqual(periodoMesEncerrado("2026-11-19"), { inicio: "2026-11-01", fim: "2026-11-18" });
  assert.deepEqual(periodoMesEncerrado("2026-11-02"), { inicio: "2026-11-01", fim: "2026-11-01" });
  // No dia 1 ainda não há dia encerrado no mês: sem período, em vez de somar só a previsão.
  assert.equal(periodoMesEncerrado("2026-12-01"), null);
  assert.equal(nomeMes("2026-11-19"), "novembro de 2026");
  assert.equal(diaDaSemana("2026-11-19"), "quinta-feira");
  assert.equal(diaDaSemana("2026-11-22"), "domingo");
});

test("painel separa leitura atual, dia de hoje e previsão", () => {
  const painel = montarPainelClima(LINHAS, "2026-11-19", REF);
  assert.deepEqual(painel.agora, { data: "2026-11-19", hora: "01:15", temperatura: 21.1, umidade: 95, precipitacao: 0, vento: 8.8 });
  assert.equal(painel.diaHoje?.data, "2026-11-19");
  assert.equal(painel.diaHoje?.temperatura_max, 29.4);
  assert.deepEqual(painel.previsao.map((d) => d.data), ["2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23", "2026-11-24", "2026-11-25"]);
  assert.ok(painel.previsao.every((d) => d.data > painel.hoje), "previsão só tem datas depois de hoje");
});

test("leitura gravada na linha de amanhã (21h às 24h de Brasília) continua sendo de hoje", () => {
  const linhas = [
    linha("2026-11-19", 29, 20, 3),
    linha("2026-11-20", 30, 20, 8, { time: "2026-11-19T22:15", temperature: 23.4, humidity: 80, precipitation: 0, wind: 5 }),
    linha("2026-11-21", 29, 21, 19),
  ];
  const painel = montarPainelClima(linhas, "2026-11-19", new Date("2026-11-19T22:20:00-03:00"));
  assert.equal(painel.agora?.data, "2026-11-19");
  assert.equal(painel.agora?.hora, "22:15");
  assert.equal(painel.diaHoje?.data, "2026-11-19");
  assert.deepEqual(painel.previsao.map((d) => d.data), ["2026-11-20", "2026-11-21"]);
});

test("leitura velha, futura ou sem temperatura não vira tempo atual", () => {
  const velha = montarPainelClima([linha("2026-11-19", 29, 20, 3, { time: "2026-11-15T10:00", temperature: 25 })], "2026-11-19", REF);
  assert.equal(velha.agora, null);
  const futura = montarPainelClima([linha("2026-11-20", 29, 20, 3, { time: "2026-11-20T10:00", temperature: 25 })], "2026-11-19", REF);
  assert.equal(futura.agora, null);
  assert.equal(lerClimaAgora({ time: "2026-11-19T10:00" }), null);
  assert.equal(lerClimaAgora({ temperature: 20 }), null);
  assert.equal(lerClimaAgora(null), null);
  assert.equal(lerClimaAgora("2026-11-19T10:00"), null);
});

test("a leitura mais recente vence quando há duas", () => {
  const linhas = [
    linha("2026-11-18", 28, 19, 4, { time: "2026-11-18T23:45", temperature: 22 }),
    linha("2026-11-19", 29, 20, 9, { time: "2026-11-19T00:15", temperature: 21 }),
  ];
  assert.equal(montarPainelClima(linhas, "2026-11-19", new Date("2026-11-19T00:20:00-03:00")).agora?.hora, "00:15");
});

test("leitura de ontem só vale perto da meia-noite: com a sincronização parada, o painel cai na previsão", () => {
  // Cenário da revisão do PR 56: a sincronização parou depois de 2026-11-18 às 23:45 (gravada na
  // linha do dia UTC, 2026-11-19).
  const linhas = [
    linha("2026-11-18", 28, 19, 4),
    linha("2026-11-19", 29, 20, 9, { time: "2026-11-18T23:45", temperature: 22 }),
  ];
  // 00:20 do dia seguinte, 35 minutos depois: ainda é a leitura atual.
  const logoDepois = montarPainelClima(linhas, "2026-11-19", new Date("2026-11-19T00:20:00-03:00"));
  assert.equal(logoDepois.agora?.hora, "23:45");
  assert.equal(rotuloSeloClima(logoDepois), "2026-11-18 às 23:45");
  // 23:30 de 2026-11-19, quase 24 horas depois: não vira "tempo agora"; o selo usa a previsão do dia.
  const fimDoDia = montarPainelClima(linhas, "2026-11-19", new Date("2026-11-19T23:30:00-03:00"));
  assert.equal(fimDoDia.agora, null);
  assert.equal(rotuloSeloClima(fimDoDia), "Previsão para 2026-11-19");
  assert.equal(fimDoDia.diaHoje?.temperatura_max, 29);
  assert.doesNotMatch(respostaClima(fimDoDia, null), /a temperatura era/);
});

test("idade máxima da leitura atual: 2 horas, contadas no horário de Brasília", () => {
  assert.equal(instanteDaLeitura({ data: "2026-11-18", hora: "23:45" }).toISOString(), "2026-11-19T02:45:00.000Z");
  assert.equal(MAX_IDADE_LEITURA_MS, 2 * 60 * 60 * 1000);
  const linhas = [linha("2026-11-19", 29, 20, 9, { time: "2026-11-19T10:00", temperature: 25 })];
  const instante = new Date("2026-11-19T10:00:00-03:00").getTime();
  assert.equal(montarPainelClima(linhas, "2026-11-19", new Date(instante + MAX_IDADE_LEITURA_MS)).agora?.hora, "10:00");
  assert.equal(montarPainelClima(linhas, "2026-11-19", new Date(instante + MAX_IDADE_LEITURA_MS + 60_000)).agora, null);
});

test("o painel é montado fora do cache, com o instante da consulta", () => {
  // O cache guarda as linhas por até 15 minutos (e serve a versão velha enquanto revalida):
  // a idade da leitura é medida na hora da consulta, não na hora em que o cache foi preenchido.
  const dados = readFileSync(new URL("../src/lib/data/clima.ts", import.meta.url), "utf8");
  assert.match(dados, /montarPainelClima\(await climaPainelLinhasCache\(hoje\), hoje, referencia\)/);
  assert.match(dados, /const hoje = hojeEmBrasilia\(referencia\)/);
});

test("/clima: a falha de uma busca não apaga as outras", async () => {
  const dias = [{ data: "2026-11-18" }];
  const resumo = { acumulado_mm: 161.6, dias_com_chuva: 12, temperatura_media: 23.1, temperatura_max_absoluta: 31.5, temperatura_min_absoluta: 18.2 };
  const painelVazio = { hoje: "2026-11-19", agora: null, diaHoje: null, previsao: [] };
  const falha = () => Promise.reject(new Error("Falha ao ler o painel de clima"));

  // Cenário da revisão do PR 56: o painel falha, a série e o resumo do mês continuam.
  const semPainel = await carregarDadosClima({ serieDias: async () => dias, resumoMes: async () => resumo, painel: falha }, "2026-11-19");
  assert.deepEqual(semPainel, { dias, resumo, painel: painelVazio });

  // Erro síncrono também conta como falha só daquela busca.
  const painel = montarPainelClima(LINHAS, "2026-11-19", REF);
  const semSerie = await carregarDadosClima(
    { serieDias: falha, resumoMes: () => { throw new Error("variáveis ausentes"); }, painel: async () => painel },
    "2026-11-19",
  );
  assert.deepEqual(semSerie.dias, []);
  assert.equal(semSerie.resumo, null);
  assert.equal(semSerie.painel, painel);

  // Tudo falhou: valores vazios, e a página mostra o aviso de falta de dados.
  assert.deepEqual(await carregarDadosClima({ serieDias: falha, resumoMes: falha, painel: falha }, "2026-11-19"), {
    dias: [],
    resumo: null,
    painel: painelVazio,
  });

  const pagina = readFileSync(new URL("../src/app/clima/page.tsx", import.meta.url), "utf8");
  assert.match(pagina, /carregarDadosClima\(/);
  assert.doesNotMatch(pagina, /Promise\.all\(/);
});

test("selo da home: sem leitura atual, o celular vê que a temperatura é a máxima prevista", () => {
  const selo = readFileSync(new URL("../src/components/clima/ClimaHeroBadge.tsx", import.meta.url), "utf8");
  // Abaixo de sm o rótulo "Previsão para ..." e os detalhes ficam ocultos (hidden sm:...): o
  // qualificador da temperatura precisa estar visível ali.
  const m = selo.match(/\{!agora && <span className="([^"]*)">\s*máx\. prevista<\/span>\}/);
  assert.ok(m, "qualificador da máxima prevista não encontrado no selo");
  const classes = m[1].split(/\s+/);
  assert.ok(!classes.includes("sr-only") && !classes.includes("hidden"), `qualificador oculto no celular: ${m[1]}`);
  assert.ok(classes.includes("sm:sr-only"), "do sm para cima o rótulo visível já diz que é previsão");
});

test("parágrafo-resposta de /clima traz números, datas absolutas e fonte", () => {
  const painel = montarPainelClima(LINHAS, "2026-11-19", REF);
  const resumo = { acumulado_mm: 161.6, dias_com_chuva: 12, temperatura_media: 23.1, temperatura_max_absoluta: 31.5, temperatura_min_absoluta: 18.2 };
  const texto = respostaClima(painel, resumo);
  assert.equal(
    texto,
    "Previsão do tempo em Piracanjuba (GO) para hoje, quinta-feira, 2026-11-19: máxima de 29°C, mínima de 20°C e 9,3 mm de chuva. " +
      "Para amanhã, sexta-feira, 2026-11-20, a previsão é de máxima de 30°C, mínima de 20°C e 8,7 mm de chuva. " +
      "Às 01:15 de 2026-11-19 (horário de Brasília), a temperatura era de 21°C, com umidade de 95%. " +
      "Em novembro de 2026, de 2026-11-01 a 2026-11-18 (dias já encerrados), a chuva somou 161,6 mm em 12 dias com chuva. " +
      "Fonte: Open-Meteo, com atualização a cada 15 minutos.",
  );
  assert.doesNotMatch(texto, TRAVESSOES);
  // Nenhuma data de previsão além de amanhã aparece como dado do texto.
  assert.doesNotMatch(texto, /2026-11-2[1-5]/);
  // A chuva de hoje (9,3 mm, quase toda previsão de madrugada) não é dita como chuva que caiu.
  assert.doesNotMatch(texto, /parcial/);
  assert.doesNotMatch(texto, /a 2026-11-19, a chuva somou/);
});

test("no dia 1 do mês o parágrafo não afirma chuva do mês (só haveria a previsão de hoje)", () => {
  const painel = montarPainelClima([linha("2026-12-01", 30, 20, 9.3)], "2026-12-01", new Date("2026-12-01T10:00:00-03:00"));
  const resumoSoComHoje = { acumulado_mm: 9.3, dias_com_chuva: 1, temperatura_media: 25, temperatura_max_absoluta: 30, temperatura_min_absoluta: 20 };
  const texto = respostaClima(painel, resumoSoComHoje);
  assert.doesNotMatch(texto, /somou/);
  assert.match(texto, /para hoje, terça-feira, 2026-12-01: máxima de 30°C, mínima de 20°C e 9,3 mm de chuva\./);
});

test("janela de 7 dias do card de /saude termina no último dia encerrado", () => {
  // Cenário do achado (em 2026-11-19 a linha de hoje tinha 9,3 mm, quase todos de previsão).
  // Os valores por dia abaixo são ilustrativos; só a regra da janela importa. Com a referência em ontem, ela não entra na soma.
  const hoje = "2026-11-19";
  const chuvas: Record<string, number> = {
    "2026-11-12": 1.2, "2026-11-13": 5, "2026-11-14": 0, "2026-11-15": 12.1,
    "2026-11-16": 4.7, "2026-11-17": 6, "2026-11-18": 4.6, "2026-11-19": 9.3,
  };
  const linhas = Object.entries(chuvas).map(([data, precipitacao_mm]) => ({ data, precipitacao_mm }));
  const ultimo = ultimoDiaEncerrado(hoje);
  assert.equal(hojeEmBrasilia(meioDiaEmBrasilia(ultimo)), "2026-11-18");
  const encerrados = summarizeRainRisk(linhas, meioDiaEmBrasilia(ultimo));
  assert.deepEqual(encerrados, { total: 33.6, rainyDays: 6, partial: false, risk: "alto" });
  // A série que a página lê (até ontem, 7 linhas) dá o mesmo resultado, sem dia parcial.
  const serie = linhas.filter((l) => l.data <= ultimo).slice(-7);
  assert.deepEqual(summarizeRainRisk(serie, meioDiaEmBrasilia(ultimo)), encerrados);
});

test("parágrafo-resposta sem dados não inventa número", () => {
  const vazio = montarPainelClima([], "2026-11-19", REF);
  const texto = respostaClima(vazio, null);
  assert.match(texto, /não há dados disponíveis neste momento \(2026-11-19\)/);
  assert.doesNotMatch(texto, /°C|mm/);
});

test("valores ausentes somem da frase em vez de virar zero", () => {
  const painel = montarPainelClima([linha("2026-11-19", 29, null, null)], "2026-11-19", REF);
  assert.equal(
    respostaClima(painel, null),
    "Previsão do tempo em Piracanjuba (GO) para hoje, quinta-feira, 2026-11-19: máxima de 29°C. Fonte: Open-Meteo, com atualização a cada 15 minutos.",
  );
  assert.equal(formatarChuva(null), null);
  assert.equal(formatarChuva(0), "0,0 mm");
});

test("selo da home: a chuva de hoje vai como previsão, com vírgula decimal", () => {
  assert.equal(rotuloChuvaHoje(9.3), "9,3 mm previstos para hoje");
  assert.equal(rotuloChuvaHoje(0.1), null);
  assert.equal(rotuloChuvaHoje(0), null);
  assert.equal(rotuloChuvaHoje(null), null);
});

test("selo da home: data e hora da leitura, ou previsão rotulada; nunca um dia futuro", () => {
  const painel = montarPainelClima(LINHAS, "2026-11-19", REF);
  assert.equal(rotuloSeloClima(painel), "2026-11-19 às 01:15");
  const semLeitura = montarPainelClima(LINHAS.map((l) => ({ ...l, atual: null })), "2026-11-19", REF);
  assert.equal(rotuloSeloClima(semLeitura), "Previsão para 2026-11-19");
  assert.equal(rotuloSeloClima(montarPainelClima(LINHAS.slice(2), "2026-11-19", REF)), null);
});

test("/clima: título renderizado até 60 caracteres e description de 120 a 160, sem travessão", () => {
  const pagina = readFileSync(new URL("../src/app/clima/page.tsx", import.meta.url), "utf8");
  const m = pagina.match(/export const metadata = pageMetadata\(\{\s*title:\s*"([^"]+)",\s*description:\s*"([^"]+)"/);
  assert.ok(m, "não achei title e description em pageMetadata");
  const [, title, description] = m;
  // O layout aplica o template "%s | Piracanjuba.ai" às páginas internas.
  assert.ok((title + SUFIXO_TITULO).length <= 60, `título renderizado com ${(title + SUFIXO_TITULO).length} caracteres`);
  assert.ok(description.length >= 120 && description.length <= 160, `description com ${description.length}`);
  assert.match(title, /^Previsão do tempo em Piracanjuba/);
  assert.doesNotMatch(title + description, TRAVESSOES);
});

test("textos de /clima, do selo e do card de /saude não tratam a estimativa de hoje como chuva registrada", () => {
  const fonte = (arquivo: string) => readFileSync(new URL(arquivo, import.meta.url), "utf8");
  const cliente = fonte("../src/app/clima/ClimaClient.tsx");
  assert.doesNotMatch(cliente, /parciais|registrada/);
  const selo = fonte("../src/components/clima/ClimaHeroBadge.tsx");
  assert.match(selo, /rotuloChuvaHoje\(/);
  assert.doesNotMatch(selo, /mm hoje/);
  const card = fonte("../src/components/clima/ClimaSaudeCard.tsx");
  assert.match(card, /summarizeRainRisk\(dias, meioDiaEmBrasilia\(/);
  // Leituras de registro: janela até ontem. Só a linha mais recente (selo antigo) ainda lê até hoje.
  const dados = fonte("../src/lib/data/clima.ts");
  assert.match(dados, /janelaDiasEncerrados\(hoje, dias\)/);
  assert.match(dados, /\.lte\("data", ultimoDiaEncerrado\(hoje\)\)/);
  assert.match(dados, /periodoMesEncerrado\(hoje\)/);
  assert.equal(dados.match(/\.lte\("data", hoje\)/g)?.length, 1);
});

test("/clima usa 'Previsão do tempo em Piracanjuba' no título e no H1", () => {
  const pagina = readFileSync(new URL("../src/app/clima/page.tsx", import.meta.url), "utf8");
  assert.match(pagina, /title: "Previsão do tempo em Piracanjuba GO/);
  assert.match(pagina, /<h1[^>]*>\s*Previsão do tempo em Piracanjuba\s*<\/h1>/);
  assert.match(pagina, /path: "\/clima"/);
});

test("resumo do mês com algum valor conta como dado para o aviso de sem dados", () => {
  const vazio = { acumulado_mm: null, dias_com_chuva: null, temperatura_media: null, temperatura_max_absoluta: null, temperatura_min_absoluta: null };
  assert.equal(resumoMesTemDado(null), false);
  assert.equal(resumoMesTemDado(vazio), false);
  assert.equal(resumoMesTemDado({ ...vazio, acumulado_mm: 95.2 }), true);
  assert.equal(resumoMesTemDado({ ...vazio, acumulado_mm: 0 }), true);
  // Só a temperatura do mês não aparece sem a série de dias: o aviso continua.
  assert.equal(resumoMesTemDado({ ...vazio, temperatura_media: 24.1 }), false);
  const pagina = readFileSync(new URL("../src/app/clima/page.tsx", import.meta.url), "utf8");
  assert.match(pagina, /const semDados = [^;]*!resumoMesTemDado\(resumo\);/);
});
