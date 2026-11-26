import assert from "node:assert/strict";
import test from "node:test";
import {
  BUS_DEPARTURES,
  BUS_DESTINATIONS,
  BUS_OPERATORS,
  BUS_SNAPSHOT_DATE,
  getBrazilDate,
  areBusFaresCurrent,
  getBusArrivals,
  getBusDepartures,
  getBusFareSummary,
  getBusCoverage,
  getBusPageUrl,
  getBusSearchUrl,
  getBusWeekday,
  getRegularBusDepartures,
  getUpcomingBusDepartures,
  getInitialBusDate,
  BUS_CONNECTION_NOTES,
  isBusDate,
  isBusDeparturePast,
} from "../src/data/horariosOnibus.ts";
import type { BusDeparture } from "../src/data/horariosOnibus.ts";
import { validateBusDepartures, mergeBusDepartures } from "../src/data/busScheduleValidation.ts";
import { BUS_REGULAR_SERVICES, BUS_REGULAR_VALID_FROM } from "../src/data/horariosOnibusQuadro.ts";

function departure(overrides: Partial<BusDeparture> = {}): BusDeparture {
  return {
    id: "fixture-goiania-1315",
    date: "2026-09-10",
    destinationId: "goiania",
    operatorId: "uniao",
    departure: "13:15",
    arrival: "15:00",
    arrivalDate: "2026-09-10",
    durationMinutes: 105,
    serviceClasses: ["Convencional"],
    boarding: { name: "Piracanjuba, GO", verified: false },
    stops: [],
    sources: [{ name: "Fonte de teste", url: "https://example.test/viagem" }],
    checkedAt: "2026-09-08",
    ...overrides,
  };
}

function withDepartures(fixtures: BusDeparture[], run: () => void): void {
  const original = [...BUS_DEPARTURES];
  BUS_DEPARTURES.splice(0, BUS_DEPARTURES.length, ...fixtures);
  try {
    run();
  } finally {
    BUS_DEPARTURES.splice(0, BUS_DEPARTURES.length, ...original);
  }
}

test("datas exigem formato completo e um dia existente no calendário", () => {
  for (const date of ["2026-09-10", "2028-02-29", "2000-02-29", "2026-12-31"]) {
    assert.equal(isBusDate(date), true, date);
  }
  for (const date of [
    "", "2026-9-10", "10/09/2026", "2026-00-10", "2026-13-10",
    "2026-09-00", "2026-09-31", "2026-02-29", "1900-02-29",
    "2026-09-10T00:00:00Z", " 2026-09-10", "2026-09-10\n",
  ]) {
    assert.equal(isBusDate(date), false, date);
    assert.deepEqual(getBusDepartures(date), [], date);
    assert.equal(getBusSearchUrl("goiania", date), null, date);
  }
});

test("consulta usa a data comprovada sem repetir partidas na semana seguinte", () => {
  const confirmed = departure();
  withDepartures([confirmed], () => {
    assert.deepEqual(getBusDepartures("2026-09-10"), [confirmed]);
    for (const date of ["2026-09-03", "2026-09-09", "2026-09-11", "2026-09-17"]) {
      assert.deepEqual(getBusDepartures(date), [], date);
    }
  });
});

test("data de São Paulo muda às 03:00 UTC e não à meia-noite UTC", () => {
  assert.equal(getBrazilDate(new Date("2026-09-11T00:00:00Z")), "2026-09-10");
  assert.equal(getBrazilDate(new Date("2026-09-11T02:59:59.999Z")), "2026-09-10");
  assert.equal(getBrazilDate(new Date("2026-09-11T03:00:00Z")), "2026-09-11");
  assert.equal(getBrazilDate(new Date("2027-01-01T02:59:59.999Z")), "2026-12-31");
  assert.equal(getBrazilDate(new Date("2027-01-01T03:00:00Z")), "2027-01-01");
});

test("data inicial usa hoje em São Paulo, inclusive antes da próxima consulta", () => {
  const start = new Date(`${BUS_SNAPSHOT_DATE}T03:00:00Z`).getTime();
  const end = start + 24 * 60 * 60 * 1000;
  assert.equal(getInitialBusDate(new Date(start - 1)), getBrazilDate(new Date(start - 1)));
  assert.equal(getInitialBusDate(new Date(start)), BUS_SNAPSHOT_DATE);
  assert.equal(getInitialBusDate(new Date(end - 1)), BUS_SNAPSHOT_DATE);
  const nextDate = new Date(end).toISOString().slice(0, 10);
  assert.equal(getInitialBusDate(new Date(end)), nextDate);
  withDepartures([departure({ date: BUS_SNAPSHOT_DATE })], () => {
    assert.deepEqual(getBusDepartures(getInitialBusDate(new Date(end))), []);
  });
});

test("cobertura informa somente a data e o destino selecionados", () => {
  withDepartures([
    departure(),
    departure({ id: "caldas", destinationId: "caldas-novas", checkedAt: "2026-09-09" }),
    departure({ id: "other-date", date: "2026-09-11" }),
  ], () => {
    assert.deepEqual(getBusCoverage("2026-09-10", "goiania"), { count: 1, regular: 0, lastCheckedAt: "2026-09-08", dates: ["2026-09-10", "2026-09-11"], status: "available" });
    assert.deepEqual(getBusCoverage("2026-09-12", "caldas-novas"), { count: 0, regular: 0, lastCheckedAt: null, dates: ["2026-09-10"], status: "unverified" });
  });
});

test("próximas partidas excluem passadas e registros sem revisão recente", () => {
  withDepartures([
    departure({ id: "passed", departure: "08:00" }),
    departure({ id: "stale", departure: "14:00", checkedAt: "2026-09-01" }),
    departure({ id: "future-checked", departure: "14:00", checkedAt: "2026-09-11" }),
    departure({ id: "current", departure: "13:15" }),
    departure({ id: "tomorrow", date: "2026-09-11" }),
  ], () => {
    const now = new Date("2026-09-10T15:00:00Z");
    assert.deepEqual(getUpcomingBusDepartures(now).map((item) => item.id), ["current", "tomorrow"]);
    assert.deepEqual(getUpcomingBusDepartures(now, 1).map((item) => item.id), ["current"]);
    assert.deepEqual(getUpcomingBusDepartures(now, 0), []);
  });
});

test("link compartilhável preserva filtros válidos e ignora valores adulterados", () => {
  assert.equal(getBusPageUrl("2026-11-04", "goiania", "real"), "/horarios-onibus?data=2026-11-04&destino=goiania&empresa=real");
  assert.equal(getBusPageUrl("2026-99-99", "https://evil.test", "__proto__"), "/horarios-onibus");
});

test("importação valida toda a base publicada, inclusive históricos", () => {
  const lastCheckedAt = BUS_DEPARTURES.reduce((latest, item) => item.checkedAt > latest ? item.checkedAt : latest, "");
  assert.ok(isBusDate(lastCheckedAt));
  assert.deepEqual(validateBusDepartures(BUS_DEPARTURES, new Date(`${lastCheckedAt}T12:00:00-03:00`)).errors, []);
});

test("fontes gerais apenas apoiam uma consulta com data, origem e destino comprováveis", () => {
  const homepage = { name: "Expresso União", url: "https://www.expressouniao.com.br/" };
  const now = new Date("2026-09-09T15:00:00Z");
  const clickbus = { name: "ClickBus", url: "https://www.clickbus.com.br/onibus/piracanjuba-go/goiania-go?departureDate=2026-09-10" };
  const mobifacil = { name: "Mobifácil", url: "https://www.mobifacil.com.br/passagem-de-onibus/piracanjuba-go/goiania-go?date=10-09-2026" };
  for (const sources of [[homepage], [{ name: "ClickBus", url: "https://www.clickbus.com.br/" }]]) {
    assert.ok(validateBusDepartures([departure({ sources })], now).errors.some((error) => error.includes("ao menos uma consulta de viagem")));
  }
  for (const tripSource of [clickbus, mobifacil]) {
    assert.deepEqual(validateBusDepartures([departure({ sources: [homepage, tripSource] })], now).errors, []);
  }
  for (const source of [
    { ...clickbus, url: `${clickbus.url}&departureDate=2026-09-11` },
    { ...mobifacil, url: mobifacil.url.replace("10-09-2026", "11-09-2026") },
    { ...mobifacil, url: mobifacil.url.replace("piracanjuba-go", "goiania-go") },
    { ...clickbus, url: clickbus.url.replace("goiania-go", "uberlandia-mg") },
  ]) assert.ok(validateBusDepartures([departure({ sources: [homepage, source] })], now).errors.length > 0);
});

test("importação recusa datas fictícias, fonte errada, duração incorreta e duplicatas", () => {
  const valid = departure({ sources: [{ name: "ClickBus", url: "https://www.clickbus.com.br/onibus/piracanjuba-go/goiania-go?departureDate=2026-09-10" }] });
  const now = new Date("2026-09-09T15:00:00Z");
  assert.equal(validateBusDepartures([valid], now).errors.length, 0);
  const invalid: Partial<BusDeparture>[] = [
    { date: "2026-09-31" },
    { departure: "25:00" },
    { arrival: "12:00" },
    { checkedAt: "2026-09-10" },
    { checkedAt: "2026-09-01" },
    { durationMinutes: 999 },
    { destinationId: "unknown" },
    { operatorId: "unknown" },
    { boarding: { name: "Piracanjuba", verified: true } },
    { sources: [] },
    { sources: [{ name: "Fonte", url: "javascript:alert(1)" }] },
    { sources: [{ name: "Fonte", url: "https://www.clickbus.com.br.evil.test/" }] },
    { sources: [{ name: "Fonte", url: "https://www.clickbus.com.br/onibus/piracanjuba-go/goiania-go?departureDate=2026-09-11" }] },
    { sources: [{ name: "Fonte", url: "https://www.clickbus.com.br/onibus/sao-paulo-sp/goiania-go?departureDate=2026-09-10" }] },
    { connections: [{ city: "Goiânia", arrival: "13:30", departure: "13:00", operator: "União" }] },
  ];
  for (const changes of invalid) {
    const result = validateBusDepartures([{ ...valid, ...changes }], now);
    assert.ok(result.errors.length > 0, JSON.stringify(changes));
    assert.deepEqual(result.departures, []);
  }
  assert.ok(validateBusDepartures([valid, { ...valid, id: "other" }], now).errors.some((error) => error.includes("partida repetida")));
  const conflictingArrival = { ...valid, id: "different-arrival", arrival: "15:10", durationMinutes: 115 };
  assert.deepEqual(validateBusDepartures([conflictingArrival], now).errors, []);
  assert.ok(validateBusDepartures([valid, conflictingArrival], now).errors.some((error) => error.includes("partida repetida")));
  assert.ok(validateBusDepartures([valid, valid], now).errors.some((error) => error.includes("ID repetido")));
});

test("arquivo de atualização preserva históricos e substitui registros pelo ID", () => {
  const old = departure();
  const current = departure({ arrival: "15:10", durationMinutes: 115 });
  const newDate = departure({ id: "new", date: "2026-09-11" });
  assert.deepEqual(mergeBusDepartures([old], [current, newDate]), [current, newDate]);
  assert.equal(old.arrival, "15:00");
});

test("partida deixa de ser futura no instante exato do horário local", () => {
  const trip = departure();
  assert.equal(isBusDeparturePast(trip, new Date("2026-09-10T16:14:59.999Z")), false);
  assert.equal(isBusDeparturePast(trip, new Date("2026-09-10T16:15:00Z")), true);
  assert.equal(isBusDeparturePast(trip, new Date("2026-09-10T16:15:00.001Z")), true);
  const midnight = departure({ departure: "00:00" });
  assert.equal(isBusDeparturePast(midnight, new Date("2026-09-10T02:59:59.999Z")), false);
  assert.equal(isBusDeparturePast(midnight, new Date("2026-09-10T03:00:00Z")), true);
});

test("filtros combinados mantêm apenas a interseção e ordenam sem alterar os dados", () => {
  const fixtures = [
    departure({ id: "late", departure: "19:30", operatorId: "marly" }),
    departure({ id: "caldas", destinationId: "caldas-novas", departure: "08:00" }),
    departure({ id: "uniao", departure: "13:15" }),
    departure({ id: "early", departure: "08:00", operatorId: "marly" }),
    departure({ id: "other-date", date: "2026-09-11", departure: "07:00" }),
  ];
  withDepartures(fixtures, () => {
    assert.deepEqual(getBusDepartures("2026-09-10").map((item) => item.id), [
      "caldas", "early", "uniao", "late",
    ]);
    assert.deepEqual(getBusDepartures("2026-09-10", "goiania", "marly").map((item) => item.id), ["early", "late"]);
    assert.deepEqual(getBusDepartures("2026-09-10", "all", "uniao").map((item) => item.id), ["caldas", "uniao"]);
    assert.deepEqual(getBusDepartures("2026-09-10", "caldas-novas", "marly"), []);
    assert.deepEqual(getBusDepartures("2026-09-10", "inexistente"), []);
    assert.deepEqual(getBusDepartures("2026-09-10", "all", "inexistente"), []);
    assert.deepEqual(BUS_DEPARTURES.map((item) => item.id), fixtures.map((item) => item.id));
    assert.notEqual(getBusDepartures("2026-09-10"), BUS_DEPARTURES);
  });
});

test("links usam somente destinos cadastrados, HTTPS e a data escolhida no provedor", () => {
  for (const destination of BUS_DESTINATIONS) {
    const clickbus = new URL(getBusSearchUrl(destination.id, "2026-09-12")!);
    assert.equal(clickbus.origin, "https://www.clickbus.com.br");
    assert.equal(clickbus.pathname, `/onibus/piracanjuba-go/${destination.clickbusSlug}`);
    assert.equal(clickbus.searchParams.get("departureDate"), "2026-09-12");
    assert.equal(clickbus.searchParams.size, 1);
    assert.equal(clickbus.hash, "");

    const mobifacilUrl = getBusSearchUrl(destination.id, "2026-09-12", "mobifacil");
    if (!destination.mobifacilSlug) {
      assert.equal(mobifacilUrl, null);
      continue;
    }
    const mobifacil = new URL(mobifacilUrl!);
    assert.equal(mobifacil.origin, "https://www.mobifacil.com.br");
    assert.equal(mobifacil.pathname, `/passagem-de-onibus/piracanjuba-go/${destination.mobifacilSlug}`);
    assert.equal(mobifacil.searchParams.get("date"), "12-09-2026");
    assert.equal(mobifacil.searchParams.size, 1);
    assert.equal(mobifacil.hash, "");
  }
});

test("destinos e datas adulterados não geram links externos ou parâmetros extras", () => {
  for (const provider of ["clickbus", "mobifacil"] as const) {
    for (const destination of [
      "", "__proto__", "constructor", "../../evil", "https://evil.test/",
      "goiania?redirect=https://evil.test/", "goiania#fragment",
    ]) {
      assert.equal(getBusSearchUrl(destination, "2026-09-10", provider), null);
    }
    for (const date of [
      "2026-09-10&redirect=https://evil.test/", "2026-09-10#fragment",
      "2026-09-10%26departureDate=2026-09-11", "javascript:alert(1)",
    ]) {
      assert.equal(getBusSearchUrl("goiania", date, provider), null);
    }
  }
});

test("partidas reais possuem data, referência de empresa e destino sem IDs repetidos", () => {
  assert.ok(BUS_DEPARTURES.length > 0);
  const ids = new Set<string>();
  for (const trip of BUS_DEPARTURES) {
    assert.ok(!ids.has(trip.id), `ID repetido: ${trip.id}`);
    ids.add(trip.id);
    assert.ok(isBusDate(trip.date), trip.id);
    assert.ok(isBusDate(trip.arrivalDate), trip.id);
    assert.ok(BUS_DESTINATIONS.some((item) => item.id === trip.destinationId), trip.id);
    assert.ok(BUS_OPERATORS.some((item) => item.id === trip.operatorId), trip.id);
    assert.match(trip.departure, /^(?:[01]\d|2[0-3]):[0-5]\d$/, trip.id);
    assert.match(trip.arrival, /^(?:[01]\d|2[0-3]):[0-5]\d$/, trip.id);
    assert.ok(trip.sources.length > 0, trip.id);
  }
});

test("duração registrada corresponde às datas e horários de partida e chegada", () => {
  for (const trip of BUS_DEPARTURES) {
    const startsAt = new Date(`${trip.date}T${trip.departure}:00-03:00`).getTime();
    const endsAt = new Date(`${trip.arrivalDate}T${trip.arrival}:00-03:00`).getTime();
    assert.ok(endsAt > startsAt, `Chegada não posterior à partida: ${trip.id}`);
    assert.ok(Number.isInteger(trip.durationMinutes), trip.id);
    assert.equal(trip.durationMinutes, (endsAt - startsAt) / 60_000, trip.id);
  }
});

test("conexões têm espera positiva e permanecem em ordem dentro da viagem", () => {
  for (const trip of BUS_DEPARTURES) {
    if (!trip.connections?.length) continue;
    assert.equal(trip.date, trip.arrivalDate, `Conexão que atravessa dias precisa registrar datas explícitas: ${trip.id}`);
    const arrivalAt = new Date(`${trip.arrivalDate}T${trip.arrival}:00-03:00`).getTime();
    let previousDepartureAt = new Date(`${trip.date}T${trip.departure}:00-03:00`).getTime();
    for (const connection of trip.connections) {
      assert.ok(connection.city.trim(), trip.id);
      assert.ok(connection.operator.trim(), trip.id);
      assert.match(connection.arrival, /^(?:[01]\d|2[0-3]):[0-5]\d$/, trip.id);
      assert.match(connection.departure, /^(?:[01]\d|2[0-3]):[0-5]\d$/, trip.id);
      const connectionArrivalAt = new Date(`${trip.date}T${connection.arrival}:00-03:00`).getTime();
      const connectionDepartureAt = new Date(`${trip.date}T${connection.departure}:00-03:00`).getTime();
      assert.ok(connectionArrivalAt > previousDepartureAt, `Conexão fora de ordem: ${trip.id}`);
      assert.ok(connectionDepartureAt > connectionArrivalAt, `Conexão sem intervalo positivo: ${trip.id}`);
      assert.ok(connectionDepartureAt < arrivalAt, `Conexão após o destino: ${trip.id}`);
      previousDepartureAt = connectionDepartureAt;
    }
  }
});

test("endereços informados correspondem ao município de embarque ou desembarque", () => {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  for (const trip of BUS_DEPARTURES) {
    assert.ok(trip.boarding.name.trim(), trip.id);
    if (trip.boarding.verified) {
      assert.ok(trip.boarding.address?.trim(), `Embarque marcado como confirmado sem endereço: ${trip.id}`);
    }
    if (trip.boarding.address !== undefined) {
      assert.match(normalize(trip.boarding.address), /piracanjuba/, trip.id);
      assert.match(trip.boarding.address, /\bGO\b/, trip.id);
    }
    if (trip.alighting) {
      assert.ok(trip.alighting.name.trim(), trip.id);
      if (trip.alighting.address !== undefined) {
        const destination = BUS_DESTINATIONS.find((item) => item.id === trip.destinationId)!;
        assert.ok(normalize(trip.alighting.address).includes(normalize(destination.name)), trip.id);
        assert.ok(trip.alighting.address.includes(destination.state), trip.id);
      }
    }
  }
});

test("consulta de Araguari preserva Menegon como ponto específico de desembarque", () => {
  const searchUrl = new URL(getBusSearchUrl("araguari", BUS_SNAPSHOT_DATE)!);
  assert.equal(searchUrl.pathname, "/onibus/piracanjuba-go/araguari-menegon-mg");
  for (const trip of BUS_DEPARTURES.filter((item) => item.destinationId === "araguari")) {
    assert.equal(trip.alighting?.name, "Churrascaria Menegon", trip.id);
    assert.match(trip.alighting?.address ?? "", /BR-050, km 41, Araguari/, trip.id);
    for (const source of trip.sources.filter((item) => new URL(item.url).hostname === "www.clickbus.com.br")) {
      assert.equal(new URL(source.url).pathname, "/onibus/piracanjuba-go/araguari-menegon-mg", trip.id);
    }
  }
});

// Quadro regular (AGR e ANTT), conferido em 2026-11-26.

test("quadro regular cobre qualquer data a partir da conferência, conforme o dia da semana", () => {
  assert.deepEqual(getRegularBusDepartures("2026-11-25"), [], "antes do início do quadro");
  assert.equal(BUS_REGULAR_VALID_FROM, "2026-11-26");
  // 2026-11-26 é quinta-feira; 2026-12-02 é quarta; 2026-12-01 é terça.
  assert.equal(getBusWeekday("2026-11-26"), 4);
  assert.equal(getBusWeekday("2026-12-02"), 3);
  const thursday = getBusDepartures("2026-11-26");
  const wednesday = getBusDepartures("2026-12-02");
  const byDestination = (list: BusDeparture[], destination: string) => list.filter((item) => item.destinationId === destination).map((item) => `${item.departure} ${item.operatorId}`);
  // 2026-12-03 é quinta-feira sem exceção; 2026-11-26 tem a exceção da União (14:00).
  const thursdayRegular = getBusDepartures("2026-12-03");
  assert.deepEqual(byDestination(thursdayRegular, "goiania"), ["08:00 marly", "11:00 marly", "13:15 uniao", "13:30 marly", "15:50 real", "19:30 marly"]);
  assert.deepEqual(byDestination(thursday, "goiania"), ["08:00 marly", "11:00 marly", "13:30 marly", "14:00 uniao", "15:50 real", "19:30 marly"]);
  assert.deepEqual(byDestination(thursday, "caldas-novas"), ["08:15 marly", "09:15 uniao", "12:15 real", "13:00 marly", "16:00 marly", "19:00 marly"]);
  assert.deepEqual(byDestination(wednesday, "goiania"), ["08:00 marly", "11:00 marly", "13:15 uniao", "13:30 marly", "15:35 real", "19:30 marly"]);
  assert.deepEqual(byDestination(wednesday, "caldas-novas"), ["08:15 marly", "09:15 uniao", "12:10 real", "13:00 marly", "16:00 marly", "19:00 marly"]);
  // Uberlândia e Araguari: sem linha direta à venda, só a orientação de conexão.
  assert.deepEqual(byDestination(thursday, "uberlandia"), []);
  assert.deepEqual(byDestination(thursday, "araguari"), []);
  assert.equal(BUS_CONNECTION_NOTES.uberlandia.via, "Goiânia");
  assert.equal(BUS_CONNECTION_NOTES.araguari.via, "Caldas Novas");
  assert.equal(getBusCoverage("2026-11-26", "goiania").status, "regular");
});

test("partidas do quadro batem com as consultas de 2026-09-10 e 2026-11-04", () => {
  // As consultas datadas foram a base da previsão de passagem por Piracanjuba: no mesmo dia
  // da semana, o quadro deve repetir horário, chegada e empresa de cada registro conferido.
  for (const date of ["2026-09-10", "2026-11-04"]) {
    const weekday = getBusWeekday(date);
    const stored = BUS_DEPARTURES.filter((item) => item.date === date && ["goiania", "caldas-novas"].includes(item.destinationId));
    const regular = BUS_REGULAR_SERVICES.filter((service) => service.weekdays.includes(weekday) && ["goiania", "caldas-novas"].includes(service.destinationId));
    for (const service of regular) {
      const match = stored.find((item) => item.destinationId === service.destinationId && item.operatorId === service.operatorId && item.departure === service.departure);
      assert.ok(match, `${date} ${service.id} sem consulta correspondente`);
      assert.equal(match.arrival, service.arrival, `${date} ${service.id} chegada`);
    }
  }
});

test("consulta datada tem prioridade sobre o quadro no mesmo destino", () => {
  const confirmed = departure({ id: "datada", date: "2026-11-27", departure: "13:20", checkedAt: "2026-11-26" });
  withDepartures([confirmed], () => {
    const goiania = getBusDepartures("2026-11-27", "goiania");
    assert.deepEqual(goiania.map((item) => item.id), ["datada"]);
    const caldas = getBusDepartures("2026-11-27", "caldas-novas");
    assert.ok(caldas.length > 0 && caldas.every((item) => item.regular), "outro destino continua no quadro");
    assert.equal(getBusCoverage("2026-11-27", "all").status, "available");
  });
});

test("serviços do quadro são consistentes e citam documento oficial e consulta de venda", () => {
  const ids = new Set<string>();
  for (const service of BUS_REGULAR_SERVICES) {
    assert.ok(!ids.has(service.id), `ID repetido: ${service.id}`);
    ids.add(service.id);
    assert.ok(BUS_DESTINATIONS.some((item) => item.id === service.destinationId), service.id);
    assert.ok(BUS_OPERATORS.some((item) => item.id === service.operatorId), service.id);
    assert.ok(service.originDeparture < service.departure && service.departure < service.arrival, `${service.id}: ordem dos horários`);
    assert.ok(service.weekdays.length > 0 && service.weekdays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6), service.id);
    const documentHost = new URL(service.document.url).hostname;
    assert.ok(service.authority === "AGR" ? documentHost === "goias.gov.br" : documentHost === "quadros-horarios.antt.gov.br", `${service.id}: documento ${documentHost}`);
    assert.ok(service.observedOn.length > 0, `${service.id}: sem consulta de venda`);
    for (const source of service.observedOn) assert.match(source.url, /^https:\/\/www\.clickbus\.com\.br\/onibus\/piracanjuba-go\//);
  }
  for (const date of ["2026-11-26", "2026-12-02", "2027-03-14"]) {
    const list = getRegularBusDepartures(date);
    assert.equal(new Set(list.map((item) => item.id)).size, list.length, date);
    for (const item of list) assert.ok(item.durationMinutes > 0 && item.regular && item.sources[0].url.startsWith("https://"), item.id);
  }
});

test("exceção datada troca o horário só naquela data e cita a venda consultada", () => {
  const exception = getBusDepartures("2026-11-27", "goiania", "uniao")[0];
  assert.equal(exception.departure, "14:00");
  assert.equal(exception.arrival, "15:45");
  assert.equal(exception.regular?.originDeparture, "12:45");
  assert.match(exception.regular?.exception?.url ?? "", /departureDate=2026-11-27$/);
  assert.equal(exception.sources[0].url, exception.regular?.exception?.url);
  const normal = getBusDepartures("2026-11-28", "goiania", "uniao")[0];
  assert.equal(normal.departure, "13:15");
  assert.equal(normal.regular?.exception, undefined);
});

test("chegadas a Piracanjuba usam os mesmos ônibus vistos da origem", () => {
  const arrivalsFrom = (date: string, origin: string) => getBusArrivals(date, origin).map((item) => `${item.departure}->${item.arrival} ${item.operatorId}`);
  // Conferido na ClickBus em 2026-11-26 para 2026-11-28 (sábado) e 2026-12-02 (quarta).
  assert.deepEqual(arrivalsFrom("2026-11-28", "goiania"), ["06:45->08:15 marly", "07:30->09:15 uniao", "10:30->12:10 real", "11:30->13:00 marly", "14:30->16:00 marly", "17:30->19:00 marly"]);
  assert.deepEqual(arrivalsFrom("2026-12-02", "goiania"), ["06:45->08:15 marly", "07:30->09:15 uniao", "10:30->12:05 real", "11:30->13:00 marly", "14:30->16:00 marly", "17:30->19:00 marly"]);
  assert.deepEqual(arrivalsFrom("2026-11-28", "caldas-novas"), ["07:00->08:00 marly", "10:00->11:00 marly", "12:00->13:15 uniao", "12:30->13:30 marly", "14:30->15:45 real", "18:30->19:30 marly"]);
  assert.deepEqual(arrivalsFrom("2026-12-02", "caldas-novas"), ["07:00->08:00 marly", "10:00->11:00 marly", "12:00->13:15 uniao", "12:30->13:30 marly", "14:30->15:30 real", "18:30->19:30 marly"]);
  assert.deepEqual(arrivalsFrom("2026-11-27", "caldas-novas").filter((item) => item.endsWith("uniao")), ["12:45->14:00 uniao"]);
  assert.deepEqual(getBusArrivals("2026-11-28", "uberlandia"), []);
  assert.deepEqual(getBusArrivals("2026-11-25", "goiania"), [], "antes do início do quadro");
  assert.equal(getBusArrivals("2026-11-28").length, 12);
  for (const item of getBusArrivals("2026-11-28")) assert.ok(item.durationMinutes > 0, item.id);
});

test("links de busca e da página respeitam o sentido da viagem", () => {
  assert.equal(getBusSearchUrl("goiania", "2026-11-28", "clickbus", "chegada"), "https://www.clickbus.com.br/onibus/goiania-go/piracanjuba-go?departureDate=2026-11-28");
  assert.equal(getBusSearchUrl("goiania", "2026-11-28", "mobifacil", "chegada"), "https://www.mobifacil.com.br/passagem-de-onibus/goiania-go/piracanjuba-go?date=28-11-2026");
  assert.equal(getBusSearchUrl("goiania", "2026-11-28"), "https://www.clickbus.com.br/onibus/piracanjuba-go/goiania-go?departureDate=2026-11-28");
  assert.equal(getBusPageUrl("2026-11-28", "caldas-novas", "all", "chegada"), "/horarios-onibus?sentido=chegada&data=2026-11-28&destino=caldas-novas");
});

test("próximas partidas usam o quadro de hoje e de amanhã sem horários passados", () => {
  withDepartures([], () => {
    // 2026-11-26 às 12:00 em Brasília: a próxima é a Real das 12:15 para Caldas Novas; a
    // União para Goiânia sai às 14:00 nesta data, pela exceção.
    const upcoming = getUpcomingBusDepartures(new Date("2026-11-26T15:00:00Z"), 4);
    assert.deepEqual(upcoming.map((item) => `${item.date} ${item.departure} ${item.destinationId}`), ["2026-11-26 12:15 caldas-novas", "2026-11-26 13:00 caldas-novas", "2026-11-26 13:30 goiania", "2026-11-26 14:00 goiania"]);
    const late = getUpcomingBusDepartures(new Date("2026-11-26T23:00:00Z"), 2);
    assert.deepEqual(late.map((item) => `${item.date} ${item.departure}`), ["2026-11-27 08:00", "2026-11-27 08:15"]);
  });
});

test("valores das passagens acompanham cada partida e chegada do quadro", () => {
  const fares = (list: { operatorId: string; departure: string; fares?: { serviceClass: string; min: number; max?: number }[] }[]) =>
    list.map((item) => `${item.departure} ${item.operatorId} ${(item.fares ?? []).map((fare) => `${fare.serviceClass}:${fare.min}${fare.max ? `-${fare.max}` : ""}`).join(",")}`);
  // Valores da ClickBus em 2026-11-26.
  assert.deepEqual(fares(getBusDepartures("2026-11-28", "goiania")), [
    "08:00 marly Convencional:47.99,Leito:60",
    "11:00 marly Convencional:47.99,Leito:60",
    "13:15 uniao Convencional:40.86",
    "13:30 marly Convencional:47.99,Leito:60",
    "15:50 real Convencional:41.83",
    "19:30 marly Convencional:47.99,Leito:60",
  ]);
  assert.deepEqual(fares(getBusDepartures("2026-12-07", "caldas-novas")).filter((item) => item.includes("real")), ["12:15 real Convencional:30.99-40.99"]);
  assert.deepEqual(fares(getBusArrivals("2026-12-02", "caldas-novas")), [
    "07:00 marly Convencional:45,Leito:50",
    "10:00 marly Convencional:45,Leito:50",
    "12:00 uniao Convencional:32.7",
    "12:30 marly Convencional:45,Leito:50",
    "14:30 real Convencional:30.99",
    "18:30 marly Convencional:45,Leito:50",
  ]);
  for (const date of ["2026-11-28", "2026-12-02"]) {
    for (const item of [...getRegularBusDepartures(date), ...getBusArrivals(date)]) assert.ok(item.fares?.length, `${date} ${item.id} sem valor`);
  }
});

test("resumo traz a faixa de valores de cada trajeto nos dois sentidos", () => {
  assert.deepEqual(getBusFareSummary().map((row) => `${row.direction} ${row.placeId} ${row.min}-${row.max}`), [
    "saida caldas-novas 30.18-50",
    "saida goiania 40.86-60",
    "chegada caldas-novas 30.99-50",
    "chegada goiania 40.99-60",
  ]);
});

test("valores somem da página depois de 120 dias sem conferência", () => {
  assert.equal(areBusFaresCurrent(new Date("2026-11-26T15:00:00Z")), true);
  assert.equal(areBusFaresCurrent(new Date("2027-03-26T15:00:00Z")), true);
  assert.equal(areBusFaresCurrent(new Date("2027-03-27T15:00:00Z")), false);
  assert.equal(areBusFaresCurrent(new Date("2026-11-25T15:00:00Z")), false, "data anterior à conferência");
});
