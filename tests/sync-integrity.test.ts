import assert from "node:assert/strict";
import test from "node:test";
import { assessCollector, assessFreshness, assessImport, assessScheduleCoverage, combineAssessments, type SyncObservation } from "../src/lib/sync-integrity.ts";

const now = new Date("2026-11-03T22:00:00Z");
const monthly = { cadence: "monthly", maxPeriodAgeMonths: 1, label: "Mensal" } as const;
const annual = { cadence: "annual", maxPeriodAgeYears: 3, label: "Anual" } as const;
const log = (details: Record<string, unknown>, overrides: Partial<SyncObservation> = {}): SyncObservation => ({ id: "sample", tipo: "folha", status: "success", started_at: "2026-11-03T06:00:00Z", finished_at: "2026-11-03T06:01:00Z", detalhes: details, ...overrides });

test("competência antiga não se torna atual por reimportação recente", () => {
  assert.equal(assessFreshness(1599, "2026-09", monthly, now).status, "warning");
  assert.equal(assessFreshness(36, "2026-10", monthly, now).status, "ok");
  assert.equal(assessFreshness(36, "2026-12", monthly, now).status, "warning");
});

test("base anual e cadastro manual não seguem limite mensal genérico", () => {
  assert.equal(assessFreshness(20, "2024", annual, now).status, "ok");
  assert.equal(assessFreshness(20, "2021", annual, now).status, "warning");
  assert.equal(assessFreshness(20, null, { cadence: "manual", label: "Sob demanda" }, now).status, "ok");
  assert.equal(assessFreshness(0, "2026", annual, now).status, "empty");
});

test("competência usa o calendário de São Paulo na virada do mês", () => {
  assert.equal(assessFreshness(36, "2026-09", monthly, new Date("2026-11-01T02:59:59Z")).status, "ok");
  assert.equal(assessFreshness(36, "2026-09", monthly, new Date("2026-11-01T03:00:00Z")).status, "warning");
});

test("importação parcial ou descartes nunca recebem OK", () => {
  assert.equal(assessImport(log({ fetched: 1000, source_total: 1800, complete: true }))?.status, "warning");
  assert.equal(assessImport(log({ fetched: 1800, source_total: 1800, complete: true, writes: { discarded: 1 } }))?.status, "warning");
  assert.equal(assessImport(log({ source_complete: false }))?.status, "warning");
  assert.equal(assessImport(log({}, { status: "partial" }))?.status, "warning");
});

test("ausência de conclusão, falha e estado desconhecido não viram sucesso", () => {
  assert.equal(assessImport(log({ complete: true }, { finished_at: null }))?.status, "warning");
  assert.equal(assessImport(log({}, { status: "error" }))?.status, "error");
  assert.equal(assessImport(log({}, { status: "running" }))?.status, "warning");
  assert.equal(assessImport(log({}, { status: "mystery" }))?.status, "warning");
});

test("fallback não confunde completude do mês anterior com ausência na fonte", () => {
  const fallback = assessImport(log({ fallback_used: true, source_complete: true, requested_competencia: "2026-11" }));
  assert.equal(fallback?.status, "warning");
  assert.match(fallback?.message ?? "", /não comprova ausência/);
  assert.doesNotMatch(assessImport(log({ scope: "2026-09", complete: true, fetched: 1599, source_total: 1599 }))?.message ?? "", /sem registros/);
  assert.doesNotMatch(assessImport(log({ fallback_used: true }))?.message ?? "", /sem registros/);
});

test("limite de execução do coletor é específico e não substitui competência", () => {
  const collector = { function_name: "sync-a", frequency_tier: "daily", max_stale_hours: 36, health_status: "healthy", cron_status: "scheduled", last_started_at: null, last_finished_at: null, last_dispatch_at: null };
  const result = combineAssessments(assessFreshness(1599, "2026-09", monthly, now), assessCollector(collector));
  assert.equal(result.status, "warning");
  assert.match(assessCollector({ ...collector, health_status: "stale" })?.message ?? "", /36 horas/);
  assert.equal(assessCollector({ ...collector, cron_status: "missing" })?.status, "warning");
  assert.equal(assessCollector({ ...collector, health_status: "failing" })?.status, "error");
});

test("plantão depende da cobertura da escala, inclusive lacunas e fim de validade", () => {
  const starts = ["2026-10-31", "2026-11-14"];
  assert.equal(assessScheduleCoverage(starts, now).status, "ok");
  assert.equal(assessScheduleCoverage(starts, new Date("2026-11-10T12:00:00Z")).status, "warning");
  assert.equal(assessScheduleCoverage(starts, new Date("2026-11-21T03:00:00Z")).status, "warning");
  assert.equal(assessScheduleCoverage([], now).status, "empty");
});
