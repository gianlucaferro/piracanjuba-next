import { BUS_DESTINATIONS, BUS_OPERATORS, BUS_REVIEW_INTERVAL_DAYS, getBrazilDate, isBusDate, type BusDeparture } from "./horariosOnibus.ts";

export type BusImportResult = { departures: BusDeparture[]; errors: string[] };
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const sourceHosts = new Set([
  "clickbus.com.br", "www.clickbus.com.br", "www.mobifacil.com.br", "mobifacil.com.br",
  "www.expressouniao.com.br", "expressouniao.com.br", "viajeguanabara.com.br",
  "www.viajeguanabara.com.br", "www.roderotas.com", "roderotas.com",
  "roderotas.clickbus.com.br", "piracanjuba.go.gov.br", "goias.gov.br",
]);
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= 1000;
const date = (value: unknown): value is string => typeof value === "string" && isBusDate(value);
const time = (value: unknown): value is string => typeof value === "string" && timePattern.test(value);
const timestamp = (day: string, clock: string) => Date.parse(`${day}T${clock}:00-03:00`);

/** Importações são pontuais. Cada viagem vale somente na data documentada. */
export function validateBusDepartures(input: unknown, now = new Date()): BusImportResult {
  const errors: string[] = [];
  if (!Array.isArray(input) || input.length === 0 || input.length > 5000) {
    return { departures: [], errors: ["Informe uma lista JSON com 1 a 5.000 viagens."] };
  }
  const ids = new Set<string>();
  const journeys = new Set<string>();
  const today = getBrazilDate(now);
  for (const [index, item] of input.entries()) {
    const prefix = `Viagem ${index + 1}`;
    const fail = (message: string) => errors.push(`${prefix}: ${message}`);
    if (!record(item)) { fail("registro inválido."); continue; }
    if (!text(item.id) || !/^[a-z0-9][a-z0-9-]{2,119}$/.test(item.id)) fail("ID deve conter letras minúsculas, números e hífens.");
    else if (ids.has(item.id)) fail(`ID repetido (${item.id}).`);
    else ids.add(item.id);
    const destination = BUS_DESTINATIONS.find((entry) => entry.id === item.destinationId);
    if (!destination) fail("destino não cadastrado.");
    if (!BUS_OPERATORS.some((entry) => entry.id === item.operatorId)) fail("empresa não cadastrada.");
    if (!date(item.date) || !date(item.arrivalDate) || !date(item.checkedAt)) fail("datas devem existir e usar YYYY-MM-DD.");
    if (!time(item.departure) || !time(item.arrival)) fail("horários devem usar HH:MM, de 00:00 a 23:59.");
    if (date(item.date) && date(item.checkedAt)) {
      if (item.checkedAt > today) fail("data da conferência não pode estar no futuro.");
      const daysAhead = (Date.parse(`${item.date}T12:00:00Z`) - Date.parse(`${item.checkedAt}T12:00:00Z`)) / 86_400_000;
      if (daysAhead < 0 || daysAhead > BUS_REVIEW_INTERVAL_DAYS) fail(`confira a viagem nos ${BUS_REVIEW_INTERVAL_DAYS} dias anteriores à partida.`);
    }
    if (date(item.date) && date(item.arrivalDate) && time(item.departure) && time(item.arrival)) {
      const duration = (timestamp(item.arrivalDate, item.arrival) - timestamp(item.date, item.departure)) / 60_000;
      if (duration <= 0 || duration > 48 * 60 || item.durationMinutes !== duration) fail("duração deve corresponder à partida e à chegada, entre 1 minuto e 48 horas.");
    }
    const journey = [item.date, item.destinationId, item.operatorId, item.departure].join("|");
    if (journeys.has(journey)) fail("partida repetida. Agrupe classes da mesma viagem em serviceClasses.");
    journeys.add(journey);
    if (!Array.isArray(item.serviceClasses) || !item.serviceClasses.length || !item.serviceClasses.every(text)) fail("informe as classes de serviço.");
    if (!record(item.boarding) || !text(item.boarding.name) || typeof item.boarding.verified !== "boolean") fail("informe nome e confirmação do embarque.");
    else {
      if (item.boarding.address !== undefined && !text(item.boarding.address)) fail("endereço de embarque inválido.");
      if (item.boarding.verified && !text(item.boarding.address)) fail("embarque confirmado exige endereço documentado.");
      if (text(item.boarding.address) && !/piracanjuba/i.test(item.boarding.address)) fail("o embarque deve identificar Piracanjuba.");
    }
    if (item.alighting !== undefined && (!record(item.alighting) || !text(item.alighting.name) || (item.alighting.address !== undefined && !text(item.alighting.address)))) fail("desembarque inválido.");
    if (!Array.isArray(item.stops) || !item.stops.every((stop: unknown) => record(stop) && text(stop.name) && time(stop.time))) fail("paradas devem informar nome e horário válidos.");
    if (item.connections !== undefined) {
      if (!Array.isArray(item.connections) || !item.connections.length) fail("conexões devem conter os trechos confirmados.");
      else {
        let previous = time(item.departure) && date(item.date) ? timestamp(item.date, item.departure) : NaN;
        for (const connection of item.connections) {
          if (!record(connection) || !text(connection.city) || !text(connection.operator) || !time(connection.arrival) || !time(connection.departure)) { fail("conexão inválida."); continue; }
          if (date(item.date) && date(item.arrivalDate) && time(item.arrival)) {
            const arrives = timestamp(item.date, connection.arrival);
            const leaves = timestamp(item.date, connection.departure);
            if (item.date !== item.arrivalDate || arrives <= previous || leaves <= arrives || leaves >= timestamp(item.arrivalDate, item.arrival)) fail("conexões exigem horários crescentes no mesmo dia e intervalo para troca.");
            previous = leaves;
          }
        }
      }
    }
    let hasDatedTripSource = false;
    if (!Array.isArray(item.sources) || !item.sources.length) fail("adicione uma fonte verificável para esta data e partida local.");
    else for (const source of item.sources) {
      if (!record(source) || !text(source.name) || !text(source.url)) { fail("fonte deve ter nome e URL."); continue; }
      try {
        const url = new URL(source.url);
        if (url.protocol !== "https:" || url.username || url.password || url.port || !sourceHosts.has(url.hostname)) { fail("fonte deve usar HTTPS e um canal cadastrado de empresa, venda ou órgão oficial."); continue; }
        if (["www.clickbus.com.br", "clickbus.com.br"].includes(url.hostname) && url.pathname.startsWith("/onibus/")) {
          if (date(item.date) && destination && url.searchParams.getAll("departureDate").length === 1 && url.searchParams.get("departureDate") === item.date && url.pathname === `/onibus/piracanjuba-go/${destination.clickbusSlug}`) hasDatedTripSource = true;
          else fail("link ClickBus deve corresponder ao destino e à data da viagem.");
        }
        if (["www.mobifacil.com.br", "mobifacil.com.br"].includes(url.hostname) && url.pathname.startsWith("/passagem-de-onibus/")) {
          if (date(item.date) && destination?.mobifacilSlug && url.searchParams.getAll("date").length === 1 && url.searchParams.get("date") === item.date.split("-").reverse().join("-") && url.pathname === `/passagem-de-onibus/piracanjuba-go/${destination.mobifacilSlug}`) hasDatedTripSource = true;
          else fail("link Mobifácil deve corresponder ao destino e à data da viagem.");
        }
      } catch { fail("URL da fonte inválida."); }
    }
    if (!hasDatedTripSource) fail("inclua ao menos uma consulta de viagem ClickBus ou Mobifácil com origem Piracanjuba, destino e data correspondentes. Sites gerais servem apenas como apoio.");
  }
  return { departures: errors.length ? [] : input as BusDeparture[], errors };
}

export function mergeBusDepartures(current: BusDeparture[], additions: BusDeparture[]): BusDeparture[] {
  const records = new Map(current.map((item) => [item.id, item]));
  for (const item of additions) records.set(item.id, item);
  return [...records.values()].sort((a, b) => `${a.date}T${a.departure}`.localeCompare(`${b.date}T${b.departure}`) || a.id.localeCompare(b.id));
}
