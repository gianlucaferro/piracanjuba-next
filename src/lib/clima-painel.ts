// Separação entre condições atuais, dias já registrados e previsão do clima de Piracanjuba.
//
// A tabela inmet_clima_diario guarda, na mesma série, 2 dias passados, o dia de hoje e
// 6 dias de previsão (sync-inmet-clima pede past_days 2 e forecast_days 7 à Open-Meteo,
// a cada 15 minutos). A linha de hoje também é estimativa: a chuva é o precipitation_sum do
// dia inteiro (horas já passadas mais a previsão para o resto do dia) e a média é a
// temperatura do momento. Por isso toda soma de "registrado" para em ontem (dias já
// encerrados), e hoje e os dias seguintes aparecem rotulados como previsão, com a data.
// "Hoje" é sempre a data de Brasília.
//
// Módulo puro (sem Next nem Supabase), testado em tests/clima-painel.test.ts.
import { brazilDate } from "./civic-day.ts";
import { climateNumber, type ResumoMes } from "./climate-measurements.ts";

export type ClimaDiaLinha = {
  data: string;
  temperatura_max: unknown;
  temperatura_min: unknown;
  temperatura_media: unknown;
  precipitacao_mm: unknown;
  umidade_media: unknown;
  vento_velocidade_max: unknown;
};

/** Condições atuais gravadas pela sincronização (raw_json.current_at_sync). */
export type ClimaAgora = {
  /** Data local (AAAA-MM-DD, horário de Brasília) da leitura. */
  data: string;
  /** Hora local (HH:MM, horário de Brasília) da leitura. */
  hora: string;
  temperatura: number;
  umidade: number | null;
  precipitacao: number | null;
  vento: number | null;
};

export type ClimaPrevisaoDia = {
  data: string;
  temperatura_max: number | null;
  temperatura_min: number | null;
  precipitacao_mm: number | null;
  umidade_media: number | null;
};

export type ClimaPainel = {
  /** Hoje em Brasília (AAAA-MM-DD). */
  hoje: string;
  agora: ClimaAgora | null;
  /** Linha do dia de hoje: máxima e mínima previstas e chuva estimada do dia (horas passadas mais previsão). */
  diaHoje: ClimaPrevisaoDia | null;
  /** Dias depois de hoje, em ordem crescente. */
  previsao: ClimaPrevisaoDia[];
};

export const FONTE_CLIMA = "Open-Meteo";
export const MAX_DIAS_PREVISAO = 7;
/**
 * Idade máxima da leitura atual para ela valer como "tempo agora": 2 horas. A sincronização
 * roda a cada 15 minutos; acima disso ela parou, e o painel cai na previsão do dia.
 */
export const MAX_IDADE_LEITURA_MS = 2 * 60 * 60 * 1000;

export function hojeEmBrasilia(now = new Date()): string {
  return brazilDate(now);
}

/** Soma dias a uma data AAAA-MM-DD (meio-dia UTC, sem efeito de fuso). */
export function somarDias(data: string, dias: number): string {
  const base = new Date(`${data}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/** Último dia encerrado: a véspera de hoje. A linha de hoje ainda mistura chuva calculada e prevista. */
export function ultimoDiaEncerrado(hoje: string): string {
  return somarDias(hoje, -1);
}

/** Janela de N dias já encerrados, que termina ontem: [hoje - N, hoje - 1]. */
export function janelaDiasEncerrados(hoje: string, dias: number): { inicio: string; fim: string } {
  const n = Math.max(1, Math.floor(dias));
  return { inicio: somarDias(hoje, -n), fim: ultimoDiaEncerrado(hoje) };
}

export function inicioDoMes(hoje: string): string {
  return `${hoje.slice(0, 7)}-01`;
}

/**
 * Dias já encerrados do mês de hoje: do dia 1 até ontem. No dia 1 ainda não há dia
 * encerrado no mês, e o resumo fica sem dado em vez de somar só a previsão de hoje.
 */
export function periodoMesEncerrado(hoje: string): { inicio: string; fim: string } | null {
  const inicio = inicioDoMes(hoje);
  const fim = ultimoDiaEncerrado(hoje);
  return fim < inicio ? null : { inicio, fim };
}

/**
 * Meio-dia de Brasília (UTC-3, sem horário de verão desde 2019) na data dada. Serve de
 * referência para funções que recebem um instante e calculam o "hoje" de Brasília, como
 * summarizeRainRisk: com a referência em ontem, a janela de 7 dias termina no último dia encerrado.
 */
export function meioDiaEmBrasilia(data: string): Date {
  return new Date(`${data}T12:00:00-03:00`);
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const DIAS_SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

export function nomeMes(data: string): string {
  return `${MESES[Number(data.slice(5, 7)) - 1]} de ${data.slice(0, 4)}`;
}

export function diaDaSemana(data: string): string {
  return DIAS_SEMANA[new Date(`${data}T12:00:00Z`).getUTCDay()];
}

function previsaoDia(linha: ClimaDiaLinha): ClimaPrevisaoDia {
  return {
    data: linha.data,
    temperatura_max: climateNumber(linha.temperatura_max),
    temperatura_min: climateNumber(linha.temperatura_min),
    precipitacao_mm: climateNumber(linha.precipitacao_mm),
    umidade_media: climateNumber(linha.umidade_media),
  };
}

const HORARIO_LOCAL = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/;

/**
 * Lê raw_json.current_at_sync. O horário vem da Open-Meteo já no fuso de Brasília
 * (a sincronização pede timezone America/Sao_Paulo), no formato "AAAA-MM-DDTHH:MM".
 */
export function lerClimaAgora(bruto: unknown): ClimaAgora | null {
  if (!bruto || typeof bruto !== "object") return null;
  const atual = bruto as Record<string, unknown>;
  const horario = typeof atual.time === "string" ? HORARIO_LOCAL.exec(atual.time) : null;
  const temperatura = climateNumber(atual.temperature);
  if (!horario || temperatura === null) return null;
  return {
    data: horario[1],
    hora: horario[2],
    temperatura,
    umidade: climateNumber(atual.humidity),
    precipitacao: climateNumber(atual.precipitation),
    vento: climateNumber(atual.wind),
  };
}

/** Instante da leitura: data e hora de Brasília (UTC-3, sem horário de verão desde 2019). */
export function instanteDaLeitura(leitura: Pick<ClimaAgora, "data" | "hora">): Date {
  return new Date(`${leitura.data}T${leitura.hora}:00-03:00`);
}

/**
 * Monta o painel a partir das linhas de ontem em diante.
 * - agora: a leitura atual mais recente, só se for de hoje ou de ontem e tiver no máximo
 *   MAX_IDADE_LEITURA_MS em relação a `referencia` (o instante da consulta). Assim uma leitura
 *   das 23h45 continua valendo logo depois da meia-noite, mas não vira "tempo agora" no fim do
 *   dia seguinte se a sincronização parou. A sincronização grava a leitura na linha do dia UTC,
 *   que entre 21h e 24h de Brasília já é a linha de amanhã; por isso procura em todas as linhas.
 * - diaHoje: a linha cuja data é hoje.
 * - previsao: datas depois de hoje, em ordem crescente, no máximo MAX_DIAS_PREVISAO.
 */
export function montarPainelClima(
  linhas: ReadonlyArray<ClimaDiaLinha & { atual?: unknown }>,
  hoje: string,
  referencia: Date,
): ClimaPainel {
  const ontem = somarDias(hoje, -1);
  let agora: ClimaAgora | null = null;
  for (const linha of linhas) {
    const leitura = lerClimaAgora(linha.atual);
    if (!leitura || leitura.data < ontem || leitura.data > hoje) continue;
    if (referencia.getTime() - instanteDaLeitura(leitura).getTime() > MAX_IDADE_LEITURA_MS) continue;
    if (!agora || `${leitura.data}T${leitura.hora}` > `${agora.data}T${agora.hora}`) agora = leitura;
  }

  const linhaHoje = linhas.find((linha) => linha.data === hoje);
  const previsao = linhas
    .filter((linha) => linha.data > hoje)
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, MAX_DIAS_PREVISAO)
    .map(previsaoDia);

  return { hoje, agora, diaHoje: linhaHoje ? previsaoDia(linhaHoje) : null, previsao };
}

/**
 * Resumo do mês com a chuva acumulada, o único valor dele que aparece quando a série de dias falha
 * (a resposta do topo usa a chuva do mês; o resto do resumo só aparece junto com a série).
 */
export function resumoMesTemDado(resumo: ResumoMes | null): boolean {
  return resumo?.acumulado_mm != null;
}

/**
 * Junta as três leituras de /clima com Promise.allSettled: cada uma falha sozinha. Se o painel
 * (leitura atual e previsão) cair, a série dos dias encerrados e o resumo do mês continuam na
 * página; o aviso de falta de dados só aparece quando nada veio. Recebe as buscas como funções
 * para continuar puro (sem Next nem Supabase).
 */
export async function carregarDadosClima<Dia>(
  buscas: {
    serieDias: () => Promise<Dia[]>;
    resumoMes: () => Promise<ResumoMes | null>;
    painel: () => Promise<ClimaPainel>;
  },
  hoje: string,
): Promise<{ dias: Dia[]; resumo: ResumoMes | null; painel: ClimaPainel }> {
  // Promise.resolve().then(...) transforma em rejeição também um erro síncrono da busca.
  const [dias, resumo, painel] = await Promise.allSettled([
    Promise.resolve().then(() => buscas.serieDias()),
    Promise.resolve().then(() => buscas.resumoMes()),
    Promise.resolve().then(() => buscas.painel()),
  ]);
  return {
    dias: dias.status === "fulfilled" ? dias.value : [],
    resumo: resumo.status === "fulfilled" ? resumo.value : null,
    painel: painel.status === "fulfilled" ? painel.value : { hoje, agora: null, diaHoje: null, previsao: [] },
  };
}

const numeroBr = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatarTemperatura(valor: number | null): string | null {
  return valor === null ? null : `${Math.round(valor)}°C`;
}

export function formatarChuva(valor: number | null): string | null {
  return valor === null ? null : `${numeroBr.format(valor)} mm`;
}

function descreverDiaPrevisto(dia: ClimaPrevisaoDia): string | null {
  const partes = [
    dia.temperatura_max !== null ? `máxima de ${formatarTemperatura(dia.temperatura_max)}` : null,
    dia.temperatura_min !== null ? `mínima de ${formatarTemperatura(dia.temperatura_min)}` : null,
    dia.precipitacao_mm !== null ? `${formatarChuva(dia.precipitacao_mm)} de chuva` : null,
  ].filter((parte): parte is string => parte !== null);
  if (!partes.length) return null;
  if (partes.length === 1) return partes[0];
  return `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
}

/**
 * Parágrafo-resposta do topo de /clima, só com números que existem nos dados.
 * Toda data é absoluta e todo valor diz se é previsão ou registro.
 */
export function respostaClima(painel: ClimaPainel, resumoMes: ResumoMes | null): string {
  const frases: string[] = [];
  const { hoje } = painel;

  const textoHoje = painel.diaHoje ? descreverDiaPrevisto(painel.diaHoje) : null;
  if (textoHoje) {
    frases.push(`Previsão do tempo em Piracanjuba (GO) para hoje, ${diaDaSemana(hoje)}, ${hoje}: ${textoHoje}.`);
  }

  const amanha = painel.previsao.find((dia) => dia.data === somarDias(hoje, 1));
  const textoAmanha = amanha ? descreverDiaPrevisto(amanha) : null;
  if (textoAmanha && amanha) {
    frases.push(`Para amanhã, ${diaDaSemana(amanha.data)}, ${amanha.data}, a previsão é de ${textoAmanha}.`);
  }

  if (painel.agora) {
    const { agora } = painel;
    const umidade = agora.umidade !== null ? `, com umidade de ${Math.round(agora.umidade)}%` : "";
    frases.push(
      `Às ${agora.hora} de ${agora.data} (horário de Brasília), a temperatura era de ${formatarTemperatura(agora.temperatura)}${umidade}.`,
    );
  }

  // O resumo do mês vem só de dias encerrados (do dia 1 até ontem); a chuva de hoje já está
  // acima, como previsão. No dia 1 não há período encerrado e a frase não sai.
  const periodo = periodoMesEncerrado(hoje);
  if (periodo && resumoMes?.acumulado_mm !== null && resumoMes?.acumulado_mm !== undefined) {
    const dias = resumoMes.dias_com_chuva;
    const diasTexto = dias === null ? "" : ` em ${dias} ${dias === 1 ? "dia" : "dias"} com chuva`;
    frases.push(
      `Em ${nomeMes(hoje)}, de ${periodo.inicio} a ${periodo.fim} (dias já encerrados), a chuva somou ${formatarChuva(resumoMes.acumulado_mm)}${diasTexto}.`,
    );
  }

  if (!frases.length) {
    return `A previsão do tempo em Piracanjuba (GO) vem da ${FONTE_CLIMA}, atualizada a cada 15 minutos, mas não há dados disponíveis neste momento (${hoje}).`;
  }

  frases.push(`Fonte: ${FONTE_CLIMA}, com atualização a cada 15 minutos.`);
  return frases.join(" ");
}

/**
 * Chuva do dia no selo da home. O valor de hoje soma as horas já passadas e a previsão para o
 * resto do dia, então é dito como previsão. Com 0,1 mm ou menos o selo não mostra chuva.
 */
export function rotuloChuvaHoje(valor: number | null): string | null {
  if (valor === null || valor <= 0.1) return null;
  return `${formatarChuva(valor)} previstos para hoje`;
}

/**
 * Rótulo do selo da home: data e hora da leitura atual (a home pode estar em cache, então a
 * hora explícita vale mais que "agora"), ou a data da previsão do dia.
 */
export function rotuloSeloClima(painel: ClimaPainel): string | null {
  if (painel.agora) return `${painel.agora.data} às ${painel.agora.hora}`;
  if (painel.diaHoje) return `Previsão para ${painel.diaHoje.data}`;
  return null;
}
