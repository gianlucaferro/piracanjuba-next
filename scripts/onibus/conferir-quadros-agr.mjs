#!/usr/bin/env node
// Confere se a AGR publicou quadro de horários novo para as linhas que passam por
// Piracanjuba. Compara os PDFs listados nas páginas das empresas com os documentos usados
// em src/data/horariosOnibusQuadro.ts.
//
// Saída 1: a AGR publicou, trocou ou retirou um quadro. Atualize horariosOnibusQuadro.ts
// (horários, dias, documento e data de autorização) e confira a passagem por Piracanjuba
// numa consulta à ClickBus antes de publicar.
// Saída 0: nada mudou, ou a AGR não respondeu (aviso no log; a próxima execução tenta de novo).
//
// Uso: node scripts/onibus/conferir-quadros-agr.mjs

import { pathToFileURL } from "node:url";

export const PAGINAS_AGR = [
  "https://goias.gov.br/agr/quadros-de-horarios-da-expresso-marly/",
  "https://goias.gov.br/agr/quadros-de-horarios-da-expresso-uniao/",
  "https://goias.gov.br/agr/quadros-de-horarios-da-empresa-real-expresso/",
];

/**
 * PDFs de quadros com passagem por Piracanjuba citados no HTML de uma página da AGR.
 * Ignora as viagens diretas ("-DR-"), que não param em Piracanjuba.
 */
export function extrairQuadros(html) {
  const encontrados = new Set();
  for (const match of html.matchAll(/<a\b[^>]*href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = match[1].replace(/&amp;/g, "&");
    const texto = match[2].replace(/<[^>]+>/g, " ");
    if (!/piracanjuba/i.test(`${url} ${texto}`)) continue;
    if (/-DR-|viagens? diretas?/i.test(`${url} ${texto}`)) continue;
    encontrados.add(url);
  }
  return encontrados;
}

/** Diferença entre os documentos em uso e os publicados nas páginas que responderam. */
export function compararQuadros(conhecidos, publicados) {
  const conhecidosSet = new Set(conhecidos);
  return {
    novos: [...publicados].filter((url) => !conhecidosSet.has(url)).sort(),
    ausentes: [...conhecidosSet].filter((url) => !publicados.has(url)).sort(),
  };
}

async function baixar(url) {
  for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
    try {
      const resposta = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; piracanjuba.ai; conferencia-de-quadros)" },
        signal: AbortSignal.timeout(30_000),
      });
      if (resposta.ok) {
        const html = await resposta.text();
        if (html.length > 2_000) return html;
      }
    } catch {
      // Tenta de novo abaixo.
    }
    await new Promise((resolve) => setTimeout(resolve, 10_000 * tentativa));
  }
  return null;
}

async function main() {
  const { BUS_REGULAR_AGR_DOCUMENTS } = await import("../../src/data/horariosOnibusQuadro.ts");
  const publicados = new Set();
  let respostas = 0;
  for (const pagina of PAGINAS_AGR) {
    const html = await baixar(pagina);
    if (!html) {
      console.log(`::warning::AGR não respondeu: ${pagina}`);
      continue;
    }
    respostas += 1;
    for (const url of extrairQuadros(html)) publicados.add(url);
  }
  if (respostas < PAGINAS_AGR.length) {
    console.log("::warning::Conferência incompleta: nem todas as páginas da AGR responderam. Nada foi comparado.");
    return 0;
  }
  const { novos, ausentes } = compararQuadros(BUS_REGULAR_AGR_DOCUMENTS, publicados);
  console.log(`Quadros com Piracanjuba publicados pela AGR: ${publicados.size}. Em uso no site: ${BUS_REGULAR_AGR_DOCUMENTS.length}.`);
  if (novos.length === 0 && ausentes.length === 0) {
    console.log("Nenhuma mudança nos quadros da AGR.");
    console.log("Lembrete: Uberlândia e Araguari seguem só com conexão; se a venda passar a oferecer a linha direta da ANTT (GOSP0080013), inclua-a no quadro.");
    return 0;
  }
  for (const url of novos) console.log(`::error::Quadro novo na AGR: ${url}`);
  for (const url of ausentes) console.log(`::error::Quadro em uso que saiu da página da AGR: ${url}`);
  console.log("Atualize src/data/horariosOnibusQuadro.ts e confira a passagem por Piracanjuba na ClickBus antes de publicar.");
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
