import assert from "node:assert/strict";
import test from "node:test";
import {
  BUS_DEPARTURES,
  BUS_DESTINATIONS,
  BUS_OPERATORS,
  BUS_SNAPSHOT_DATE,
  getBrazilDate,
  getBusDepartures,
  getBusSearchUrl,
  getInitialBusDate,
  isBusDate,
  isBusDeparturePast,
} from "../src/data/horariosOnibus.ts";
import type { BusDeparture } from "../src/data/horariosOnibus.ts";

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

test("data inicial abandona a amostra quando seu dia termina em São Paulo", () => {
  const start = new Date(`${BUS_SNAPSHOT_DATE}T03:00:00Z`).getTime();
  const end = start + 24 * 60 * 60 * 1000;
  assert.equal(getInitialBusDate(new Date(start - 1)), BUS_SNAPSHOT_DATE);
  assert.equal(getInitialBusDate(new Date(start)), BUS_SNAPSHOT_DATE);
  assert.equal(getInitialBusDate(new Date(end - 1)), BUS_SNAPSHOT_DATE);
  const nextDate = new Date(end).toISOString().slice(0, 10);
  assert.equal(getInitialBusDate(new Date(end)), nextDate);
  withDepartures([departure({ date: BUS_SNAPSHOT_DATE })], () => {
    assert.deepEqual(getBusDepartures(getInitialBusDate(new Date(end))), []);
  });
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
