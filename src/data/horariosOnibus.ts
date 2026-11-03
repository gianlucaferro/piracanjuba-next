import storedDepartures from "./horariosOnibus-registros.json" with { type: "json" };

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
};

export const BUS_CHECKED_AT = storedDepartures.reduce((latest, item) => item.checkedAt > latest ? item.checkedAt : latest, "");
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

export function getBusSearchUrl(destinationId: string, date: string, provider: "clickbus" | "mobifacil" = "clickbus"): string | null {
  const destination = BUS_DESTINATIONS.find((item) => item.id === destinationId);
  if (!destination || !isBusDate(date)) return null;
  if (provider === "mobifacil") {
    if (!destination.mobifacilSlug) return null;
    const [year, month, day] = date.split("-");
    return `https://www.mobifacil.com.br/passagem-de-onibus/piracanjuba-go/${destination.mobifacilSlug}?date=${day}-${month}-${year}`;
  }
  return `https://www.clickbus.com.br/onibus/piracanjuba-go/${destination.clickbusSlug}?departureDate=${date}`;
}

export function isBusDeparturePast(departure: BusDeparture, now: Date): boolean {
  return new Date(`${departure.date}T${departure.departure}:00-03:00`).getTime() <= now.getTime();
}

export function getBusDepartures(date: string, destinationId = "all", operatorId = "all"): BusDeparture[] {
  if (!isBusDate(date)) return [];
  return BUS_DEPARTURES.filter((item) => item.date === date && (destinationId === "all" || item.destinationId === destinationId) && (operatorId === "all" || item.operatorId === operatorId)).sort((a, b) => a.departure.localeCompare(b.departure) || a.destinationId.localeCompare(b.destinationId));
}

export function getBusCoverage(date: string, destinationId = "all") {
  const departures = getBusDepartures(date, destinationId);
  return {
    count: departures.length,
    lastCheckedAt: departures.reduce<string | null>((latest, item) => !latest || item.checkedAt > latest ? item.checkedAt : latest, null),
    dates: [...new Set(BUS_DEPARTURES.filter((item) => destinationId === "all" || item.destinationId === destinationId).map((item) => item.date))].sort(),
    status: departures.length > 0 ? "available" as const : "unverified" as const,
  };
}

export function getUpcomingBusDepartures(now: Date, limit = 3): BusDeparture[] {
  const today = getBrazilDate(now);
  return BUS_DEPARTURES.filter((item) => {
    const ageDays = (Date.parse(`${today}T12:00:00Z`) - Date.parse(`${item.checkedAt}T12:00:00Z`)) / 86_400_000;
    return ageDays >= 0 && ageDays <= BUS_REVIEW_INTERVAL_DAYS && !isBusDeparturePast(item, now);
  }).sort((a, b) => `${a.date}T${a.departure}`.localeCompare(`${b.date}T${b.departure}`) || a.destinationId.localeCompare(b.destinationId)).slice(0, Math.max(0, limit));
}

export function getBusPageUrl(date: string, destinationId = "all", operatorId = "all"): string {
  const params = new URLSearchParams();
  if (isBusDate(date)) params.set("data", date);
  if (BUS_DESTINATIONS.some((item) => item.id === destinationId)) params.set("destino", destinationId);
  if (BUS_OPERATORS.some((item) => item.id === operatorId)) params.set("empresa", operatorId);
  return `/horarios-onibus${params.size ? `?${params.toString()}` : ""}`;
}

// Consulta pontual. Cada registro vale somente para a data indicada.
// Classes com a mesma empresa, destino e horários foram agrupadas.
export const BUS_DEPARTURES: BusDeparture[] = storedDepartures;
