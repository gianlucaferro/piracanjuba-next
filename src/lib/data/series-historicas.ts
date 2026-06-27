// Séries históricas de Piracanjuba-GO (dados oficiais, compilados para os painéis de transformação agrária).
// FONTES: IBGE/PAM (tabela 1612, soja área e produção), IBGE/PPM (tabela 74, leite),
// IBGE Censo Agropecuário 2017 (tabela 6753), MapBiomas Coleção 10.1 (uso do solo).
// Código IBGE de Piracanjuba: 5217104. Compilado em 2026-06. Atualização: anual.
// Estes são dados históricos estáveis; mantidos estáticos para evitar dependência de sync.

export type PontoArea = { ano: number; ha: number };
export type PontoLeite = { ano: number; milLitros: number };
export type PontoTesoura = { ano: number; sojaHa: number; leiteMilLitros: number };

/** Soja: área plantada em Piracanjuba (ha). Anos < 1988 usam área colhida (PAM não tinha plantada). */
export const SOJA_AREA_PIRACANJUBA: PontoArea[] = [
  {ano:1985,ha:2000},
  {ano:1986,ha:3000},
  {ano:1987,ha:2880},
  {ano:1988,ha:4100},
  {ano:1989,ha:6000},
  {ano:1990,ha:6000},
  {ano:1991,ha:5000},
  {ano:1992,ha:2500},
  {ano:1993,ha:2470},
  {ano:1994,ha:2600},
  {ano:1995,ha:2002},
  {ano:1996,ha:1200},
  {ano:1997,ha:1500},
  {ano:1998,ha:4194},
  {ano:1999,ha:4200},
  {ano:2000,ha:4550},
  {ano:2001,ha:7260},
  {ano:2002,ha:17387},
  {ano:2003,ha:27387},
  {ano:2004,ha:50000},
  {ano:2005,ha:50500},
  {ano:2006,ha:50500},
  {ano:2007,ha:50500},
  {ano:2008,ha:50500},
  {ano:2009,ha:35000},
  {ano:2010,ha:37000},
  {ano:2011,ha:35000},
  {ano:2012,ha:40000},
  {ano:2013,ha:55000},
  {ano:2014,ha:60000},
  {ano:2015,ha:60000},
  {ano:2016,ha:65000},
  {ano:2017,ha:65000},
  {ano:2018,ha:60000},
  {ano:2019,ha:65000},
  {ano:2020,ha:68000},
  {ano:2021,ha:65000},
  {ano:2022,ha:70000},
  {ano:2023,ha:63000},
  {ano:2024,ha:81000},
];

/** Produção de leite em Piracanjuba (mil litros) — PPM/IBGE tabela 74. Pico real em 2014. */
export const LEITE_PIRACANJUBA: PontoLeite[] = [
  {ano:1990,milLitros:27791},
  {ano:1991,milLitros:41720},
  {ano:1992,milLitros:53658},
  {ano:1993,milLitros:46794},
  {ano:1994,milLitros:47813},
  {ano:1995,milLitros:48670},
  {ano:1996,milLitros:56849},
  {ano:1997,milLitros:57639},
  {ano:1998,milLitros:61988},
  {ano:1999,milLitros:67315},
  {ano:2000,milLitros:68258},
  {ano:2001,milLitros:67955},
  {ano:2002,milLitros:63516},
  {ano:2003,milLitros:87410},
  {ano:2004,milLitros:90033},
  {ano:2005,milLitros:92734},
  {ano:2006,milLitros:89952},
  {ano:2007,milLitros:98947},
  {ano:2008,milLitros:107942},
  {ano:2009,milLitros:112395},
  {ano:2010,milLitros:114313},
  {ano:2011,milLitros:117936},
  {ano:2012,milLitros:123280},
  {ano:2013,milLitros:147490},
  {ano:2014,milLitros:154800},
  {ano:2015,milLitros:105805},
  {ano:2016,milLitros:85500},
  {ano:2017,milLitros:95000},
  {ano:2018,milLitros:94878},
  {ano:2019,milLitros:94975},
  {ano:2020,milLitros:95100},
  {ano:2021,milLitros:95800},
  {ano:2022,milLitros:84101},
  {ano:2023,milLitros:83500},
  {ano:2024,milLitros:81578},
];

/** Cruzamento soja (área plantada) x leite (produção) em Piracanjuba, 2000-2024. */
export const SOJA_X_LEITE: PontoTesoura[] = [
  {ano:2000,sojaHa:4550,leiteMilLitros:68258},
  {ano:2001,sojaHa:7260,leiteMilLitros:67955},
  {ano:2002,sojaHa:17387,leiteMilLitros:63516},
  {ano:2003,sojaHa:27387,leiteMilLitros:87410},
  {ano:2004,sojaHa:50000,leiteMilLitros:90033},
  {ano:2005,sojaHa:50500,leiteMilLitros:92734},
  {ano:2006,sojaHa:50500,leiteMilLitros:89952},
  {ano:2007,sojaHa:50500,leiteMilLitros:98947},
  {ano:2008,sojaHa:50500,leiteMilLitros:107942},
  {ano:2009,sojaHa:35000,leiteMilLitros:112395},
  {ano:2010,sojaHa:37000,leiteMilLitros:114313},
  {ano:2011,sojaHa:35000,leiteMilLitros:117936},
  {ano:2012,sojaHa:40000,leiteMilLitros:123280},
  {ano:2013,sojaHa:55000,leiteMilLitros:147490},
  {ano:2014,sojaHa:60000,leiteMilLitros:154800},
  {ano:2015,sojaHa:60000,leiteMilLitros:105805},
  {ano:2016,sojaHa:65000,leiteMilLitros:85500},
  {ano:2017,sojaHa:65000,leiteMilLitros:95000},
  {ano:2018,sojaHa:60000,leiteMilLitros:94878},
  {ano:2019,sojaHa:65000,leiteMilLitros:94975},
  {ano:2020,sojaHa:68000,leiteMilLitros:95100},
  {ano:2021,sojaHa:65000,leiteMilLitros:95800},
  {ano:2022,sojaHa:70000,leiteMilLitros:84101},
  {ano:2023,sojaHa:63000,leiteMilLitros:83500},
  {ano:2024,sojaHa:81000,leiteMilLitros:81578},
];

/** Estrutura fundiária — Censo Agropecuário 2017, Piracanjuba (tabela 6753). */
export const ESTRUTURA_FUNDIARIA_2017 = {
  totalEstabelecimentos: 2135,
  totalAreaHa: 235947,
  familiar: { estabelecimentos: 1440, areaHa: 46690 },
  naoFamiliar: { estabelecimentos: 695, areaHa: 189256 },
  terras: { propriaHa: 195217, arrendadaHa: 36352 },
} as const;

// ───────────────────────────────────────────────────────────────────────────
// Aprofundamento (Dossiê "Transformação agrária de Piracanjuba", jun/2026).
// Fontes: IBGE Censo Agro 2017 (tabelas 6753/6754/6778), IBGE PAM 1612 e PPM 74,
// FNDE (planilhas de aquisição da agricultura familiar), cartografia IBGE (Mapa
// Municipal Estatístico 2022) e literatura acadêmica (teses UFU/UFSC/PUC-GO).
// ───────────────────────────────────────────────────────────────────────────

export type CondicaoLegalTerra = { tipo: string; ha: number; pct: number };
export type PorteEstabelecimento = { faixa: string; estabelecimentos: number };

/** Concentração fundiária aprofundada — Censo Agropecuário 2017 (tabelas 6753/6754/6778). */
export const CONCENTRACAO_FUNDIARIA_2017 = {
  // Índice de Gini da terra (0 = igualdade, 1 = concentração máxima), estimado a partir das
  // classes de tamanho do Censo 2017 (medida municipal usual; tende a subestimar vs. o
  // Gini nacional de 0,86 calculado com microdados).
  giniTerra: 0.70,
  metadeMenorPctArea: 8, // a metade menor dos produtores ocupa apenas 8% da área
  arrendatarios: 141, // estabelecimentos declarados arrendatários
  // Condição legal das terras (ha e % da área). 'Em parceria' foi omitido pelo IBGE por sigilo.
  condicaoLegal: [
    { tipo: "Próprias", ha: 195217, pct: 83.0 },
    { tipo: "Arrendadas", ha: 36352, pct: 15.5 },
    { tipo: "Em comodato", ha: 1994, pct: 0.8 },
    { tipo: "Concedidas por órgão fundiário", ha: 1586, pct: 0.7 },
  ] as CondicaoLegalTerra[],
  // Estabelecimentos por porte (nº de unidades; soma = 2.135).
  porte: [
    { faixa: "Pequenas (até 10 ha)", estabelecimentos: 419 },
    { faixa: "Médias (10 a 100 ha)", estabelecimentos: 1192 },
    { faixa: "Grandes (mais de 100 ha)", estabelecimentos: 524 },
  ] as PorteEstabelecimento[],
} as const;

export type MunicipioValor = { mun: string; valor: number };

/** Piracanjuba no Sul Goiano: soja (área plantada 2024, ha). IBGE/PAM 1612. */
export const SUL_GOIANO_SOJA_2024: MunicipioValor[] = [
  { mun: "Goiatuba", valor: 90000 },
  { mun: "Piracanjuba", valor: 81000 },
  { mun: "Bom Jesus de Goiás", valor: 64000 },
  { mun: "Itumbiara", valor: 55000 },
  { mun: "Morrinhos", valor: 53500 },
  { mun: "Pontalina", valor: 34000 },
  { mun: "Joviânia", valor: 23000 },
];

/** Piracanjuba no Sul Goiano: leite (produção 2023, mil litros). IBGE/PPM 74. */
export const SUL_GOIANO_LEITE_2023: MunicipioValor[] = [
  { mun: "Piracanjuba", valor: 83500 },
  { mun: "Pontalina", valor: 55000 },
  { mun: "Morrinhos", valor: 52567 },
  { mun: "Itumbiara", valor: 26300 },
  { mun: "Goiatuba", valor: 19700 },
  { mun: "Joviânia", valor: 7500 },
  { mun: "Bom Jesus de Goiás", valor: 5180 },
];

export type ComunidadeRural = { nome: string; tipo: string; descricao: string };

/** Comunidades rurais documentadas (cartografia IBGE + estudos acadêmicos). */
export const COMUNIDADES_RURAIS: ComunidadeRural[] = [
  {
    nome: "Boa Esperança",
    tipo: "Assentamento de reforma agrária",
    descricao:
      "Assentamento documentado em estudo acadêmico de etnobotânica (plantas medicinais) e em diagnóstico socioambiental da bacia do Piracanjuba. Tem associação de pequenos produtores.",
  },
  {
    nome: "Vale do Roda Cuia",
    tipo: "Vale rural com associação própria",
    descricao:
      "Região rural com a Associação de Produtores do Vale do Roda Cuia e a cooperativa COAPIL, ativa há mais de 30 anos. A Fazenda Roda Cuia consta na cartografia oficial do IBGE.",
  },
  {
    nome: "Recantilado",
    tipo: "Localidade/setor rural",
    descricao:
      "Localidade rural que aparece na cartografia do IBGE como setor 'Recantilado - Boa Esperança', com o córrego Recantilado marcando divisas de propriedades.",
  },
];

/** PNAE: compra da agricultura familiar para a merenda. Lei 11.947/2009 exige no mínimo 30%. */
export const PNAE_AGRICULTURA_FAMILIAR = {
  minimoLegalPct: 30,
  // % do repasse do FNDE efetivamente usado em compra da agricultura familiar (planilhas FNDE).
  anos: [
    { ano: 2013, valorAF: 48615.1, valorTotal: 196180.0, pct: 24.8 },
    { ano: 2016, valorAF: 28584.68, valorTotal: 241946.7, pct: 11.8 },
  ],
  // Anos com chamada pública ativa para a agricultura familiar (continuidade institucional).
  chamadasRecentes: [2019, 2022, 2023, 2025],
} as const;

export type PontoSojaGoias = { ano: number; areaHa: number; producaoT: number };

/** Soja em Goiás (estado): área plantada (ha) e produção (t), anos selecionados. IBGE/PAM 1612. */
export const SOJA_GOIAS: PontoSojaGoias[] = [
  { ano: 1975, areaHa: 55600, producaoT: 73392 },
  { ano: 1985, areaHa: 734210, producaoT: 1356240 },
  { ano: 1995, areaHa: 1121511, producaoT: 2146926 },
  { ano: 2005, areaHa: 2663380, producaoT: 6983860 },
  { ano: 2015, areaHa: 3260025, producaoT: 8606210 },
  { ano: 2024, areaHa: 4940502, producaoT: 16973882 },
];

export type PontoLeiteComparado = { ano: number; piraMilL: number; goiasMilL: number };

/** Produção de leite: Piracanjuba vs Goiás (mil litros), anos selecionados. IBGE/PPM 74. */
export const LEITE_PIRA_VS_GOIAS: PontoLeiteComparado[] = [
  { ano: 1990, piraMilL: 27791, goiasMilL: 1071966 },
  { ano: 1995, piraMilL: 48670, goiasMilL: 1450158 },
  { ano: 2000, piraMilL: 68258, goiasMilL: 2193799 },
  { ano: 2005, piraMilL: 92734, goiasMilL: 2648599 },
  { ano: 2010, piraMilL: 114313, goiasMilL: 3193731 },
  { ano: 2014, piraMilL: 154800, goiasMilL: 3659191 },
  { ano: 2018, piraMilL: 94878, goiasMilL: 3084080 },
  { ano: 2023, piraMilL: 83500, goiasMilL: 2980911 },
];

export type ClasseTamanho = { faixa: string; estab: number; porte: "pequena" | "media" | "grande" };

/** Estabelecimentos por grupo de área total (17 classes) — Censo Agro 2017 (tabela 6778). Soma = 2.135. */
export const DISTRIBUICAO_TAMANHO_2017: ClasseTamanho[] = [
  { faixa: "menos de 0,1 ha", estab: 8, porte: "pequena" },
  { faixa: "0,1 a 0,2 ha", estab: 5, porte: "pequena" },
  { faixa: "0,2 a 0,5 ha", estab: 10, porte: "pequena" },
  { faixa: "0,5 a 1 ha", estab: 20, porte: "pequena" },
  { faixa: "1 a 2 ha", estab: 23, porte: "pequena" },
  { faixa: "2 a 3 ha", estab: 65, porte: "pequena" },
  { faixa: "3 a 4 ha", estab: 18, porte: "pequena" },
  { faixa: "4 a 5 ha", estab: 78, porte: "pequena" },
  { faixa: "5 a 10 ha", estab: 192, porte: "pequena" },
  { faixa: "10 a 20 ha", estab: 285, porte: "media" },
  { faixa: "20 a 50 ha", estab: 592, porte: "media" },
  { faixa: "50 a 100 ha", estab: 315, porte: "media" },
  { faixa: "100 a 200 ha", estab: 265, porte: "grande" },
  { faixa: "200 a 500 ha", estab: 189, porte: "grande" },
  { faixa: "500 a 1.000 ha", estab: 46, porte: "grande" },
  { faixa: "1.000 a 2.500 ha", estab: 19, porte: "grande" },
  { faixa: "2.500 a 10.000 ha", estab: 5, porte: "grande" },
];
