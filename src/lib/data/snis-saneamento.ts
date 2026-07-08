// Saneamento de Piracanjuba pela ótica do prestador de serviço (SNIS), por ano.
// Fonte: Ministério das Cidades — SNIS, via Base dos Dados (BigQuery público
// `basedosdados.br_mdr_snis.municipio_agua_esgoto`, filtro id_municipio = '5217104').
// Puxado em 2026-07 via BigQuery (projeto GCP "Piracanjuba Ai"). Query de referência:
//   SELECT ano, indice_atendimento_urbano_agua, indice_coleta_esgoto,
//     indice_tratamento_esgoto, indice_perda_faturamento
//   FROM `basedosdados.br_mdr_snis.municipio_agua_esgoto`
//   WHERE id_municipio='5217104' ORDER BY ano
// IMPORTANTE: o SNIS mede o atendimento pelo PRESTADOR (base diferente do Censo IBGE
// de domicílios), por isso os percentuais diferem dos indicadores IBGE da mesma página.
// Dado anual estável; atualizar acrescentando o ano novo quando o SNIS consolidar.

export interface SnisAno {
  ano: number;
  aguaUrbana: number | null; // % de atendimento urbano de água
  coletaEsgoto: number | null; // % de coleta de esgoto
  tratamentoEsgoto: number | null; // % do esgoto coletado que é tratado
  perdas: number | null; // índice de perda no faturamento (%)
}

export const SNIS_SANEAMENTO: SnisAno[] = [
  { ano: 2009, aguaUrbana: 100.0, coletaEsgoto: 14.1, tratamentoEsgoto: 100.0, perdas: 34.2 },
  { ano: 2010, aguaUrbana: 100.0, coletaEsgoto: 38.8, tratamentoEsgoto: 100.0, perdas: 33.5 },
  { ano: 2011, aguaUrbana: 99.2, coletaEsgoto: 61.9, tratamentoEsgoto: 100.0, perdas: 30.7 },
  { ano: 2012, aguaUrbana: 99.2, coletaEsgoto: 78.2, tratamentoEsgoto: 100.0, perdas: 23.1 },
  { ano: 2013, aguaUrbana: 100.0, coletaEsgoto: 84.9, tratamentoEsgoto: 100.0, perdas: 23.3 },
  { ano: 2014, aguaUrbana: 99.6, coletaEsgoto: 91.6, tratamentoEsgoto: 100.0, perdas: 24.3 },
  { ano: 2015, aguaUrbana: 99.6, coletaEsgoto: 92.3, tratamentoEsgoto: 100.0, perdas: 24.7 },
  { ano: 2016, aguaUrbana: 99.9, coletaEsgoto: 93.0, tratamentoEsgoto: 100.0, perdas: 24.2 },
  { ano: 2017, aguaUrbana: 100.0, coletaEsgoto: 93.9, tratamentoEsgoto: 100.0, perdas: 23.7 },
  { ano: 2018, aguaUrbana: 91.1, coletaEsgoto: 95.9, tratamentoEsgoto: 100.0, perdas: 23.4 },
  { ano: 2019, aguaUrbana: 100.0, coletaEsgoto: 95.7, tratamentoEsgoto: 100.0, perdas: 24.8 },
  { ano: 2020, aguaUrbana: 100.0, coletaEsgoto: 94.2, tratamentoEsgoto: 100.0, perdas: 26.4 },
  { ano: 2021, aguaUrbana: 100.0, coletaEsgoto: 94.7, tratamentoEsgoto: 100.0, perdas: 15.0 },
  { ano: 2022, aguaUrbana: null, coletaEsgoto: 93.9, tratamentoEsgoto: 100.0, perdas: 16.8 },
];

const primeiro = SNIS_SANEAMENTO[0];
// último ano com coleta de esgoto reportada
const ultimoComColeta = [...SNIS_SANEAMENTO].reverse().find((a) => a.coletaEsgoto !== null)!;

export const SNIS_META = {
  primeiro, // 2009: coleta 14,1%
  ultimoComColeta, // 2022: coleta 93,9%, tratamento 100%
  coletaInicial: primeiro.coletaEsgoto, // 14.1
  coletaAtual: ultimoComColeta.coletaEsgoto, // 93.9
  fonteUrl: "https://basedosdados.org/dataset/br-mdr-snis",
  fonteLabel: "Ministério das Cidades — SNIS (via Base dos Dados / BigQuery)",
} as const;
