// Series e indicadores de saude de Piracanjuba-GO (codigo IBGE 5217104 / DATASUS 521710).
// FONTES: DATASUS (CNES, SIH/SUS, SINASC), IBGE (Censo 2022), Ministerio da Saude (e-Gestor AB).
// Dados estaveis (anuais); compilados em 2026-06 a partir de consulta direta as fontes oficiais.
// Atualizacao: anual (e SIH ~mensal). Populacao de referencia: 24.883 hab (Censo 2022).

export const POP_2022 = 24883;

/** Rede de estabelecimentos de saude por tipo (CNES, jun/2026). */
export type RedeTipo = { tipo: string; qtd: number; rede: "publica" | "apoio" };
export const REDE_CNES: RedeTipo[] = [
  { tipo: "UBS / Centro de Saude", qtd: 8, rede: "publica" },
  { tipo: "Hospital Geral", qtd: 2, rede: "publica" },
  { tipo: "Unidade de Vigilancia em Saude", qtd: 2, rede: "publica" },
  { tipo: "Posto de Saude", qtd: 1, rede: "publica" },
  { tipo: "SAMU (movel urgencia)", qtd: 1, rede: "publica" },
  { tipo: "CAPS (saude mental)", qtd: 1, rede: "publica" },
  { tipo: "Polo Academia da Saude", qtd: 1, rede: "publica" },
  { tipo: "Central de Regulacao", qtd: 1, rede: "publica" },
  { tipo: "Secretaria de Saude / Gestao", qtd: 1, rede: "publica" },
  { tipo: "Clinica / Centro de Especialidade", qtd: 6, rede: "apoio" },
  { tipo: "Apoio a Diagnose e Terapia (SADT)", qtd: 10, rede: "apoio" },
  { tipo: "Consultorio Isolado", qtd: 16, rede: "apoio" },
  { tipo: "Farmacia", qtd: 26, rede: "apoio" },
];
export const REDE_TOTAL = 76;

export const HOSPITAIS = [
  { nome: "Hospital Municipal Thuany Garcia Ribeiro", natureza: "Publico municipal", leitos: 34, cnes: "2382490" },
  { nome: "Hospital Sao Vicente de Paulo", natureza: "Filantropico (atende SUS, IPASGO e UNIMED)", leitos: null, cnes: "2442205" },
];

/** Cobertura estimada da Estrategia Saude da Familia (e-Gestor AB). Serie tradicional encerrada em 2020. */
export const COBERTURA_ESF: { ano: number; pct: number }[] = [
  { ano: 2007, pct: 70.76 }, { ano: 2008, pct: 74.0 }, { ano: 2009, pct: 71.85 }, { ano: 2010, pct: 71.78 },
  { ano: 2011, pct: 71.8 }, { ano: 2012, pct: 71.69 }, { ano: 2013, pct: 71.91 }, { ano: 2014, pct: 69.82 },
  { ano: 2015, pct: 69.65 }, { ano: 2016, pct: 69.64 }, { ano: 2017, pct: 69.47 }, { ano: 2018, pct: 69.32 },
  { ano: 2019, pct: 98.58 }, { ano: 2020, pct: 98.47 },
];

/** Natalidade (SINASC): nascidos vivos e proporcao de gestantes com 7+ consultas de pre-natal. */
export const NATALIDADE: { ano: number; nascidos: number; prenatal7: number }[] = [
  { ano: 2010, nascidos: 236, prenatal7: 49.15 }, { ano: 2011, nascidos: 279, prenatal7: 61.29 },
  { ano: 2012, nascidos: 217, prenatal7: 58.53 }, { ano: 2013, nascidos: 256, prenatal7: 62.11 },
  { ano: 2014, nascidos: 227, prenatal7: 70.48 }, { ano: 2015, nascidos: 253, prenatal7: 65.61 },
  { ano: 2016, nascidos: 213, prenatal7: 73.24 }, { ano: 2017, nascidos: 245, prenatal7: 72.65 },
  { ano: 2018, nascidos: 241, prenatal7: 76.35 }, { ano: 2019, nascidos: 235, prenatal7: 77.45 },
  { ano: 2020, nascidos: 236, prenatal7: 75.0 }, { ano: 2021, nascidos: 234, prenatal7: 76.5 },
  { ano: 2022, nascidos: 236, prenatal7: 83.05 }, { ano: 2023, nascidos: 206, prenatal7: 80.58 },
  { ano: 2024, nascidos: 194, prenatal7: 79.9 },
];

/** Internacoes hospitalares (SIH/SUS) de residentes por capitulo CID-10, 2025 (ano fechado). */
export const INTERNACOES_2025_TOTAL = 2076;
export const INTERNACOES_2024_TOTAL = 2343;
export const INTERNACOES_2025_CAUSAS: { causa: string; n: number }[] = [
  { causa: "Aparelho respiratorio", n: 351 }, { causa: "Infecciosas e parasitarias", n: 269 },
  { causa: "Aparelho circulatorio", n: 214 }, { causa: "Aparelho digestivo", n: 213 },
  { causa: "Aparelho geniturinario", n: 187 }, { causa: "Lesoes / causas externas", n: 178 },
  { causa: "Transtornos mentais", n: 176 }, { causa: "Neoplasias (tumores)", n: 134 },
];

/** Saneamento basico (IBGE, Censo 2022). Total de domicilios: 9.932. */
export const SANEAMENTO_TOTAL_DOM = 9932;
export const AGUA_2022: { categoria: string; domicilios: number }[] = [
  { categoria: "Rede geral de distribuicao", domicilios: 7450 },
  { categoria: "Poco profundo ou artesiano", domicilios: 1302 },
  { categoria: "Poco raso, freatico ou cacimba", domicilios: 888 },
  { categoria: "Fonte, nascente ou mina", domicilios: 245 },
  { categoria: "Outras formas", domicilios: 47 },
];
export const ESGOTO_2022: { categoria: string; domicilios: number; adequado: boolean }[] = [
  { categoria: "Rede geral ou fossa ligada a rede", domicilios: 6846, adequado: true },
  { categoria: "Fossa septica nao ligada a rede", domicilios: 851, adequado: true },
  { categoria: "Fossa rudimentar ou buraco", domicilios: 2197, adequado: false },
  { categoria: "Vala, rio ou outra", domicilios: 38, adequado: false },
];

/** Leitos por 1.000 habitantes (referencia). Piracanjuba considera apenas os 34 leitos do Hospital Municipal (piso). */
export const LEITOS_1000 = [
  { rotulo: "Piracanjuba (Hosp. Municipal)", valor: 1.37, destaque: true },
  { rotulo: "Brasil - SUS (referencia)", valor: 1.4, destaque: false },
  { rotulo: "Brasil - total (referencia)", valor: 2.1, destaque: false },
];
