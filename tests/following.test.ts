import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PREFERENCES, filterFollowing, followingChanges, followingDue, followingSnapshot, initializeFollowingTopics, parsePreferences } from "../src/lib/following.ts";
import type { FollowItem } from "../src/lib/following.ts";

const items: FollowItem[] = [
  { id: "bus:1", topic: "onibus", title: "Goiânia", detail: "", href: "/horarios-onibus", revision: "13:15", filter: "goiania" },
  { id: "act:1", topic: "camara", title: "Indicação", detail: "", href: "/camara", revision: "v1", filter: "João da Silva" },
];
test("preferências inválidas não assinam temas nem permitem valores arbitrários", () => {
  assert.deepEqual(parsePreferences("broken"), DEFAULT_PREFERENCES);
  assert.deepEqual(parsePreferences('{"topics":["onibus","secrets"],"frequency":"every-second"}').topics, ["onibus"]);
  assert.equal(parsePreferences('{"frequency":"off"}').frequency, "off");
});
test("filtros respeitam destino e nome do vereador sem acentos", () => {
  assert.equal(filterFollowing(items, { ...DEFAULT_PREFERENCES, topics: ["onibus"], destination: "caldas-novas" }).length, 0);
  assert.equal(filterFollowing(items, { ...DEFAULT_PREFERENCES, topics: ["camara"], councilor: "joao" }).length, 1);
});
test("primeiro acesso cria referência; atualização só avisa mudança de conteúdo", () => {
  const baseline = followingSnapshot({ items, unavailable: [], checkedAt: "2026-11-03T12:00:00Z" }, null);
  assert.deepEqual(followingChanges(items, null), []);
  assert.deepEqual(followingChanges(items, baseline), []);
  assert.equal(followingChanges([{ ...items[0], revision: "15:35" }], baseline).length, 1);
  assert.equal(followingSnapshot({ items: [], unavailable: ["onibus"], checkedAt: "2026-11-04T12:00:00Z" }, baseline).revisions["bus:1"], "13:15");
});
test("frequência e cancelamento impedem avisos antes da escolha do visitante", () => {
  const baseline = { checkedAt: "2026-11-03T12:00:00Z", revisions: {}, initializedTopics: [] };
  assert.equal(followingDue(baseline, "daily", new Date("2026-11-04T11:59:59Z")), false);
  assert.equal(followingDue(baseline, "daily", new Date("2026-11-04T12:00:00Z")), true);
  assert.equal(followingDue(baseline, "weekly", new Date("2026-11-04T12:00:00Z")), false);
  assert.equal(followingDue(baseline, "off", new Date("2026-12-01T12:00:00Z")), false);
});

test("fonte que se recupera não anuncia registros antigos como novidade", () => {
  const baseline = followingSnapshot({ items: [], unavailable: ["onibus"], checkedAt: "2026-11-03T12:00:00Z" }, null);
  assert.deepEqual(followingChanges(items.filter((item) => item.topic === "onibus"), baseline), []);
  const recovered = initializeFollowingTopics({ items, unavailable: [], checkedAt: "2026-11-04T12:00:00Z" }, baseline)!;
  assert.equal(recovered.checkedAt, baseline.checkedAt);
  assert.deepEqual(followingChanges(items.filter((item) => item.topic === "onibus"), recovered), []);
  assert.equal(followingChanges([{ ...items[0], revision: "novo horario" }], recovered).length, 1);
});
