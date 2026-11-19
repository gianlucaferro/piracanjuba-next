import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SUFIXO_TITULO } from "../src/lib/abas-orgaos.ts";

// /transparencia/cotas-parlamentares entrou no sitemap e no llms.txt na Onda 2 de SEO (2026-11-19).
// A página importa "@/...", que o node --test não resolve, então o teste lê o fonte.

const PAGINA = readFileSync(new URL("../src/app/transparencia/cotas-parlamentares/page.tsx", import.meta.url), "utf8");
const CARTAO = readFileSync(new URL("../src/components/camara/CotasParlamentaresCard.tsx", import.meta.url), "utf8");
const TRAVESSAO = /[\u2013\u2014]/;

function metadata(): { title: string; description: string } {
  const m = PAGINA.match(/export const metadata = pageMetadata\(\{\s*title:\s*"([^"]+)",\s*description:\s*"([^"]+)"/);
  assert.ok(m, "não achei title e description em pageMetadata");
  return { title: m[1], description: m[2] };
}

test("cotas parlamentares: título até 60 caracteres com o sufixo e description de 120 a 160", () => {
  const { title, description } = metadata();
  const renderizado = title + SUFIXO_TITULO;
  assert.ok(renderizado.length <= 60, `título renderizado com ${renderizado.length} caracteres`);
  assert.match(title, /^Cotas parlamentares/, "palavra-chave primeiro");
  assert.ok(description.length >= 120 && description.length <= 160, `description com ${description.length}`);
  assert.doesNotMatch(title + description, TRAVESSAO);
  assert.doesNotMatch(title, /\|/, "o sufixo vem do layout");
});

test("cotas parlamentares: description diz o que o corpo diz (subsídio e diárias, sem cota)", () => {
  const { description } = metadata();
  assert.match(description, /não há cota/);
  assert.match(description, /verba indenizatória/);
  assert.match(description, /subsídio mensal e diárias/);
  // O corpo lista as diárias entre o que o vereador recebe; nada pode dizer "apenas o subsídio".
  assert.match(PAGINA, /<strong>Diárias<\/strong>/);
  assert.doesNotMatch(PAGINA, /apenas o subsídio/);
});

test("cotas parlamentares: página e cartão completo sem travessão no texto", () => {
  assert.doesNotMatch(PAGINA, TRAVESSAO);
  // O cartão "full" é o que a página mostra; o compacto (perfil do vereador) fica fora deste teste.
  const completo = CARTAO.slice(CARTAO.indexOf('// Variant "full"'));
  assert.ok(completo.length > 100, "não achei o cartão completo");
  assert.doesNotMatch(completo, TRAVESSAO);
});
