import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const catalog = JSON.parse(readFileSync(new URL("../src/data/previas-zap.json", import.meta.url), "utf8"));
const publicRoot = new URL("../public/", import.meta.url);
const slugs = catalog.map((p) => p.slug);

test("cada prévia tem um endereço distinto, WhatsApp brasileiro e identidade própria", () => {
  assert.equal(new Set(slugs).size, slugs.length);
  const phones = new Set();
  for (const company of catalog) {
    assert.match(company.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(!["vitorinoperfumes", "apareca", "aparecaai"].includes(company.slug.replaceAll("-", "")));
    assert.ok(company.nome && company.categoria && company.apresentacao);
    assert.ok(company.telefones.length > 0);
    for (const number of company.telefones) {
      assert.match(number, /^55[1-9]\d(?:9\d{8}|[2-5]\d{7})$/, company.nome);
      assert.ok(!phones.has(number), company.nome + " repete uma linha comercial");
      phones.add(number);
    }
  }
});

test("mídia de cada prévia e cartão de WhatsApp estão publicados no próprio site", () => {
  for (const company of catalog) {
    for (const path of [company.logo, company.foto, "/marcas-zap/compartilhar/" + company.slug + ".jpg"].filter(Boolean)) {
      assert.match(path, /^\/marcas-zap\/[\w./-]+$/);
      assert.ok(existsSync(new URL("." + path, publicRoot)), path);
    }
    for (const url of [company.site, company.instagram, company.facebook, company.mapa].filter(Boolean)) {
      assert.ok(["https:", "http:"].includes(new URL(url).protocol), url);
    }
  }
});
