import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  diaDaSemana,
  formatarChuva,
  hojeEmBrasilia,
  inicioDoMes,
  janelaUltimosDias,
  lerClimaAgora,
  montarPainelClima,
  nomeMes,
  respostaClima,
  rotuloSeloClima,
  somarDias,
  type ClimaDiaLinha,
} from "../src/lib/clima-painel.ts";

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

test("hoje é a data de Brasília, não a de UTC", () => {
  assert.equal(hojeEmBrasilia(new Date("2026-11-19T04:21:00Z")), "2026-11-19");
  // 23:30 de Brasília em 2026-11-19 já é 2026-11-20 em UTC.
  assert.equal(hojeEmBrasilia(new Date("2026-11-20T02:30:00Z")), "2026-11-19");
});

test("datas: soma de dias, janela dos últimos N dias e início do mês", () => {
  assert.equal(somarDias("2026-11-30", 1), "2026-12-01");
  assert.equal(somarDias("2026-03-01", -1), "2026-02-28");
  assert.deepEqual(janelaUltimosDias("2026-11-19", 30), { inicio: "2026-10-21", fim: "2026-11-19" });
  assert.deepEqual(janelaUltimosDias("2026-11-19", 7), { inicio: "2026-11-13", fim: "2026-11-19" });
  assert.deepEqual(janelaUltimosDias("2026-11-19", 1), { inicio: "2026-11-19", fim: "2026-11-19" });
  assert.equal(inicioDoMes("2026-11-19"), "2026-11-01");
  assert.equal(nomeMes("2026-11-19"), "novembro de 2026");
  assert.equal(diaDaSemana("2026-11-19"), "quinta-feira");
  assert.equal(diaDaSemana("2026-11-22"), "domingo");
});

test("painel separa leitura atual, dia de hoje e previsão", () => {
  const painel = montarPainelClima(LINHAS, "2026-11-19");
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
  const painel = montarPainelClima(linhas, "2026-11-19");
  assert.equal(painel.agora?.data, "2026-11-19");
  assert.equal(painel.agora?.hora, "22:15");
  assert.equal(painel.diaHoje?.data, "2026-11-19");
  assert.deepEqual(painel.previsao.map((d) => d.data), ["2026-11-20", "2026-11-21"]);
});

test("leitura velha, futura ou sem temperatura não vira tempo atual", () => {
  const velha = montarPainelClima([linha("2026-11-19", 29, 20, 3, { time: "2026-11-15T10:00", temperature: 25 })], "2026-11-19");
  assert.equal(velha.agora, null);
  const futura = montarPainelClima([linha("2026-11-20", 29, 20, 3, { time: "2026-11-20T10:00", temperature: 25 })], "2026-11-19");
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
  assert.equal(montarPainelClima(linhas, "2026-11-19").agora?.hora, "00:15");
});

test("parágrafo-resposta de /clima traz números, datas absolutas e fonte", () => {
  const painel = montarPainelClima(LINHAS, "2026-11-19");
  const resumo = { acumulado_mm: 161.6, dias_com_chuva: 12, temperatura_media: 23.1, temperatura_max_absoluta: 31.5, temperatura_min_absoluta: 18.2 };
  const texto = respostaClima(painel, resumo);
  assert.equal(
    texto,
    "Previsão do tempo em Piracanjuba (GO) para hoje, quinta-feira, 2026-11-19: máxima de 29°C, mínima de 20°C e 9,3 mm de chuva. " +
      "Para amanhã, sexta-feira, 2026-11-20, a previsão é de máxima de 30°C, mínima de 20°C e 8,7 mm de chuva. " +
      "Às 01:15 de 2026-11-19 (horário de Brasília), a temperatura era de 21°C, com umidade de 95%. " +
      "Em novembro de 2026, de 2026-11-01 a 2026-11-19, a chuva somou 161,6 mm em 12 dias com chuva (o dia de hoje ainda é parcial). " +
      "Fonte: Open-Meteo, com atualização a cada 15 minutos.",
  );
  assert.doesNotMatch(texto, TRAVESSOES);
  // Nenhuma data de previsão além de amanhã aparece como dado do texto.
  assert.doesNotMatch(texto, /2026-11-2[1-5]/);
});

test("parágrafo-resposta sem dados não inventa número", () => {
  const vazio = montarPainelClima([], "2026-11-19");
  const texto = respostaClima(vazio, null);
  assert.match(texto, /não há dados disponíveis neste momento \(2026-11-19\)/);
  assert.doesNotMatch(texto, /°C|mm/);
});

test("valores ausentes somem da frase em vez de virar zero", () => {
  const painel = montarPainelClima([linha("2026-11-19", 29, null, null)], "2026-11-19");
  assert.equal(
    respostaClima(painel, null),
    "Previsão do tempo em Piracanjuba (GO) para hoje, quinta-feira, 2026-11-19: máxima de 29°C. Fonte: Open-Meteo, com atualização a cada 15 minutos.",
  );
  assert.equal(formatarChuva(null), null);
  assert.equal(formatarChuva(0), "0,0 mm");
});

test("selo da home: data e hora da leitura, ou previsão rotulada; nunca um dia futuro", () => {
  const painel = montarPainelClima(LINHAS, "2026-11-19");
  assert.equal(rotuloSeloClima(painel), "2026-11-19 às 01:15");
  const semLeitura = montarPainelClima(LINHAS.map((l) => ({ ...l, atual: null })), "2026-11-19");
  assert.equal(rotuloSeloClima(semLeitura), "Previsão para 2026-11-19");
  assert.equal(rotuloSeloClima(montarPainelClima(LINHAS.slice(2), "2026-11-19")), null);
});

test("/clima usa 'Previsão do tempo em Piracanjuba' no título e no H1", () => {
  const pagina = readFileSync(new URL("../src/app/clima/page.tsx", import.meta.url), "utf8");
  assert.match(pagina, /title: "Previsão do tempo em Piracanjuba GO/);
  assert.match(pagina, /<h1[^>]*>\s*Previsão do tempo em Piracanjuba\s*<\/h1>/);
  assert.match(pagina, /path: "\/clima"/);
});
