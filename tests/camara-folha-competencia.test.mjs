import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { test } from "node:test";

async function fixture(fetchFolha) {
  const path = new URL("../supabase/functions/sync-camara-servidores/index.ts", import.meta.url);
  const text = await readFile(path, "utf8");
  const source = stripTypeScriptTypes(text.replace(/^import[\s\S]*?;\n/gm, ""));
  const scope = { Date, console, CENTI_BASE_CAMARA: "https://example.test", Deno: { serve() {} } };
  vm.runInNewContext(source, scope);
  scope.fetchFolha = fetchFolha;
  return scope;
}

test("descoberta inicia na competencia corrente e recua somente quando vazia", async () => {
  const attempts = [];
  const scope = await fixture(async (mes, ano) => {
    attempts.push([ano, mes]);
    return { dados: mes === 7 ? [{ id: 1 }] : [], total: mes === 7 ? 1 : 0, complete: true };
  });
  const initial = scope.currentMonth(new Date("2026-09-07T15:00:00Z"));
  const source = await scope.fetchMostRecentFolha(initial.ano, initial.mes, false);
  assert.deepEqual(attempts, [[2026, 9], [2026, 8], [2026, 7]]);
  assert.equal(source.competencia, "2026-07");
});

test("fallback de janeiro consulta dezembro do ano anterior", async () => {
  const attempts = [];
  const scope = await fixture(async (mes, ano) => {
    attempts.push([ano, mes]);
    return { dados: mes === 12 ? [{ id: 1 }] : [], total: mes === 12 ? 1 : 0, complete: true };
  });
  const initial = scope.currentMonth(new Date("2027-01-02T12:00:00Z"));
  const source = await scope.fetchMostRecentFolha(initial.ano, initial.mes, false);
  assert.deepEqual(attempts, [[2027, 1], [2026, 12]]);
  assert.equal(source.competencia, "2026-12");
});

test("competencia explicita vazia nao e substituida por outro mes", async () => {
  const attempts = [];
  const scope = await fixture(async (mes, ano) => {
    attempts.push([ano, mes]);
    return { dados: [], total: 0, complete: true };
  });
  const source = await scope.fetchMostRecentFolha(2026, 9, true);
  assert.equal(source.competencia, "2026-09");
  assert.equal(source.dados.length, 0);
  assert.deepEqual(attempts, [[2026, 9]]);
});
