import assert from "node:assert/strict";
import test from "node:test";
import { brazilDate, weekForDate } from "../src/lib/civic-day.ts";

test("plantão muda no dia local e expira ao terminar a última semana", () => {
  const weeks = [{ inicio: "2026-10-31", name: "A" }, { inicio: "2026-11-07", name: "B" }];
  assert.equal(weekForDate(weeks, brazilDate(new Date("2026-11-07T02:59:59Z")))?.name, "A");
  assert.equal(weekForDate(weeks, brazilDate(new Date("2026-11-07T03:00:00Z")))?.name, "B");
  assert.equal(weekForDate(weeks, "2026-10-30"), null);
  assert.equal(weekForDate(weeks, "2026-11-14"), null);
  assert.equal(weekForDate([], "2026-11-03"), null);
});
