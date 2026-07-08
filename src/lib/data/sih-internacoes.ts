// Internações hospitalares (SUS) de moradores de Piracanjuba, por ano.
// Fonte: Ministério da Saúde — SIH/SUS (AIH), via Base dos Dados (BigQuery público
// `basedosdados.br_ms_sih.aihs_reduzidas`, filtro id_municipio_paciente = '521710').
// Puxado em 2026-07 via BigQuery (projeto GCP "Piracanjuba Ai"). Query de referência:
//   SELECT ano, COUNT(*) internacoes,
//     ROUND(AVG(DATE_DIFF(data_saida,data_internacao,DAY)),1) permanencia_dias,
//     COUNTIF(carater_internacao='2') urgencia, COUNTIF(carater_internacao='1') eletiva,
//     COUNTIF(motivo_saida IN ('41','42','43')) obitos
//   FROM `basedosdados.br_ms_sih.aihs_reduzidas`
//   WHERE id_municipio_paciente='521710' GROUP BY ano ORDER BY ano
// Dado anual estável; atualizar acrescentando o ano novo quando o SIH consolidar.
// 2025 omitido por ser parcial na base (só parte do ano processada).

export interface SihAno {
  ano: number;
  internacoes: number;
  permanenciaDias: number; // média de dias de permanência
  urgencia: number; // internações de caráter urgência
  eletiva: number; // internações eletivas
  obitos: number; // óbitos hospitalares (motivo de saída 41/42/43)
}

export const SIH_INTERNACOES: SihAno[] = [
  { ano: 2009, internacoes: 1864, permanenciaDias: 4.6, urgencia: 1812, eletiva: 52, obitos: 39 },
  { ano: 2010, internacoes: 1796, permanenciaDias: 4.6, urgencia: 1734, eletiva: 62, obitos: 48 },
  { ano: 2011, internacoes: 1620, permanenciaDias: 4.2, urgencia: 1484, eletiva: 136, obitos: 37 },
  { ano: 2012, internacoes: 1528, permanenciaDias: 4.3, urgencia: 1401, eletiva: 127, obitos: 34 },
  { ano: 2013, internacoes: 2250, permanenciaDias: 3.9, urgencia: 2054, eletiva: 196, obitos: 62 },
  { ano: 2014, internacoes: 2342, permanenciaDias: 3.9, urgencia: 2126, eletiva: 216, obitos: 77 },
  { ano: 2015, internacoes: 2066, permanenciaDias: 5.5, urgencia: 1782, eletiva: 284, obitos: 69 },
  { ano: 2016, internacoes: 2009, permanenciaDias: 4.8, urgencia: 1764, eletiva: 245, obitos: 59 },
  { ano: 2017, internacoes: 2203, permanenciaDias: 3.4, urgencia: 1933, eletiva: 270, obitos: 75 },
  { ano: 2018, internacoes: 2151, permanenciaDias: 4.3, urgencia: 1928, eletiva: 223, obitos: 55 },
  { ano: 2019, internacoes: 2367, permanenciaDias: 4.7, urgencia: 2099, eletiva: 268, obitos: 92 },
  { ano: 2020, internacoes: 1770, permanenciaDias: 6.5, urgencia: 1529, eletiva: 241, obitos: 88 },
  { ano: 2021, internacoes: 1785, permanenciaDias: 5.3, urgencia: 1568, eletiva: 217, obitos: 115 },
  { ano: 2022, internacoes: 2135, permanenciaDias: 4.3, urgencia: 1827, eletiva: 307, obitos: 84 },
  { ano: 2023, internacoes: 2126, permanenciaDias: 4.7, urgencia: 1741, eletiva: 385, obitos: 92 },
  { ano: 2024, internacoes: 2557, permanenciaDias: 4.6, urgencia: 2160, eletiva: 397, obitos: 96 },
];

const ultimo = SIH_INTERNACOES[SIH_INTERNACOES.length - 1];

export const SIH_META = {
  anoUltimo: ultimo.ano,
  ultimo,
  pctUrgenciaUltimo: Math.round((ultimo.urgencia / ultimo.internacoes) * 100),
  taxaObitoUltimo: Number(((ultimo.obitos / ultimo.internacoes) * 100).toFixed(1)),
  totalPeriodo: SIH_INTERNACOES.reduce((s, a) => s + a.internacoes, 0),
  fonteUrl: "https://basedosdados.org/dataset/br-ms-sih",
  fonteLabel: "Ministério da Saúde — SIH/SUS (via Base dos Dados / BigQuery)",
} as const;
