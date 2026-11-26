import storedDepartures from "./horariosOnibus-registros.json" with { type: "json" };
import { BUS_CONNECTION_NOTES, BUS_REGULAR_CHECKED_AT, BUS_REGULAR_EXCEPTIONS, BUS_REGULAR_SERVICES, BUS_REGULAR_VALID_FROM, type BusRegularService } from "./horariosOnibusQuadro.ts";

export { BUS_CONNECTION_NOTES };

export type BusSource = { name: string; url: string };
export type BusDestination = {
  id: string;
  name: string;
  state: string;
  clickbusSlug: string;
  mobifacilSlug?: string;
};
export type BusOperator = {
  id: string;
  name: string;
  website: string;
  phones: { label: string; number: string }[];
  note?: string;
};
export type BusDeparture = {
  id: string;
  date: string;
  destinationId: string;
  operatorId: string;
  departure: string;
  arrival: string;
  arrivalDate: string;
  durationMinutes: number;
  serviceClasses: string[];
  boarding: { name: string; address?: string; verified: boolean };
  stops: { name: string; time: string }[];
  alighting?: { name: string; address?: string };
  connections?: { city: string; arrival: string; departure: string; operator: string }[];
  sources: BusSource[];
  checkedAt: string;
  /** Presente nas partidas geradas pelo quadro regular (horariosOnibusQuadro.ts). */
  regular?: {
    authority: "AGR" | "ANTT";
    line: string;
    lineName: string;
    origin: string;
    originDeparture: string;
    authorizedOn: string;
    /** Fonte da exceção datada, quando o horário do dia difere do quadro. */
    exception?: BusSource;
  };
};

/** Sentido da consulta: saindo de Piracanjuba ou chegando a ela. */
export type BusDirection = "saida" | "chegada";

/** Viagem que chega a Piracanjuba, prevista pelo quadro regular. */
export type BusArrival = {
  id: string;
  date: string;
  originId: string;
  operatorId: string;
  /** Partida na cidade de origem e chegada prevista a Piracanjuba. */
  departure: string;
  arrival: string;
  durationMinutes: number;
  serviceClasses: string[];
  stops: { name: string; time: string }[];
  sources: BusSource[];
  checkedAt: string;
  regular: NonNullable<BusDeparture["regular"]>;
};

export const BUS_CHECKED_AT = storedDepartures.reduce((latest, item) => item.checkedAt > latest ? item.checkedAt : latest, "");
/** Última conferência de qualquer fonte: registros datados ou quadro regular. */
export const BUS_LAST_REVIEW = BUS_CHECKED_AT > BUS_REGULAR_CHECKED_AT ? BUS_CHECKED_AT : BUS_REGULAR_CHECKED_AT;
export const BUS_SNAPSHOT_DATE = storedDepartures.reduce((latest, item) => item.date > latest ? item.date : latest, "");
export const BUS_TIME_ZONE = "America/Sao_Paulo";
export const BUS_REVIEW_INTERVAL_DAYS = 7;
export const BUS_DESTINATIONS: BusDestination[] = [
  { id: "goiania", name: "Goiânia", state: "GO", clickbusSlug: "goiania-go", mobifacilSlug: "goiania-go" },
  { id: "caldas-novas", name: "Caldas Novas", state: "GO", clickbusSlug: "caldas-novas-go" },
  { id: "araguari", name: "Araguari", state: "MG", clickbusSlug: "araguari-menegon-mg" },
  { id: "uberlandia", name: "Uberlândia", state: "MG", clickbusSlug: "uberlandia-mg" },
];
export const BUS_OPERATORS: BusOperator[] = [
  { id: "uniao", name: "Expresso União", website: "https://www.expressouniao.com.br/", phones: [{label: "Agência de Piracanjuba", number: "6434051306"}, {label: "Agência de Piracanjuba", number: "6434055803"}], note: "Contatos publicados pela própria transportadora. Confirme o ponto de embarque da sua viagem." },
  { id: "real", name: "Real Expresso", website: "https://viajeguanabara.com.br/viacao/real-expresso/", phones: [{label: "Atendimento Guanabara", number: "08007281992"}], note: "Guichê cadastrado na Rua Cônego Olinto, s/n. Atendimento das 08:00 às 18:00, de segunda a domingo." },
  { id: "marly", name: "Expresso Marly", website: "https://www.clickbus.com.br/onibus/piracanjuba-go/goiania-go", phones: [], note: "Consulte os detalhes da empresa e da viagem no canal de venda." },
  { id: "roderotas", name: "RodeRotas", website: "https://www.roderotas.com/", phones: [{label: "Atendimento RodeRotas",number:"08009408090"}], note: "Marca comercial que inclui Rotas de Viação do Triângulo. Confira destino e ponto de embarque na consulta." },
];

export function isBusDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function getBrazilDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: BUS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function getInitialBusDate(now: Date): string {
  return getBrazilDate(now);
}

export function getBusSearchUrl(destinationId: string, date: string, provider: "clickbus" | "mobifacil" = "clickbus", direction: BusDirection = "saida"): string | null {
  const destination = BUS_DESTINATIONS.find((item) => item.id === destinationId);
  if (!destination || !isBusDate(date)) return null;
  if (provider === "mobifacil") {
    if (!destination.mobifacilSlug) return null;
    const [year, month, day] = date.split("-");
    const route = direction === "chegada" ? `${destination.mobifacilSlug}/piracanjuba-go` : `piracanjuba-go/${destination.mobifacilSlug}`;
    return `https://www.mobifacil.com.br/passagem-de-onibus/${route}?date=${day}-${month}-${year}`;
  }
  const route = direction === "chegada" ? `${destination.clickbusSlug}/piracanjuba-go` : `piracanjuba-go/${destination.clickbusSlug}`;
  return `https://www.clickbus.com.br/onibus/${route}?departureDate=${date}`;
}

export function isBusDeparturePast(departure: BusDeparture, now: Date): boolean {
  return new Date(`${departure.date}T${departure.departure}:00-03:00`).getTime() <= now.getTime();
}

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Dia da semana da data (0 = domingo), sem depender do fuso de quem executa. */
export function getBusWeekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/**
 * Partidas previstas pelo quadro regular para a data. Valem a partir de
 * BUS_REGULAR_VALID_FROM; datas anteriores ficam só com os registros datados.
 */
function regularServicesFor(date: string): { service: BusRegularService; weekday: number; exception?: (typeof BUS_REGULAR_EXCEPTIONS)[number] }[] {
  if (!isBusDate(date) || date < BUS_REGULAR_VALID_FROM) return [];
  const weekday = getBusWeekday(date);
  return BUS_REGULAR_SERVICES.filter((service) => service.weekdays.includes(weekday)).map((base) => {
    const exception = BUS_REGULAR_EXCEPTIONS.find((item) => item.date === date && item.serviceId === base.id);
    const service = exception
      ? { ...base, originDeparture: exception.originDeparture, departure: exception.departure, arrival: exception.arrival, arrivalInPiracanjuba: exception.arrivalInPiracanjuba }
      : base;
    return { service, weekday, exception };
  });
}

function regularInfo(service: BusRegularService, exception?: (typeof BUS_REGULAR_EXCEPTIONS)[number]): NonNullable<BusDeparture["regular"]> {
  return {
    authority: service.authority,
    line: service.line,
    lineName: service.lineName,
    origin: service.origin,
    originDeparture: service.originDeparture,
    authorizedOn: service.document.authorizedOn,
    ...(exception ? { exception: exception.source } : {}),
  };
}

export function getRegularBusDepartures(date: string): BusDeparture[] {
  return regularServicesFor(date).map(({ service, weekday, exception }) => ({
    id: `quadro-${service.id}-${date.replaceAll("-", "")}`,
    date,
    destinationId: service.destinationId,
    operatorId: service.operatorId,
    departure: service.departure,
    arrival: service.arrival,
    arrivalDate: date,
    durationMinutes: minutesOf(service.arrival) - minutesOf(service.departure),
    serviceClasses: [...service.serviceClasses, ...(service.weekdayClasses?.[weekday] ?? [])],
    boarding: service.boarding,
    stops: service.stops,
    ...(service.alighting ? { alighting: service.alighting } : {}),
    sources: [...(exception ? [exception.source] : []), { name: service.document.name, url: service.document.url }, ...service.observedOn],
    checkedAt: BUS_REGULAR_CHECKED_AT,
    regular: regularInfo(service, exception),
  }));
}

/**
 * Viagens previstas que chegam a Piracanjuba na data, vindas da origem escolhida. São os
 * mesmos ônibus do quadro regular, vistos do outro lado: quem segue de Caldas Novas para
 * Goiânia chega a Piracanjuba vindo de Caldas Novas.
 */
export function getBusArrivals(date: string, originId = "all", operatorId = "all"): BusArrival[] {
  return regularServicesFor(date)
    .filter(({ service }) => (originId === "all" || service.originId === originId) && (operatorId === "all" || service.operatorId === operatorId))
    .map(({ service, weekday, exception }) => {
      const arrival = service.arrivalInPiracanjuba ?? service.departure;
      return {
        id: `chegada-${service.id}-${date.replaceAll("-", "")}`,
        date,
        originId: service.originId,
        operatorId: service.operatorId,
        departure: service.originDeparture,
        arrival,
        durationMinutes: minutesOf(arrival) - minutesOf(service.originDeparture),
        serviceClasses: [...service.serviceClasses, ...(service.weekdayClasses?.[weekday] ?? [])],
        stops: [],
        sources: [...(exception ? [exception.source] : []), { name: service.document.name, url: service.document.url }],
        checkedAt: BUS_REGULAR_CHECKED_AT,
        regular: regularInfo(service, exception),
      };
    })
    .sort((a, b) => a.arrival.localeCompare(b.arrival) || a.originId.localeCompare(b.originId) || a.operatorId.localeCompare(b.operatorId));
}

export function isBusArrivalPast(arrival: BusArrival, now: Date): boolean {
  return new Date(`${arrival.date}T${arrival.departure}:00-03:00`).getTime() <= now.getTime();
}

/**
 * Partidas da data. Para cada destino, a consulta datada (registros conferidos para aquele
 * dia) tem prioridade; sem ela, vale o quadro regular.
 */
export function getBusDepartures(date: string, destinationId = "all", operatorId = "all"): BusDeparture[] {
  if (!isBusDate(date)) return [];
  const stored = BUS_DEPARTURES.filter((item) => item.date === date);
  const storedDestinations = new Set(stored.map((item) => item.destinationId));
  const regular = getRegularBusDepartures(date).filter((item) => !storedDestinations.has(item.destinationId));
  return [...stored, ...regular]
    .filter((item) => (destinationId === "all" || item.destinationId === destinationId) && (operatorId === "all" || item.operatorId === operatorId))
    .sort((a, b) => a.departure.localeCompare(b.departure) || a.destinationId.localeCompare(b.destinationId) || a.operatorId.localeCompare(b.operatorId));
}

export function getBusCoverage(date: string, destinationId = "all") {
  const departures = getBusDepartures(date, destinationId);
  const regular = departures.filter((item) => item.regular).length;
  return {
    count: departures.length,
    regular,
    lastCheckedAt: departures.reduce<string | null>((latest, item) => !latest || item.checkedAt > latest ? item.checkedAt : latest, null),
    dates: [...new Set(BUS_DEPARTURES.filter((item) => destinationId === "all" || item.destinationId === destinationId).map((item) => item.date))].sort(),
    status: departures.length === 0 ? "unverified" as const : regular === departures.length ? "regular" as const : "available" as const,
  };
}

export function getUpcomingBusDepartures(now: Date, limit = 3): BusDeparture[] {
  const today = getBrazilDate(now);
  const tomorrow = new Date(Date.parse(`${today}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const recentStored = BUS_DEPARTURES.filter((item) => {
    const ageDays = (Date.parse(`${today}T12:00:00Z`) - Date.parse(`${item.checkedAt}T12:00:00Z`)) / 86_400_000;
    return ageDays >= 0 && ageDays <= BUS_REVIEW_INTERVAL_DAYS;
  });
  const storedKeys = new Set(recentStored.map((item) => `${item.date}|${item.destinationId}`));
  const regular = [today, tomorrow].flatMap(getRegularBusDepartures).filter((item) => !storedKeys.has(`${item.date}|${item.destinationId}`));
  return [...recentStored, ...regular].filter((item) => !isBusDeparturePast(item, now)).sort((a, b) => `${a.date}T${a.departure}`.localeCompare(`${b.date}T${b.departure}`) || a.destinationId.localeCompare(b.destinationId)).slice(0, Math.max(0, limit));
}

export function getBusPageUrl(date: string, destinationId = "all", operatorId = "all", direction: BusDirection = "saida"): string {
  const params = new URLSearchParams();
  if (direction === "chegada") params.set("sentido", "chegada");
  if (isBusDate(date)) params.set("data", date);
  if (BUS_DESTINATIONS.some((item) => item.id === destinationId)) params.set("destino", destinationId);
  if (BUS_OPERATORS.some((item) => item.id === operatorId)) params.set("empresa", operatorId);
  return `/horarios-onibus${params.size ? `?${params.toString()}` : ""}`;
}

// Consulta pontual. Cada registro vale somente para a data indicada.
// Classes com a mesma empresa, destino e horários foram agrupadas.
export const BUS_DEPARTURES: BusDeparture[] = storedDepartures;
