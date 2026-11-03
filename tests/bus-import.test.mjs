import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { importBusSchedules } from "../scripts/import-bus-schedules.mjs";

function trip(id, date = "2026-09-10") {
  return {
    id, date, destinationId: "goiania", operatorId: "uniao", departure: "13:15",
    arrival: "15:00", arrivalDate: date, durationMinutes: 105,
    serviceClasses: ["Convencional"], boarding: { name: "Piracanjuba, GO", verified: false },
    stops: [], checkedAt: "2026-09-08",
    sources: [{ name: "ClickBus", url: `https://www.clickbus.com.br/onibus/piracanjuba-go/goiania-go?departureDate=${date}` }],
  };
}

function fixture(t, current, incoming) {
  const directory = mkdtempSync(join(tmpdir(), "pba-bus-import-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const input = join(directory, "input.json");
  const target = join(directory, "stored.json");
  writeFileSync(input, JSON.stringify(incoming));
  writeFileSync(target, JSON.stringify(current));
  return { input, target, now: new Date("2026-09-09T15:00:00Z") };
}

test("importação parcial aplicada mantém o histórico existente", (t) => {
  const historical = trip("historical");
  const addition = trip("addition", "2026-09-11");
  const files = fixture(t, [historical], [addition]);
  const result = importBusSchedules({ ...files, apply: true });
  assert.equal(result.total, 2);
  assert.deepEqual(result.removed, []);
  assert.deepEqual(JSON.parse(readFileSync(files.target, "utf8")), [historical, addition]);
});

test("mesmo ID é atualizado sem remover os outros registros", (t) => {
  const historical = trip("historical");
  const unchanged = trip("unchanged", "2026-09-11");
  const corrected = { ...historical, arrival: "15:10", durationMinutes: 115 };
  const files = fixture(t, [historical, unchanged], [corrected]);
  importBusSchedules({ ...files, apply: true });
  assert.deepEqual(JSON.parse(readFileSync(files.target, "utf8")), [corrected, unchanged]);
});

test("remoção exige opção explícita e é listada no resultado", (t) => {
  const historical = trip("historical");
  const replacement = trip("replacement", "2026-09-11");
  const files = fixture(t, [historical], [replacement]);
  const result = importBusSchedules({ ...files, apply: true, allowRemovals: true });
  assert.deepEqual(result.removed, [historical.id]);
  assert.deepEqual(JSON.parse(readFileSync(files.target, "utf8")), [replacement]);
});

test("simulação não modifica o arquivo mesmo quando permite remoção", (t) => {
  const historical = trip("historical");
  const files = fixture(t, [historical], [trip("addition", "2026-09-11")]);
  const before = readFileSync(files.target, "utf8");
  importBusSchedules({ ...files, allowRemovals: true });
  assert.equal(readFileSync(files.target, "utf8"), before);
});

test("conflito entre a importação e o histórico não produz escrita parcial", (t) => {
  const files = fixture(t, [trip("historical")], [trip("duplicate-new-id")]);
  const before = readFileSync(files.target, "utf8");
  assert.throws(() => importBusSchedules({ ...files, apply: true }), /partida repetida/);
  assert.equal(readFileSync(files.target, "utf8"), before);
});
