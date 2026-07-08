// População de Piracanjuba por situação do domicílio (urbana × rural) ao longo dos
// censos do IBGE. É o dado que quantifica o êxodo rural descrito na narrativa da
// modernização da soja (ver "Como a soja chegou ao Sul Goiano").
// Fonte: IBGE — Censos Demográficos.
//   - 1970-2010: SIDRA tabela 200 (população residente por situação do domicílio, variável 93).
//   - 2022: SIDRA tabela 9923 (Censo 2022, população residente por situação do domicílio).
// Série oficial comparável de "situação do domicílio" (perímetro urbano legal).
// Dado histórico fechado; atualizar só no próximo censo.

export interface CensoPopulacao {
  ano: number;
  total: number;
  urbana: number;
  rural: number;
}

export const POPULACAO_CENSOS: CensoPopulacao[] = [
  { ano: 1970, total: 22842, urbana: 6153, rural: 16689 },
  { ano: 1980, total: 24095, urbana: 12627, rural: 11468 },
  { ano: 1991, total: 25273, urbana: 15785, rural: 9488 },
  { ano: 2000, total: 23557, urbana: 15206, rural: 8351 },
  { ano: 2010, total: 24026, urbana: 17551, rural: 6475 },
  { ano: 2022, total: 24883, urbana: 19852, rural: 5031 },
];

export const CENSO_DEMOGRAFIA_META = {
  primeiro: POPULACAO_CENSOS[0],
  ultimo: POPULACAO_CENSOS[POPULACAO_CENSOS.length - 1],
  fonteUrl: "https://sidra.ibge.gov.br/tabela/200",
  fonteLabel: "IBGE — Censos Demográficos (SIDRA, tabelas 200 e 9923)",
} as const;
