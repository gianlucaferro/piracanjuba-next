// Quadro regular de ônibus com passagem por Piracanjuba, montado a partir dos quadros
// oficiais de horários da AGR (linhas dentro de Goiás).
//
// Os quadros informam a partida na cidade de origem da linha. O horário de passagem por
// Piracanjuba é uma previsão: a partida na origem mais o tempo medido nas consultas aos
// canais de venda (ClickBus). As consultas de 2026-09-10 e 2026-11-04 e as de 2026-11-26
// (datas de 2026-11-26 a 2026-12-04, nos dois sentidos) bateram com o quadro, salvo as
// exceções datadas em BUS_REGULAR_EXCEPTIONS.
//
// Uberlândia e Araguari: a ANTT autoriza as seções Piracanjuba a Uberlândia e a Araguari na
// linha GOSP0080013 (Rotas de Viação do Triângulo), mas a venda não oferece a viagem direta
// (ClickBus em 2026-11-04 e 2026-11-27, site da RodeRotas em 2026-12-02). Até haver venda,
// esses destinos ficam só com a orientação de conexão em BUS_CONNECTION_NOTES.
//
// Conferência semanal: scripts/onibus/conferir-quadros-agr.mjs compara os links dos quadros
// publicados pela AGR com os documentos abaixo e falha quando a AGR publica um quadro novo.
// O quadro da ANTT (painel Power BI) não tem consulta automática: conferir à mão.

export type BusRegularSource = { name: string; url: string };

export type BusRegularService = {
  /** Identificador estável do serviço, usado no ID de cada partida gerada. */
  id: string;
  destinationId: string;
  operatorId: string;
  authority: "AGR" | "ANTT";
  /** Número da linha no órgão regulador. */
  line: string;
  lineName: string;
  /** Cidade de origem da linha e horário de partida nela, conforme o quadro oficial. */
  origin: string;
  /** Destino cadastrado que corresponde à cidade de origem, para o sentido de chegada. */
  originId: string;
  originDeparture: string;
  /** Chegada prevista a Piracanjuba, quando o ônibus para antes de seguir (padrão: departure). */
  arrivalInPiracanjuba?: string;
  /** Passagem prevista por Piracanjuba e chegada prevista ao destino, no mesmo dia. */
  departure: string;
  arrival: string;
  /** Dias da semana em que a linha parte (0 = domingo, 6 = sábado). */
  weekdays: number[];
  serviceClasses: string[];
  /** Classes adicionais em dias específicos da semana. */
  weekdayClasses?: Partial<Record<number, string[]>>;
  boarding: { name: string; address?: string; verified: boolean };
  stops: { name: string; time: string }[];
  alighting?: { name: string; address?: string };
  /** Documento oficial do quadro (PDF da AGR ou painel da ANTT). */
  document: BusRegularSource & { authorizedOn: string };
  /** Consultas aos canais de venda que confirmaram o horário de passagem. */
  observedOn: BusRegularSource[];
};

/** Data em que os quadros abaixo foram conferidos nas fontes oficiais. */
export const BUS_REGULAR_CHECKED_AT = "2026-11-26";
/** Primeira data atendida pelo quadro regular; antes dela, só valem os registros datados. */
export const BUS_REGULAR_VALID_FROM = "2026-11-26";

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const PIRACANJUBA = { name: "Embarque em Piracanjuba", verified: false };
const CONEGO_OLINTO = { name: "Embarque em Piracanjuba", address: "Rua Cônego Olinto, Piracanjuba, GO, CEP 75640-000", verified: true };

const clickbus = (slug: string, date: string): BusRegularSource => ({
  name: `ClickBus, consulta de ${date}`,
  url: `https://www.clickbus.com.br/onibus/piracanjuba-go/${slug}?departureDate=${date}`,
});

const AGR_MARLY = {
  name: "AGR, quadro da linha 03.284-00 (Expresso Marly)",
  url: "https://goias.gov.br/agr/wp-content/uploads/sites/43/2026/04/QH-Linha-no-03.284-00-Goiania-a-Caldas-Novas-via-BR-153-e-Piracanjuba-1.pdf",
  authorizedOn: "2026-04-10",
};
const AGR_UNIAO = {
  name: "AGR, quadro da linha 10.287-00 (Expresso União)",
  url: "https://goias.gov.br/agr/wp-content/uploads/sites/43/2026/04/QH-Linha-no-10.287-00-Goiania-a-Caldas-Novas-via-BR-153-e-Piracanjuba.pdf",
  authorizedOn: "2026-04-24",
};
const AGR_REAL_BR153 = {
  name: "AGR, quadro da linha 06.283-00 (Real Expresso)",
  url: "https://goias.gov.br/agr/wp-content/uploads/sites/43/2026/09/QH-Linha-06.283-00-Goiania-a-Caldas-Novas-via-BR-153-e-Piracanjuba.pdf",
  authorizedOn: "2026-09-02",
};
const AGR_REAL_GO020 = {
  name: "AGR, quadro da linha 06.282-00 (Real Expresso)",
  url: "https://goias.gov.br/agr/wp-content/uploads/sites/43/2026/09/H-Linha-06.282-00-Goiania-a-Caldas-Novas-via-GO-020-e-Piracanjuba.pdf",
  authorizedOn: "2026-09-02",
};

/** Documentos da AGR conferidos pelo monitor semanal. */
export const BUS_REGULAR_AGR_DOCUMENTS = [AGR_MARLY, AGR_UNIAO, AGR_REAL_BR153, AGR_REAL_GO020].map((item) => item.url);

const marlyToGoiania = (originDeparture: string, departure: string, arrival: string): BusRegularService => ({
  id: `marly-goiania-${departure.replace(":", "")}`,
  destinationId: "goiania",
  operatorId: "marly",
  authority: "AGR",
  line: "03.284-00",
  lineName: "Goiânia a Caldas Novas (via BR-153 e Piracanjuba)",
  origin: "Caldas Novas",
  originId: "caldas-novas",
  originDeparture,
  departure,
  arrival,
  weekdays: EVERY_DAY,
  serviceClasses: ["Convencional", "Leito"],
  boarding: PIRACANJUBA,
  stops: [],
  document: AGR_MARLY,
  observedOn: [clickbus("goiania-go", "2026-11-04"), clickbus("goiania-go", "2026-11-28"), clickbus("goiania-go", "2026-12-02")],
});

const marlyToCaldas = (originDeparture: string, departure: string, arrival: string): BusRegularService => ({
  id: `marly-caldas-novas-${departure.replace(":", "")}`,
  destinationId: "caldas-novas",
  operatorId: "marly",
  authority: "AGR",
  line: "03.284-00",
  lineName: "Goiânia a Caldas Novas (via BR-153 e Piracanjuba)",
  origin: "Goiânia",
  originId: "goiania",
  originDeparture,
  departure,
  arrival,
  weekdays: EVERY_DAY,
  serviceClasses: ["Convencional", "Leito"],
  boarding: PIRACANJUBA,
  stops: [],
  document: AGR_MARLY,
  observedOn: [clickbus("caldas-novas-go", "2026-11-04"), clickbus("caldas-novas-go", "2026-11-27"), clickbus("caldas-novas-go", "2026-12-02")],
});

export const BUS_REGULAR_SERVICES: BusRegularService[] = [
  // Expresso Marly, linha 03.284-00: partidas de Caldas Novas às 7h, 10h, 12h30 e 18h30
  // (passa 1h depois) e de Goiânia às 6h45, 11h30, 14h30 e 17h30 (passa 1h30 depois).
  marlyToGoiania("07:00", "08:00", "09:30"),
  marlyToGoiania("10:00", "11:00", "12:30"),
  marlyToGoiania("12:30", "13:30", "15:00"),
  marlyToGoiania("18:30", "19:30", "21:00"),
  marlyToCaldas("06:45", "08:15", "09:40"),
  marlyToCaldas("11:30", "13:00", "14:25"),
  marlyToCaldas("14:30", "16:00", "17:25"),
  marlyToCaldas("17:30", "19:00", "20:25"),
  // Expresso União, linha 10.287-00: Caldas Novas às 12h e Goiânia às 7h30, todos os dias.
  {
    id: "uniao-goiania-1315",
    destinationId: "goiania",
    operatorId: "uniao",
    authority: "AGR",
    line: "10.287-00",
    lineName: "Goiânia a Caldas Novas (via BR-153 e Piracanjuba)",
    origin: "Caldas Novas",
    originId: "caldas-novas",
    originDeparture: "12:00",
    departure: "13:15",
    arrival: "15:00",
    weekdays: EVERY_DAY,
    serviceClasses: ["Convencional"],
    boarding: PIRACANJUBA,
    stops: [],
    document: AGR_UNIAO,
    observedOn: [clickbus("goiania-go", "2026-11-04"), clickbus("goiania-go", "2026-11-28"), clickbus("goiania-go", "2026-12-02")],
  },
  {
    id: "uniao-caldas-novas-0915",
    destinationId: "caldas-novas",
    operatorId: "uniao",
    authority: "AGR",
    line: "10.287-00",
    lineName: "Goiânia a Caldas Novas (via BR-153 e Piracanjuba)",
    origin: "Goiânia",
    originId: "goiania",
    originDeparture: "07:30",
    departure: "09:15",
    arrival: "10:30",
    weekdays: EVERY_DAY,
    serviceClasses: ["Convencional"],
    boarding: PIRACANJUBA,
    stops: [],
    document: AGR_UNIAO,
    observedOn: [clickbus("caldas-novas-go", "2026-11-04"), clickbus("caldas-novas-go", "2026-11-27"), clickbus("caldas-novas-go", "2026-12-02")],
  },
  // Real Expresso: pela BR-153 (06.283-00) todos os dias menos quarta; pela GO-020, com
  // parada em Bela Vista de Goiás (06.282-00), só na quarta. Partidas às 10h30 de Goiânia
  // e às 14h30 de Caldas Novas.
  {
    id: "real-goiania-br153-1550",
    destinationId: "goiania",
    operatorId: "real",
    authority: "AGR",
    line: "06.283-00",
    lineName: "Goiânia a Caldas Novas (via BR-153 e Piracanjuba)",
    origin: "Caldas Novas",
    originId: "caldas-novas",
    originDeparture: "14:30",
    arrivalInPiracanjuba: "15:45",
    departure: "15:50",
    arrival: "17:30",
    weekdays: [0, 1, 2, 4, 5, 6],
    serviceClasses: ["Convencional"],
    boarding: CONEGO_OLINTO,
    stops: [{ name: "Hidrolândia", time: "16:35" }, { name: "Aparecida de Goiânia", time: "17:00" }],
    document: AGR_REAL_BR153,
    observedOn: [clickbus("goiania-go", "2026-09-10"), clickbus("goiania-go", "2026-11-28")],
  },
  {
    id: "real-goiania-go020-1535",
    destinationId: "goiania",
    operatorId: "real",
    authority: "AGR",
    line: "06.282-00",
    lineName: "Goiânia a Caldas Novas (via GO-020 e Piracanjuba)",
    origin: "Caldas Novas",
    originId: "caldas-novas",
    originDeparture: "14:30",
    arrivalInPiracanjuba: "15:30",
    departure: "15:35",
    arrival: "17:10",
    weekdays: [3],
    serviceClasses: ["Convencional"],
    boarding: CONEGO_OLINTO,
    stops: [{ name: "Bela Vista de Goiás", time: "16:20" }],
    document: AGR_REAL_GO020,
    observedOn: [clickbus("goiania-go", "2026-11-04"), clickbus("goiania-go", "2026-12-02")],
  },
  {
    id: "real-caldas-novas-br153-1215",
    destinationId: "caldas-novas",
    operatorId: "real",
    authority: "AGR",
    line: "06.283-00",
    lineName: "Goiânia a Caldas Novas (via BR-153 e Piracanjuba)",
    origin: "Goiânia",
    originId: "goiania",
    originDeparture: "10:30",
    arrivalInPiracanjuba: "12:10",
    departure: "12:15",
    arrival: "13:30",
    weekdays: [0, 1, 2, 4, 5, 6],
    serviceClasses: ["Convencional"],
    boarding: CONEGO_OLINTO,
    stops: [],
    alighting: { name: "Rodoviária de Caldas Novas", address: "Rua Ernesto Shinona, 1, Caldas Novas, GO" },
    document: AGR_REAL_BR153,
    observedOn: [clickbus("caldas-novas-go", "2026-09-10"), clickbus("caldas-novas-go", "2026-11-27")],
  },
  {
    id: "real-caldas-novas-go020-1210",
    destinationId: "caldas-novas",
    operatorId: "real",
    authority: "AGR",
    line: "06.282-00",
    lineName: "Goiânia a Caldas Novas (via GO-020 e Piracanjuba)",
    origin: "Goiânia",
    originId: "goiania",
    originDeparture: "10:30",
    arrivalInPiracanjuba: "12:05",
    departure: "12:10",
    arrival: "13:10",
    weekdays: [3],
    serviceClasses: ["Convencional"],
    boarding: PIRACANJUBA,
    stops: [],
    document: AGR_REAL_GO020,
    observedOn: [clickbus("caldas-novas-go", "2026-11-04"), clickbus("caldas-novas-go", "2026-12-02")],
  },
];

/**
 * Datas em que a venda mostrou horário diferente do quadro. Valem só para a data indicada e
 * substituem os horários do serviço naquele dia, nos dois sentidos.
 */
export type BusRegularException = {
  date: string;
  serviceId: string;
  originDeparture: string;
  departure: string;
  arrival: string;
  arrivalInPiracanjuba?: string;
  source: BusRegularSource;
};

export const BUS_REGULAR_EXCEPTIONS: BusRegularException[] = [
  // Expresso União para Goiânia: em 2026-11-26 e 2026-11-27 a venda mostrou saída de Caldas
  // Novas às 12:45, passagem às 14:00 e chegada às 15:45; nas datas de 2026-11-28 a
  // 2026-12-04, o horário do quadro (12:00, 13:15 e 15:00).
  ...["2026-11-26", "2026-11-27"].map((date) => ({
    date,
    serviceId: "uniao-goiania-1315",
    originDeparture: "12:45",
    departure: "14:00",
    arrival: "15:45",
    source: { name: `ClickBus, consulta de ${date}`, url: `https://www.clickbus.com.br/onibus/piracanjuba-go/goiania-go?departureDate=${date}` },
  })),
];

/** Destinos sem linha direta regular: a orientação mostrada no lugar dos horários. */
export const BUS_CONNECTION_NOTES: Record<string, { via: string; text: string; checkedAt: string }> = {
  uberlandia: {
    via: "Goiânia",
    text: "Não há linha direta regular entre Piracanjuba e Uberlândia à venda. Os canais oferecem viagens com troca de ônibus em Goiânia: veja os horários para Goiânia e consulte o trecho seguinte.",
    checkedAt: "2026-11-26",
  },
  araguari: {
    via: "Caldas Novas",
    text: "Não há linha direta regular entre Piracanjuba e Araguari à venda. Os canais oferecem viagens com troca de ônibus em Caldas Novas: veja os horários para Caldas Novas e consulte o trecho seguinte.",
    checkedAt: "2026-11-26",
  },
};
