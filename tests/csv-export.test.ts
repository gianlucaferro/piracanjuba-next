import assert from "node:assert/strict";
import test from "node:test";
import { downloadCSV, serializeCSV } from "../src/lib/csvExport.ts";

test("CSV preserva acentos, aspas, delimitadores e quebras dentro da célula", () => {
  assert.equal(
    serializeCSV(["Nome", "Cargo"], [['João "Júnior", Silva', "Saúde\r\nEducação\nPlantão"]], ","),
    'Nome,Cargo\r\n"João ""Júnior"", Silva","Saúde\r\nEducação\nPlantão"',
  );
  assert.equal(serializeCSV(["Descrição", "Valor"], [["A;B", 25]]), 'Descrição;Valor\r\n"A;B";25');
});

test("CSV neutraliza fórmulas externas inclusive com espaços e controles iniciais", () => {
  for (const prefix of ["", " ", "\t", "\r\n", "\u0000", "\u007f", "\uFEFF", "\u200B", "\u202E", "\u2066"]) {
    for (const formula of ["=1+1", "+123", "-123", "@SUM(A1)", "＝1+1", "＋1", "－1", "＠SUM(A1)"]) {
      const value = prefix + formula;
      assert.equal(serializeCSV(["Campo"], [[value]], ","), `Campo\r\n"'${value}"`);
    }
  }
  assert.equal(serializeCSV(["=cabeçalho"], [["texto normal = 2"]]), '"\'=cabeçalho"\r\ntexto normal = 2');
});

test("CSV impede que aspas e delimitadores externos abram uma nova célula de fórmula", () => {
  const malicious = '=HYPERLINK("https://example.test"),"\r\n=1+1';
  assert.equal(
    serializeCSV(["Campo"], [[malicious]], ","),
    'Campo\r\n"\'=HYPERLINK(""https://example.test""),""\r\n=1+1"',
  );
});

test("CSV mantém números negativos numéricos e representa valores ausentes sem texto artificial", () => {
  assert.equal(
    serializeCSV(["Número", "Texto", "Nulo", "Ausente", "Inválido", "Infinito"], [[-12, "-12", null, undefined, NaN, Infinity]]),
    'Número;Texto;Nulo;Ausente;Inválido;Infinito\r\n-12;"\'-12";;;;',
  );
});

test("download CSV mantém BOM UTF-8, nome e libera a URL temporária", async (t) => {
  let receivedBlob: Blob | undefined;
  let clicked = false;
  let revoked = "";
  const anchor = { href: "", download: "", click() { clicked = true; } };
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { createElement: (tag: string) => { assert.equal(tag, "a"); return anchor; } },
  });
  t.after(() => {
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
    else Reflect.deleteProperty(globalThis, "document");
  });
  t.mock.method(URL, "createObjectURL", (blob: Blob) => { receivedBlob = blob; return "blob:csv-test"; });
  t.mock.method(URL, "revokeObjectURL", (url: string) => { revoked = url; });
  downloadCSV("servidores.csv", ["Nome"], [["João"]], ",");
  assert.equal(clicked, true);
  assert.equal(anchor.download, "servidores.csv");
  assert.equal(anchor.href, "blob:csv-test");
  assert.equal(revoked, "blob:csv-test");
  assert.ok(receivedBlob);
  assert.equal(receivedBlob.type, "text/csv;charset=utf-8;");
  assert.deepEqual(Buffer.from(await receivedBlob.arrayBuffer()), Buffer.from("\uFEFFNome\r\nJoão", "utf8"));
});
