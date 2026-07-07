// Série histórica do PIB de Piracanjuba (2002-2023) e do peso do agro no valor
// adicionado, direto do IBGE — Contas Regionais / PIB dos Municípios.
// Fonte: IBGE SIDRA, tabela 5938, município 5217104.
//   - PIB a preços correntes (variável 37): série completa 2002-2023.
//   - Participação da agropecuária no VAB total (variável 516): 2002-2021.
//   - Composição setorial do VAB (variáveis 513/517/6575/525): ano cheio 2021.
// Dado oficial fechado por ano (IBGE divulga em dezembro, com ~2 anos de defasagem
// para a abertura setorial). Mantido estático; atualizar 1x/ano acrescentando o novo
// ano da tabela 5938. Valores em MIL reais correntes (nominais, não deflacionados).

export interface PibAno {
  ano: number;
  pibMil: number; // PIB a preços correntes, em mil reais
}

export interface AgroShareAno {
  ano: number;
  pct: number; // participação da agropecuária no VAB total, em %
}

export interface SetorVab {
  setor: string;
  valorMil: number; // valor adicionado bruto do setor, em mil reais
  pct: number; // participação no VAB total, em %
  cor: string;
}

// PIB a preços correntes (mil R$), 2002-2023 — variável 37.
export const PIB_SERIE: PibAno[] = [
  { ano: 2002, pibMil: 150214 },
  { ano: 2003, pibMil: 198091 },
  { ano: 2004, pibMil: 235735 },
  { ano: 2005, pibMil: 234453 },
  { ano: 2006, pibMil: 252694 },
  { ano: 2007, pibMil: 299748 },
  { ano: 2008, pibMil: 379242 },
  { ano: 2009, pibMil: 381535 },
  { ano: 2010, pibMil: 393827 },
  { ano: 2011, pibMil: 429019 },
  { ano: 2012, pibMil: 514195 },
  { ano: 2013, pibMil: 604093 },
  { ano: 2014, pibMil: 655671 },
  { ano: 2015, pibMil: 639352 },
  { ano: 2016, pibMil: 744956 },
  { ano: 2017, pibMil: 776387 },
  { ano: 2018, pibMil: 780751 },
  { ano: 2019, pibMil: 829623 },
  { ano: 2020, pibMil: 1086581 },
  { ano: 2021, pibMil: 1239086 },
  { ano: 2022, pibMil: 1553630 },
  { ano: 2023, pibMil: 1311747 },
];

// Participação da agropecuária no VAB total (%), 2002-2021 — variável 516.
export const AGRO_SHARE_SERIE: AgroShareAno[] = [
  { ano: 2002, pct: 33.08 },
  { ano: 2003, pct: 37.48 },
  { ano: 2004, pct: 35.21 },
  { ano: 2005, pct: 30.85 },
  { ano: 2006, pct: 26.5 },
  { ano: 2007, pct: 29.35 },
  { ano: 2008, pct: 36.03 },
  { ano: 2009, pct: 33.49 },
  { ano: 2010, pct: 35.71 },
  { ano: 2011, pct: 35.42 },
  { ano: 2012, pct: 37.07 },
  { ano: 2013, pct: 40.44 },
  { ano: 2014, pct: 41.82 },
  { ano: 2015, pct: 38.29 },
  { ano: 2016, pct: 41.72 },
  { ano: 2017, pct: 40.25 },
  { ano: 2018, pct: 40.21 },
  { ano: 2019, pct: 39.86 },
  { ano: 2020, pct: 48.82 },
  { ano: 2021, pct: 53.48 },
];

// Composição setorial do VAB 2021 (mil R$ e % do VAB total = R$ 1.163.118 mil).
export const COMPOSICAO_VAB_2021: SetorVab[] = [
  { setor: "Agropecuária", valorMil: 622058, pct: 53.48, cor: "#16a34a" },
  { setor: "Serviços", valorMil: 319956, pct: 27.51, cor: "#0ea5e9" },
  { setor: "Administração pública", valorMil: 128070, pct: 11.01, cor: "#f59e0b" },
  { setor: "Indústria", valorMil: 93035, pct: 8.0, cor: "#7c3aed" },
];

// Comparação do peso do agro no VAB, 2021 — variável 516, níveis Brasil/Goiás/município.
export const AGRO_SHARE_COMPARACAO_2021 = [
  { nivel: "Brasil", pct: 7.66, destaque: false },
  { nivel: "Goiás", pct: 17.82, destaque: false },
  { nivel: "Piracanjuba", pct: 53.48, destaque: true },
] as const;

export const PIB_HISTORICO_META = {
  anoPibMaisRecente: 2023,
  pibMaisRecenteMil: 1311747,
  anoPico: 2022,
  pibPicoMil: 1553630,
  anoComposicao: 2021,
  vabTotal2021Mil: 1163118,
  impostos2021Mil: 75968,
  pib2021Mil: 1239086,
  fonteUrl:
    "https://sidra.ibge.gov.br/tabela/5938",
  fonteLabel: "IBGE — PIB dos Municípios (SIDRA, tabela 5938)",
} as const;
