import assert from "node:assert/strict";
import test from "node:test";
import { ExportChangedError, readStableExport, type ExportRevision } from "../src/lib/stable-export.ts";

type Row = { id: string; nome: string };
const version = (row: Row) => JSON.stringify([row.id, row.nome]);
const revision = (count: number): ExportRevision => ({ count, latestUpdatedAt: count ? "2026-11-03T12:00:00Z" : null, latestId: count ? "z" : null });
const sample: Row[] = [{ id: "a", nome: "Ana" }, { id: "b", nome: "Bia" }, { id: "c", nome: "Caio" }];
const pageOf = (rows: Row[], afterId: string | null, limit: number) => rows.filter(row => afterId === null || row.id > afterId).slice(0, limit).map(row => ({ ...row }));

test("exportação confirma todos os registros por cursor em duas leituras", async () => {
  const rows = Array.from({ length: 1203 }, (_, index) => ({ id: String(index).padStart(5, "0"), nome: `Servidor ${index}` }));
  const cursors: (string | null)[] = [];
  let revisions = 0;
  const result = await readStableExport({
    async readRevision() { revisions++; return revision(rows.length); },
    async readPage(afterId, limit) { cursors.push(afterId); return pageOf(rows, afterId, limit); },
    rowVersion: version,
  });
  assert.deepEqual(result, rows);
  assert.deepEqual(cursors, [null, "00499", "00999", null, "00499", "00999"]);
  assert.equal(revisions, 3);
});

test("exportação refaz leitura quando registro é substituído sem mudar count ou updated_at", async () => {
  let rows = sample.map(row => ({ ...row }));
  let pageCalls = 0;
  const result = await readStableExport({
    async readRevision() { return revision(rows.length); },
    async readPage(afterId, limit) {
      pageCalls++;
      // A inserção fica antes do cursor da segunda página, sem mudar a contagem.
      if (pageCalls === 2) rows = [{ id: "aa", nome: "Alice" }, ...rows.slice(1)];
      return pageOf(rows, afterId, limit);
    },
    rowVersion: version,
  }, { pageSize: 2 });
  assert.deepEqual(result, rows);
  assert.equal(pageCalls, 8);
  assert.equal(result.some(row => row.id === "a"), false);
});

test("exportação detecta alteração de conteúdo com IDs, count e updated_at preservados", async () => {
  let rows = sample.map(row => ({ ...row }));
  let pageCalls = 0;
  const result = await readStableExport({
    async readRevision() { return revision(rows.length); },
    async readPage(afterId, limit) {
      if (++pageCalls === 3) rows = rows.map(row => row.id === "a" ? { ...row, nome: "Ana Corrigida" } : row);
      return pageOf(rows, afterId, limit);
    },
    rowVersion: version,
  }, { pageSize: 2 });
  assert.equal(result[0].nome, "Ana Corrigida");
  assert.equal(pageCalls, 8);
});

test("exportação refaz leitura se assinatura mudar durante a coleta", async () => {
  let revisions = 0;
  const result = await readStableExport({
    async readRevision() {
      revisions++;
      return { ...revision(sample.length), latestUpdatedAt: revisions === 1 ? "2026-11-02T12:00:00Z" : "2026-11-03T12:00:00Z" };
    },
    async readPage(afterId, limit) { return pageOf(sample, afterId, limit); },
    rowVersion: version,
  }, { pageSize: 2 });
  assert.deepEqual(result, sample);
  assert.equal(revisions, 5);
});

test("exportação recusa duplicatas, ordem inválida e páginas truncadas", async () => {
  for (const rows of [[sample[0], sample[0]], [sample[1], sample[0]], [sample[0]]]) {
    let reads = 0;
    await assert.rejects(readStableExport({
      async readRevision() { return revision(3); },
      async readPage() { reads++; return rows; },
      rowVersion: version,
    }, { pageSize: 2 }), ExportChangedError);
    assert.equal(reads, 3);
  }
});

test("exportação recusa páginas vazias prematuras sem baixar conteúdo parcial", async () => {
  let reads = 0;
  await assert.rejects(readStableExport({
    async readRevision() { return revision(3); },
    async readPage(afterId) { reads++; return afterId === null ? sample.slice(0, 2) : []; },
    rowVersion: version,
  }, { pageSize: 2 }), ExportChangedError);
  assert.equal(reads, 6);
});

test("exportação falha de forma explícita após três tentativas de uma base continuamente alterada", async () => {
  let reads = 0;
  let revisions = 0;
  await assert.rejects(readStableExport({
    async readRevision() { revisions++; return revision(1); },
    async readPage() { return [{ id: "a", nome: `Versão ${++reads}` }]; },
    rowVersion: version,
  }), { name: "ExportChangedError", message: /tente novamente/ });
  assert.equal(reads, 6);
  assert.equal(revisions, 9);
});

test("exportação propaga falha de rede sem tratar a falha como resultado vazio", async () => {
  let reads = 0;
  const failure = new Error("Falha de rede");
  await assert.rejects(readStableExport({
    async readRevision() { return revision(3); },
    async readPage(): Promise<Row[]> { reads++; throw failure; },
    rowVersion: version,
  }), failure);
  assert.equal(reads, 1);
});

test("exportação confirma base vazia e limita tamanho antes de consultar páginas", async () => {
  let reads = 0;
  const source = {
    async readRevision() { return revision(0); },
    async readPage(): Promise<Row[]> { reads++; return []; },
    rowVersion: version,
  };
  assert.deepEqual(await readStableExport(source), []);
  assert.equal(reads, 0);
  await assert.rejects(readStableExport({ ...source, async readRevision() { return revision(100_001); } }), /confirmar o tamanho/);
  assert.equal(reads, 0);
});
