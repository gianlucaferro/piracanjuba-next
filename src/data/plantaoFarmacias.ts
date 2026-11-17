import { brazilDate, weekForDate } from "../lib/civic-day.ts";

export interface Farmacia {
  nome: string;
  telefone: string;
  tipo: "whatsapp" | "fixo";
}

export interface SemanaPlantao {
  inicio: string; // "YYYY-MM-DD"
  farmacia24h: Farmacia | null;
  demais: Farmacia[];
}

function f(nome: string, telefone = ""): Farmacia {
  const tipo = !telefone || telefone.includes("3405") ? "fixo" : "whatsapp";
  return { nome, telefone, tipo };
}

// Fonte: docs/fontes/plantao-farmacias/escala-2026-2027-atualizada-2026-09-07.pdf
// O documento imprime 2016 em 2026-04-04 e não informa 24h em 2026-03-14.
export const PLANTAO_FARMACIAS: SemanaPlantao[] = [
  {
    inicio: "2026-03-14",
    farmacia24h: null,
    demais: [f("Drogaria São Sebastião", "(64) 3405-1734"), f("Drogamais", "(64) 99265-4341"), f("Drogaria Do Lar", "(64) 3405-1448"), f("Drogaria JM Popular", "(64) 99203-0312"), f("Drogaria Vitae")],
  },
  {
    inicio: "2026-03-21",
    farmacia24h: f("Drogaria do Povo", "(64) 99218-0444"),
    demais: [f("Drogaria Santa Luzia", "(64) 3405-3028"), f("Farma Vidda", "(64) 99237-3232"), f("Drogaria Machado", "(64) 3405-1859"), f("Drogaria São Marcos")],
  },
  {
    inicio: "2026-03-28",
    farmacia24h: f("Drogaria Nacional", "(64) 3405-1815"),
    demais: [f("Drogaria Central", "(64) 99327-9097"), f("Droganova", "(64) 99607-4282"), f("Drogaria Oriental", "(64) 3405-5779")],
  },
  {
    inicio: "2026-04-04",
    farmacia24h: f("Drogaria São José", "(64) 3405-3093"),
    demais: [f("Drogaria Preço Popular", "(64) 3405-5401"), f("Drogaria Santa Rita", "(64) 3405-1361"), f("Drogaria São Pedro", "(64) 99246-4938")],
  },
  {
    inicio: "2026-04-11",
    farmacia24h: f("Drogaria Marina", "(64) 99334-3139"),
    demais: [f("Drogaria Bem Estar", "(64) 99280-9691"), f("Drogaria Piracanjuba", "(64) 3405-1441"), f("Drogaria Aliança", "(64) 3405-2252"), f("Drogaria Hiper Pop")],
  },
  {
    inicio: "2026-04-18",
    farmacia24h: f("Drogaria São Sebastião", "(64) 3405-1734"),
    demais: [f("Drogamais", "(64) 99265-4341"), f("Drogaria Do Lar", "(64) 3405-1448"), f("Drogaria JM Popular", "(64) 99203-0312"), f("Drogaria Vitae")],
  },
  {
    inicio: "2026-04-25",
    farmacia24h: f("Drogaria Santa Luzia", "(64) 3405-3028"),
    demais: [f("Drogaria do Povo", "(64) 99218-0444"), f("Farma Vidda", "(64) 99237-3232"), f("Drogaria Machado", "(64) 3405-1859"), f("Drogaria São Marcos")],
  },
  {
    inicio: "2026-05-02",
    farmacia24h: f("Drogaria Central", "(64) 99327-9097"),
    demais: [f("Drogaria Nacional", "(64) 3405-1815"), f("Droganova", "(64) 99607-4282"), f("Drogaria Oriental", "(64) 3405-5779")],
  },
  {
    inicio: "2026-05-09",
    farmacia24h: f("Drogaria Preço Popular", "(64) 3405-5401"),
    demais: [f("Drogaria São José", "(64) 3405-3093"), f("Drogaria Santa Rita", "(64) 3405-1361"), f("Drogaria São Pedro", "(64) 99246-4938")],
  },
  {
    inicio: "2026-05-16",
    farmacia24h: f("Drogaria Piracanjuba", "(64) 3405-1441"),
    demais: [f("Drogaria Bem Estar", "(64) 99280-9691"), f("Drogaria Marina", "(64) 99334-3139"), f("Drogaria Aliança", "(64) 3405-2252"), f("Drogaria Hiper Pop")],
  },
  {
    inicio: "2026-05-23",
    farmacia24h: f("Drogamais", "(64) 99265-4341"),
    demais: [f("Drogaria São Sebastião", "(64) 3405-1734"), f("Drogaria Do Lar", "(64) 3405-1448"), f("Drogaria JM Popular", "(64) 99203-0312"), f("Drogaria Vitae")],
  },
  {
    inicio: "2026-05-30",
    farmacia24h: f("Farma Vidda", "(64) 99237-3232"),
    demais: [f("Drogaria do Povo", "(64) 99218-0444"), f("Drogaria Santa Luzia", "(64) 3405-3028"), f("Drogaria Machado", "(64) 3405-1859"), f("Drogaria São Marcos")],
  },
  {
    inicio: "2026-06-06",
    farmacia24h: f("Droganova", "(64) 99607-4282"),
    demais: [f("Drogaria Nacional", "(64) 3405-1815"), f("Drogaria Central", "(64) 99327-9097"), f("Drogaria Oriental", "(64) 3405-5779")],
  },
  {
    inicio: "2026-06-13",
    farmacia24h: f("Drogaria Santa Rita", "(64) 3405-1361"),
    demais: [f("Drogaria São José", "(64) 3405-3093"), f("Drogaria Preço Popular", "(64) 3405-5401"), f("Drogaria São Pedro", "(64) 99246-4938")],
  },
  {
    inicio: "2026-06-20",
    farmacia24h: f("Drogaria Aliança", "(64) 3405-2252"),
    demais: [f("Drogaria Bem Estar", "(64) 99280-9691"), f("Drogaria Marina", "(64) 99334-3139"), f("Drogaria Piracanjuba", "(64) 3405-1441"), f("Drogaria Hiper Pop")],
  },
  {
    inicio: "2026-06-27",
    farmacia24h: f("Drogaria Do Lar", "(64) 3405-1448"),
    demais: [f("Drogaria São Sebastião", "(64) 3405-1734"), f("Drogamais", "(64) 99265-4341"), f("Drogaria JM Popular", "(64) 99203-0312"), f("Drogaria Vitae")],
  },
  {
    inicio: "2026-07-04",
    farmacia24h: f("Drogaria Machado", "(64) 3405-1859"),
    demais: [f("Drogaria do Povo", "(64) 99218-0444"), f("Drogaria Santa Luzia", "(64) 3405-3028"), f("Farma Vidda", "(64) 99237-3232"), f("Drogaria São Marcos")],
  },
  {
    inicio: "2026-07-11",
    farmacia24h: f("Drogaria Oriental", "(64) 3405-5779"),
    demais: [f("Drogaria Nacional", "(64) 3405-1815"), f("Drogaria Central", "(64) 99327-9097"), f("Droganova", "(64) 99607-4282")],
  },
  {
    inicio: "2026-07-18",
    farmacia24h: f("Drogaria São Pedro", "(64) 99246-4938"),
    demais: [f("Drogaria São José", "(64) 3405-3093"), f("Drogaria Preço Popular", "(64) 3405-5401"), f("Drogaria Santa Rita", "(64) 3405-1361")],
  },
  {
    inicio: "2026-07-25",
    farmacia24h: f("Drogaria Hiper Pop"),
    demais: [f("Drogaria Bem Estar", "(64) 99280-9691"), f("Drogaria Marina", "(64) 99334-3139"), f("Drogaria Piracanjuba", "(64) 3405-1441"), f("Drogaria Aliança", "(64) 3405-2252")],
  },
  {
    inicio: "2026-08-01",
    farmacia24h: f("Drogaria JM Popular", "(64) 99203-0312"),
    demais: [f("Drogaria São Sebastião", "(64) 3405-1734"), f("Drogamais", "(64) 99265-4341"), f("Drogaria Do Lar", "(64) 3405-1448"), f("Drogaria Vitae")],
  },
  {
    inicio: "2026-08-08",
    farmacia24h: f("Drogaria São Marcos"),
    demais: [f("Drogaria do Povo", "(64) 99218-0444"), f("Drogaria Santa Luzia", "(64) 3405-3028"), f("Farma Vidda", "(64) 99237-3232"), f("Drogaria Machado", "(64) 3405-1859")],
  },
  {
    inicio: "2026-08-15",
    farmacia24h: f("Drogaria Nacional", "(64) 3405-1815"),
    demais: [f("Drogaria Central", "(64) 99327-9097"), f("Droganova", "(64) 99607-4282"), f("Drogaria Oriental", "(64) 3405-5779")],
  },
  {
    inicio: "2026-08-22",
    farmacia24h: f("Drogaria São José", "(64) 3405-3093"),
    demais: [f("Drogaria Preço Popular", "(64) 3405-5401"), f("Drogaria Santa Rita", "(64) 3405-1361"), f("Drogaria São Pedro", "(64) 99246-4938")],
  },
  {
    inicio: "2026-08-29",
    farmacia24h: f("Drogaria Bem Estar", "(64) 99280-9691"),
    demais: [f("Drogaria Marina", "(64) 99334-3139"), f("Drogaria Piracanjuba", "(64) 3405-1441"), f("Drogaria Aliança", "(64) 3405-2252"), f("Drogaria Hiper Pop")],
  },
  {
    inicio: "2026-09-05",
    farmacia24h: f("Drogaria Vitae"),
    demais: [f("Drogaria São Sebastião", "(64) 3405-1734"), f("Drogamais", "(64) 99265-4341"), f("Drogaria Do Lar", "(64) 3405-1448"), f("Drogaria JM Popular", "(64) 99203-0312")],
  },
  {
    inicio: "2026-09-12",
    farmacia24h: f("Drogaria do Povo", "(64) 99218-0444"),
    demais: [f("Drogaria Santa Luzia", "(64) 3405-3028"), f("Farma Vidda", "(64) 99237-3232"), f("Drogaria Machado", "(64) 3405-1859"), f("Drogaria São Marcos")],
  },
  {
    inicio: "2026-09-19",
    farmacia24h: f("Drogaria Central", "(64) 99327-9097"),
    demais: [f("Drogaria Nacional", "(64) 3405-1815"), f("Droganova", "(64) 99607-4282"), f("Drogaria Oriental", "(64) 3405-5779")],
  },
  {
    inicio: "2026-09-26",
    farmacia24h: f("Drogaria Preço Popular", "(64) 3405-5401"),
    demais: [f("Drogaria São José", "(64) 3405-3093"), f("Drogaria Santa Rita", "(64) 3405-1361"), f("Drogaria São Pedro", "(64) 99246-4938")],
  },
  {
    inicio: "2026-10-03",
    farmacia24h: f("Drogaria Marina", "(64) 99334-3139"),
    demais: [f("Drogaria Bem Estar", "(64) 99280-9691"), f("Drogaria Piracanjuba", "(64) 3405-1441"), f("Drogaria Aliança", "(64) 3405-2252"), f("Drogaria Hiper Pop")],
  },
  {
    inicio: "2026-10-10",
    farmacia24h: f("Drogaria São Sebastião", "(64) 3405-1734"),
    demais: [f("Drogamais", "(64) 99265-4341"), f("Drogaria Do Lar", "(64) 3405-1448"), f("Drogaria JM Popular", "(64) 99203-0312"), f("Drogaria Vitae")],
  },
  {
    inicio: "2026-10-17",
    farmacia24h: f("Drogaria Santa Luzia", "(64) 3405-3028"),
    demais: [f("Drogaria do Povo", "(64) 99218-0444"), f("Farma Vidda", "(64) 99237-3232"), f("Drogaria Machado", "(64) 3405-1859"), f("Drogaria São Marcos")],
  },
  {
    inicio: "2026-10-24",
    farmacia24h: f("Droganova", "(64) 99607-4282"),
    demais: [f("Drogaria Nacional", "(64) 3405-1815"), f("Drogaria Central", "(64) 99327-9097"), f("Drogaria Oriental", "(64) 3405-5779")],
  },
  {
    inicio: "2026-10-31",
    farmacia24h: f("Drogaria Santa Rita", "(64) 3405-1361"),
    demais: [f("Drogaria São José", "(64) 3405-3093"), f("Drogaria Preço Popular", "(64) 3405-5401"), f("Drogaria São Pedro", "(64) 99246-4938")],
  },
  {
    inicio: "2026-11-07",
    farmacia24h: f("Drogaria Piracanjuba", "(64) 3405-1441"),
    demais: [f("Drogaria Bem Estar", "(64) 99280-9691"), f("Drogaria Marina", "(64) 99334-3139"), f("Drogaria Aliança", "(64) 3405-2252"), f("Drogaria Hiper Pop")],
  },
  {
    inicio: "2026-11-14",
    farmacia24h: f("Drogamais", "(64) 99265-4341"),
    demais: [f("Drogaria São Sebastião", "(64) 3405-1734"), f("Drogaria Do Lar", "(64) 3405-1448"), f("Drogaria JM Popular", "(64) 99203-0312"), f("Drogaria Vitae")],
  },
  {
    inicio: "2026-11-21",
    farmacia24h: f("Farma Vidda", "(64) 99237-3232"),
    demais: [f("Drogaria do Povo", "(64) 99218-0444"), f("Drogaria Santa Luzia", "(64) 3405-3028"), f("Drogaria Machado", "(64) 3405-1859"), f("Drogaria São Marcos")],
  },
  {
    inicio: "2026-11-28",
    farmacia24h: f("Drogaria Oriental", "(64) 3405-5779"),
    demais: [f("Drogaria Nacional", "(64) 3405-1815"), f("Drogaria Central", "(64) 99327-9097"), f("Droganova", "(64) 99607-4282")],
  },
  {
    inicio: "2026-12-05",
    farmacia24h: f("Drogaria São Pedro", "(64) 99246-4938"),
    demais: [f("Drogaria São José", "(64) 3405-3093"), f("Drogaria Preço Popular", "(64) 3405-5401"), f("Drogaria Santa Rita", "(64) 3405-1361")],
  },
  {
    inicio: "2026-12-12",
    farmacia24h: f("Drogaria Aliança", "(64) 3405-2252"),
    demais: [f("Drogaria Bem Estar", "(64) 99280-9691"), f("Drogaria Marina", "(64) 99334-3139"), f("Drogaria Piracanjuba", "(64) 3405-1441"), f("Drogaria Hiper Pop")],
  },
  {
    inicio: "2026-12-19",
    farmacia24h: f("Drogaria Do Lar", "(64) 3405-1448"),
    demais: [f("Drogaria São Sebastião", "(64) 3405-1734"), f("Drogamais", "(64) 99265-4341"), f("Drogaria JM Popular", "(64) 99203-0312"), f("Drogaria Vitae")],
  },
  {
    inicio: "2026-12-26",
    farmacia24h: f("Drogaria Machado", "(64) 3405-1859"),
    demais: [f("Drogaria do Povo", "(64) 99218-0444"), f("Drogaria Santa Luzia", "(64) 3405-3028"), f("Farma Vidda", "(64) 99237-3232"), f("Drogaria São Marcos")],
  },
  {
    inicio: "2027-01-02",
    farmacia24h: f("Drogaria Nacional", "(64) 3405-1815"),
    demais: [f("Drogaria Central", "(64) 99327-9097"), f("Droganova", "(64) 99607-4282"), f("Drogaria Oriental", "(64) 3405-5779")],
  },
  {
    inicio: "2027-01-09",
    farmacia24h: f("Drogaria São José", "(64) 3405-3093"),
    demais: [f("Drogaria Preço Popular", "(64) 3405-5401"), f("Drogaria Santa Rita", "(64) 3405-1361"), f("Drogaria São Pedro", "(64) 99246-4938")],
  },
  {
    inicio: "2027-01-16",
    farmacia24h: f("Drogaria Hiper Pop"),
    demais: [f("Drogaria Bem Estar", "(64) 99280-9691"), f("Drogaria Marina", "(64) 99334-3139"), f("Drogaria Piracanjuba", "(64) 3405-1441"), f("Drogaria Aliança", "(64) 3405-2252")],
  },
  {
    inicio: "2027-01-23",
    farmacia24h: f("Drogaria JM Popular", "(64) 99203-0312"),
    demais: [f("Drogaria São Sebastião", "(64) 3405-1734"), f("Drogamais", "(64) 99265-4341"), f("Drogaria Do Lar", "(64) 3405-1448"), f("Drogaria Vitae")],
  },
  {
    inicio: "2027-01-30",
    farmacia24h: f("Drogaria São Marcos"),
    demais: [f("Drogaria do Povo", "(64) 99218-0444"), f("Drogaria Santa Luzia", "(64) 3405-3028"), f("Farma Vidda", "(64) 99237-3232"), f("Drogaria Machado", "(64) 3405-1859")],
  },
  {
    inicio: "2027-02-06",
    farmacia24h: f("Drogaria Central", "(64) 99327-9097"),
    demais: [f("Drogaria Nacional", "(64) 3405-1815"), f("Droganova", "(64) 99607-4282"), f("Drogaria Oriental", "(64) 3405-5779")],
  },
  {
    inicio: "2027-02-13",
    farmacia24h: f("Drogaria Preço Popular", "(64) 3405-5401"),
    demais: [f("Drogaria São José", "(64) 3405-3093"), f("Drogaria Santa Rita", "(64) 3405-1361"), f("Drogaria São Pedro", "(64) 99246-4938")],
  },
  {
    inicio: "2027-02-20",
    farmacia24h: f("Drogaria Bem Estar", "(64) 99280-9691"),
    demais: [f("Drogaria Marina", "(64) 99334-3139"), f("Drogaria Piracanjuba", "(64) 3405-1441"), f("Drogaria Aliança", "(64) 3405-2252"), f("Drogaria Hiper Pop")],
  },
];

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDia(d: Date): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function getDatasPeriodo(semana: SemanaPlantao, nextSemana?: SemanaPlantao): { inicio: Date; fim: Date } {
  const inicio = parseDate(semana.inicio);
  let fim: Date;
  if (nextSemana) {
    fim = parseDate(nextSemana.inicio);
    fim.setDate(fim.getDate() - 1);
  } else {
    fim = new Date(inicio);
    fim.setDate(fim.getDate() + 6);
  }
  return { inicio, fim };
}

export function getPeriodo(semana: SemanaPlantao, nextSemana?: SemanaPlantao): { de: string; ate: string } {
  const { inicio, fim } = getDatasPeriodo(semana, nextSemana);
  return { de: formatDia(inicio), ate: formatDia(fim) };
}

// Período com ano, para leitura fora de contexto: "14 a 20 de novembro de 2026",
// "28 de novembro a 4 de dezembro de 2026", "26 de dezembro de 2026 a 1 de janeiro de 2027".
export function formatPeriodoCompleto(semana: SemanaPlantao, nextSemana?: SemanaPlantao): string {
  const { inicio, fim } = getDatasPeriodo(semana, nextSemana);
  return formatIntervalo(inicio, fim);
}

// Do início da semana `primeira` ao fim da semana `ultima` (índices de PLANTAO_FARMACIAS).
export function formatPeriodoEscala(primeira: number, ultima: number): string {
  const { inicio } = getDatasPeriodo(PLANTAO_FARMACIAS[primeira]);
  const { fim } = getDatasPeriodo(PLANTAO_FARMACIAS[ultima], PLANTAO_FARMACIAS[ultima + 1]);
  return formatIntervalo(inicio, fim);
}

function formatIntervalo(inicio: Date, fim: Date): string {
  const anoFim = fim.getFullYear();
  if (inicio.getFullYear() !== anoFim) {
    return `${formatDia(inicio)} de ${inicio.getFullYear()} a ${formatDia(fim)} de ${anoFim}`;
  }
  if (inicio.getMonth() !== fim.getMonth()) {
    return `${formatDia(inicio)} a ${formatDia(fim)} de ${anoFim}`;
  }
  return `${inicio.getDate()} a ${formatDia(fim)} de ${anoFim}`;
}

// Data civil de Brasília (YYYY-MM-DD). A escala vira à meia-noite de Brasília; o fuso
// do servidor (UTC na Vercel) antecipava a virada para as 21h do dia anterior.
export function getHojeBrasil(agora: Date = new Date()): string {
  return brazilDate(agora);
}

// Índice da última semana já iniciada em Brasília (0 antes do início da escala).
export function getSemanaAtual(agora: Date = new Date()): number {
  const hoje = getHojeBrasil(agora);
  for (let i = PLANTAO_FARMACIAS.length - 1; i >= 0; i--) {
    if (PLANTAO_FARMACIAS[i].inicio <= hoje) return i;
  }
  return 0;
}

// Como getSemanaAtual, mas null quando a data de Brasília está fora da escala publicada.
export function getSemanaVigente(agora: Date = new Date()): number | null {
  const semana = weekForDate(PLANTAO_FARMACIAS, getHojeBrasil(agora));
  return semana ? PLANTAO_FARMACIAS.indexOf(semana) : null;
}

export interface EscalaOrganizada {
  hoje: string;
  atual: number | null;
  proxima: number | null;
  /** Semanas depois da próxima, em ordem cronológica. */
  futuras: number[];
  /** Semanas já encerradas, da mais recente para a mais antiga. */
  anteriores: number[];
}

// Ordem de leitura da página: semana vigente, próxima, seguintes e, no fim, as anteriores.
export function organizarEscala(agora: Date = new Date()): EscalaOrganizada {
  const hoje = getHojeBrasil(agora);
  const atual = getSemanaVigente(agora);
  const indices = PLANTAO_FARMACIAS.map((_, i) => i);
  const [proxima = null, ...futuras] = indices.filter((i) => PLANTAO_FARMACIAS[i].inicio > hoje);
  const anteriores = indices
    .filter((i) => i !== atual && PLANTAO_FARMACIAS[i].inicio <= hoje)
    .reverse();
  return { hoje, atual, proxima, futuras, anteriores };
}

export function getMesAno(semana: SemanaPlantao): string {
  const d = parseDate(semana.inicio);
  return `${MESES[d.getMonth()].charAt(0).toUpperCase() + MESES[d.getMonth()].slice(1)} ${d.getFullYear()}`;
}

export function getTelefoneLink(farmacia: Farmacia): string | null {
  const num = farmacia.telefone.replace(/\D/g, "");
  if (!num) return null;
  if (farmacia.tipo === "whatsapp") {
    const msg = encodeURIComponent("Olá, vim pelo Piracanjuba.ai. Estou precisando de ");
    return `https://wa.me/55${num}?text=${msg}`;
  }
  return `tel:+55${num}`;
}

const COORDS: Record<string, [number, number]> = {
  "Drogaria Bem Estar":      [-17.3043, -49.0221],
  "Drogaria do Povo":        [-17.3030, -49.0190],
  "Drogaria Nacional":       [-17.3035, -49.0250],
  "Drogaria São José":       [-17.3050, -49.0200],
  "Drogaria São Sebastião":  [-17.3040, -49.0217],
  "Drogaria Santa Luzia":    [-17.3040, -49.0217],
  "Drogamais":               [-17.3042, -49.0220],
  "Droganova":               [-17.3100, -49.0339],
  "Drogaria Central":        [-17.30434, -49.02208],
  "Drogaria Preço Popular":      [-17.3049, -49.0253],
  "Drogaria Marina":         [-17.3049, -49.0253],
  "Farma Vidda":      [-17.3040, -49.0200],
  "Drogaria JM Popular":     [-17.3100, -49.0339],
  "Drogaria Machado":        [-17.3041, -49.0217],
  "Drogaria Oriental":       [-17.29964, -49.02673],
  "Drogaria São Pedro":      [-17.3020, -49.0260],
  "Drogaria Aliança":        [-17.3126, -49.0342],
  "Drogaria Do Lar":         [-17.3041, -49.0217],
  "Drogaria Santa Rita":     [-17.30398, -49.02208],
  "Drogaria Piracanjuba":    [-17.30400, -49.02170],
  // Pinos dos perfis no Google Maps, conferidos em 2026-11-17:
  // R. Dom Pedro II, 571, Sala 1, Centro (endereço passado pelo operador).
  "Drogaria Hiper Pop":      [-17.3041424, -49.021731],
  // R. Prof. Percival Rabêlo (perfil com o WhatsApp (64) 99203-3777, o mesmo da placa).
  "Drogaria Vitae":          [-17.3007166, -49.0202679],
  // R. Cônego Olinto, 407 (endereço passado pelo operador).
  "Drogaria São Marcos":     [-17.304972, -49.0252867],
};

export interface ContatoCadastrado {
  nome: string;
  telefone: string | null;
  tipo_telefone: "whatsapp" | "fixo" | null;
}

function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Busca um cadastro (tabela farmacia_fotos) pelo nome exato ou normalizado.
export function criarBuscaPorNome<T extends { nome: string }>(itens: readonly T[]): (nome: string) => T | undefined {
  const porNome = new Map<string, T>();
  for (const item of itens) {
    porNome.set(item.nome, item);
    porNome.set(normalizarNome(item.nome), item);
  }
  return (nome) => porNome.get(nome) ?? porNome.get(normalizarNome(nome));
}

// Mesma regra do FarmaciaPlantaoCard: telefone cadastrado tem precedência sobre o da escala.
export function aplicarContatoCadastrado(farmacia: Farmacia, cadastro?: ContatoCadastrado): Farmacia {
  if (!cadastro?.telefone?.trim()) return farmacia;
  return {
    ...farmacia,
    telefone: cadastro.telefone,
    tipo: cadastro.tipo_telefone ?? (cadastro.telefone.includes("3405") ? "fixo" : "whatsapp"),
  };
}

function descreverContato(farmacia: Farmacia): string {
  if (!farmacia.telefone.replace(/\D/g, "")) return `${farmacia.nome}, telefone não informado na escala`;
  return `${farmacia.nome}, ${farmacia.tipo === "whatsapp" ? "WhatsApp" : "telefone"} ${farmacia.telefone}`;
}

// Frase-resposta da semana, com datas absolutas, para leitura direta e citação.
export function descreverPlantao(
  semana: SemanaPlantao,
  nextSemana?: SemanaPlantao,
  resolver: (farmacia: Farmacia) => Farmacia = (farmacia) => farmacia,
): string {
  const periodo = formatPeriodoCompleto(semana, nextSemana);
  const demais = semana.demais.map((farmacia) => descreverContato(resolver(farmacia))).join("; ");
  if (!semana.farmacia24h) {
    return `De ${periodo}, a escala não indica farmácia 24 horas em Piracanjuba. Estão de plantão: ${demais}.`;
  }
  const abertura = `De ${periodo}, a farmácia de plantão 24 horas em Piracanjuba é a ${descreverContato(resolver(semana.farmacia24h))}.`;
  return demais ? `${abertura} Também estão de plantão: ${demais}.` : abertura;
}

export function getWazeLink(farmacia: Farmacia): string | null {
  const c = COORDS[farmacia.nome];
  if (!c) return null;
  return `https://waze.com/ul?ll=${c[0]},${c[1]}&navigate=yes&zoom=17`;
}

function formatFarmaciaCompartilhamento(farmacia: Farmacia): string {
  return farmacia.telefone ? `${farmacia.nome}: ${farmacia.telefone}` : farmacia.nome;
}

// O resolver é o mesmo da tela (aplicarContatoCadastrado): a mensagem leva o telefone
// cadastrado que a linha mostra e, sem cadastro, o telefone da escala.
export function gerarTextoCompartilhamento(
  semana: SemanaPlantao,
  nextSemana?: SemanaPlantao,
  resolver: (farmacia: Farmacia) => Farmacia = (farmacia) => farmacia,
): string {
  const p = getPeriodo(semana, nextSemana);
  const farmacia24h = semana.farmacia24h && resolver(semana.farmacia24h);
  const lines = [
    "💊 *Plantão de Farmácias em Piracanjuba*",
    `📅 ${p.de} a ${p.ate}`,
    "",
    ...(farmacia24h
      ? ["🕐 *Farmácia 24h:*", formatFarmaciaCompartilhamento(farmacia24h)]
      : ["Farmácia 24h não informada nesta escala."]),
    "",
    farmacia24h ? "💊 *Demais farmácias de plantão:*" : "💊 *Farmácias de plantão:*",
    ...semana.demais.map((farmacia) => `• ${formatFarmaciaCompartilhamento(resolver(farmacia))}`),
    "",
    "Veja o calendário completo:",
    "https://piracanjuba.ai/plantao-farmacias",
    "",
    "_Fonte: Piracanjuba.ai_",
  ];
  return lines.join("\n");
}

export function getShareWhatsAppLink(
  semana: SemanaPlantao,
  nextSemana?: SemanaPlantao,
  resolver?: (farmacia: Farmacia) => Farmacia,
): string {
  return `https://wa.me/?text=${encodeURIComponent(gerarTextoCompartilhamento(semana, nextSemana, resolver))}`;
}
