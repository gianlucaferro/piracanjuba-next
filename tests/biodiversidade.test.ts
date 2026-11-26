import test from "node:test";
import assert from "node:assert/strict";
import {
  LINK_GBIF_REGISTROS,
  LINK_INATURALIST_ESPECIES,
  GBIF_LIMITE_FACETA,
  carregarGbif,
  carregarInaturalist,
  criarLimitador,
  escolherNomePopularGbif,
  grupoDaClassificacaoGbif,
  lerAmeacadasGbif,
  lerBuscaGbif,
  lerEspecieGbif,
  lerEspeciesInaturalist,
  lerTotalInaturalist,
  lerVisaoGeralGbif,
  limparTexto,
  montarGruposGbif,
  normalizarNomePopular,
  urlGbifAmeacadas,
  urlGbifGrupo,
  urlGbifVisaoGeral,
  urlInaturalistEspecies,
  urlInaturalistObservacoes,
} from "../src/lib/biodiversidade.ts";
import {
  FIXTURE_GBIF_BASE,
  FIXTURE_INATURALIST_BASE,
  buscarFixture,
  respostaFixtureBiodiversidade,
} from "./fixtures/biodiversidade-fixtures.mjs";

// 2026-11-25 17:40 em Brasília.
const AGORA = Date.parse("2026-11-25T20:40:00Z");
const dataset = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function corpoFixture(url: string): Record<string, unknown> {
  const resposta = respostaFixtureBiodiversidade(new URL(url));
  assert.ok(resposta && resposta.status === 200, `fixture sem resposta para ${url}`);
  return JSON.parse(JSON.stringify(resposta.body)) as Record<string, unknown>;
}

test("as consultas usam o limite do município, licenças comerciais e facetas, sem baixar ocorrências", () => {
  const visao = new URL(urlGbifVisaoGeral());
  assert.equal(visao.origin + visao.pathname, "https://api.gbif.org/v1/occurrence/search");
  assert.equal(visao.searchParams.get("gadmGid"), "BRA.9.183_2");
  assert.equal(visao.searchParams.get("occurrenceStatus"), "PRESENT");
  assert.deepEqual(visao.searchParams.getAll("license"), ["CC0_1_0", "CC_BY_4_0"]);
  assert.equal(visao.searchParams.get("limit"), "0");
  assert.deepEqual(visao.searchParams.getAll("facet"), ["speciesKey", "datasetKey", "year", "basisOfRecord"]);

  const repteis = new URL(urlGbifGrupo([11592253, 11418114, 11493978, 358]));
  assert.deepEqual(repteis.searchParams.getAll("taxonKey"), ["11592253", "11418114", "11493978", "358"]);
  assert.equal(repteis.searchParams.get("limit"), "0");

  const ameacadas = new URL(urlGbifAmeacadas());
  assert.deepEqual(ameacadas.searchParams.getAll("iucnRedListCategory"), ["CR", "EN", "VU", "NT"]);

  const inaturalist = new URL(urlInaturalistEspecies());
  assert.equal(inaturalist.origin + inaturalist.pathname, "https://api.inaturalist.org/v1/observations/species_counts");
  assert.equal(inaturalist.searchParams.get("place_id"), "21162");
  assert.equal(inaturalist.searchParams.get("verifiable"), "true");
  assert.equal(inaturalist.searchParams.get("rank"), "species");
  assert.equal(inaturalist.searchParams.get("locale"), "pt-BR");
  assert.equal(new URL(urlInaturalistObservacoes()).searchParams.get("per_page"), "0");

  assert.equal(
    LINK_GBIF_REGISTROS,
    "https://www.gbif.org/occurrence/search?gadmGid=BRA.9.183_2&occurrenceStatus=PRESENT&license=CC0_1_0&license=CC_BY_4_0",
  );
  assert.equal(LINK_INATURALIST_ESPECIES, "https://www.inaturalist.org/observations?place_id=21162&verifiable=true&view=species");
});

test("panorama do GBIF agrega totais, grupos, espécies, ameaçadas e créditos a partir das fixtures", async () => {
  const resumo = await carregarGbif(buscarFixture(), { base: FIXTURE_GBIF_BASE, agoraMs: AGORA });
  assert.deepEqual(resumo, {
    fonte: "GBIF",
    consultadoEm: "2026-11-25T20:40:00.000Z",
    registros: 1234,
    especies: 330,
    conjuntosDeDados: 12,
    anoInicial: 1950,
    anoFinal: 2026,
    observacoesCampo: 904,
    exemplaresColecao: 300,
    grupos: [
      { id: "aves", nome: "Aves", especies: 150, registros: 600 },
      { id: "plantas", nome: "Plantas", especies: 90, registros: 250 },
      // Cordados (210, 761) menos aves, anfíbios, répteis e mamíferos.
      { id: "peixes", nome: "Peixes", especies: 33, registros: 30 },
      { id: "anfibios", nome: "Anfíbios", especies: 20, registros: 120 },
      { id: "insetos", nome: "Insetos", especies: 15, registros: 30 },
      { id: "aracnideos", nome: "Aracnídeos", especies: 8, registros: 36 },
      { id: "repteis", nome: "Répteis", especies: 4, registros: 6 },
      { id: "mamiferos", nome: "Mamíferos", especies: 3, registros: 5 },
      { id: "fungos", nome: "Fungos", especies: 1, registros: 1 },
      // O que sobra do total, inclusive registros identificados só até gênero.
      { id: "outros", nome: "Outros grupos", especies: 6, registros: 156 },
    ],
    maisRegistradas: [
      { chave: 2428549, nomeCientifico: "Dendropsophus minutus", nomePopular: "Perereca-pequena", grupo: "anfibios", registros: 20 },
      { chave: 5217879, nomeCientifico: "Scinax fuscomarginatus", nomePopular: null, grupo: "anfibios", registros: 18 },
      // Empate em 11 registros: desempata pela chave. O nome do catálogo brasileiro vence o do Catalogue of Life.
      { chave: 2481942, nomeCientifico: "Coragyps atratus", nomePopular: "Urubu", grupo: "aves", registros: 11 },
      { chave: 5959231, nomeCientifico: "Ara ararauna", nomePopular: "Arara-canindé", grupo: "aves", registros: 11 },
      { chave: 2480989, nomeCientifico: "Caracara plancus", nomePopular: "Carcará", grupo: "aves", registros: 10 },
      // A espécie 2482755 falhou na consulta do nome e saiu da lista.
      { chave: 2353648, nomeCientifico: "Aphyocharax rathbuni", nomePopular: null, grupo: "peixes", registros: 9 },
      { chave: 5285637, nomeCientifico: "Qualea grandiflora", nomePopular: "Pau-terra", grupo: "plantas", registros: 9 },
    ],
    ameacadas: [
      { chave: 2482174, nomeCientifico: "Crax fasciolata", nomePopular: "Mutum-de-penacho", grupo: "aves", categoria: "VU", registros: 2 },
      { chave: 2479662, nomeCientifico: "Amazona aestiva", nomePopular: "Papagaio-verdadeiro", grupo: "aves", categoria: "NT", registros: 4 },
      { chave: 7785578, nomeCientifico: "Sapajus libidinosus", nomePopular: "Macaco-prego", grupo: "mamiferos", categoria: "NT", registros: 2 },
    ],
    ameacadasParcial: false,
    principaisConjuntos: [
      // Título de terceiro sem travessão, como o resto do site.
      { chave: dataset(1), titulo: "EOD: eBird Observation Dataset", registros: 600 },
      {
        chave: dataset(2),
        titulo: "ICMBio | Dados de ocorrência de espécies do Sistema de Autorização e Informações de Biodiversidade (SISBio) do ICMBio",
        registros: 300,
      },
      { chave: dataset(3), titulo: "iNaturalist Research-grade Observations", registros: 150 },
      // O conjunto 4 ficou sem título e saiu dos créditos nomeados, mas segue na contagem de 12.
      { chave: dataset(5), titulo: "RB - Coleção do Herbário do Jardim Botânico do Rio de Janeiro", registros: 40 },
    ],
  });
});

test("falha numa consulta obrigatória do GBIF derruba o bloco inteiro, sem números parciais", async () => {
  for (const trecho of ["taxonKey=212", "taxonKey=44", "iucnRedListCategory", "facet=datasetKey"]) {
    await assert.rejects(
      carregarGbif(buscarFixture((url) => url.includes(trecho)), { base: FIXTURE_GBIF_BASE, agoraMs: AGORA }),
      Error,
      trecho,
    );
  }
});

test("falha nos nomes populares mantém as espécies só com o nome científico", async () => {
  const resumo = await carregarGbif(buscarFixture((url) => url.includes("/vernacularNames")), {
    base: FIXTURE_GBIF_BASE,
    agoraMs: AGORA,
  });
  assert.equal(resumo.maisRegistradas.length, 7);
  assert.ok(resumo.maisRegistradas.every((especie) => especie.nomePopular === null));
  assert.ok(resumo.ameacadas.every((especie) => especie.nomePopular === null));
  assert.equal(resumo.ameacadas[0].nomeCientifico, "Crax fasciolata");
});

test("cada nome popular é consultado uma vez só, com no máximo quatro consultas simultâneas", async () => {
  const pedidas: string[] = [];
  let ativas = 0;
  let pico = 0;
  const fixture = buscarFixture();
  await carregarGbif(
    async (url) => {
      pedidas.push(url);
      ativas += 1;
      pico = Math.max(pico, ativas);
      await new Promise((resolve) => setTimeout(resolve, 1));
      try {
        return await fixture(url);
      } finally {
        ativas -= 1;
      }
    },
    { base: FIXTURE_GBIF_BASE, agoraMs: AGORA },
  );
  assert.ok(pico <= 4, `pico de ${pico} consultas`);
  const nomes = pedidas.filter((url) => url.includes("/vernacularNames"));
  assert.equal(new Set(nomes).size, nomes.length);
  // 7 das 8 mais registradas (uma falhou antes) e as 3 ameaçadas.
  assert.equal(nomes.length, 10);
});

test("panorama do iNaturalist traz observações, espécies, pessoas e as mais observadas", async () => {
  const resumo = await carregarInaturalist(buscarFixture(), { base: FIXTURE_INATURALIST_BASE, agoraMs: AGORA });
  assert.deepEqual(resumo, {
    fonte: "iNaturalist",
    consultadoEm: "2026-11-25T20:40:00.000Z",
    observacoes: 175,
    especies: 87,
    observadores: 21,
    maisObservadas: [
      { id: 29104, nomeCientifico: "Philodryas nattereri", nomePopular: "Cobra-cipó", grupo: "repteis", observacoes: 4 },
      { id: 14, nomeCientifico: "Cariama cristata", nomePopular: "Seriema", grupo: "aves", observacoes: 3 },
      { id: 1080463, nomeCientifico: "Garcinia gardneriana", nomePopular: "Bacupari", grupo: "plantas", observacoes: 3 },
      { id: 68062, nomeCientifico: "Menemerus bivittatus", nomePopular: null, grupo: "aracnideos", observacoes: 2 },
      { id: 468742, nomeCientifico: "Tityus serrulatus", nomePopular: "Escorpião-amarelo", grupo: "aracnideos", observacoes: 2 },
    ],
  });
});

test("iNaturalist falha inteiro se uma das três consultas falhar ou se os totais não fecharem", async () => {
  for (const trecho of ["species_counts", "/observations?", "observers"]) {
    await assert.rejects(
      carregarInaturalist(buscarFixture((url) => url.includes(trecho)), { base: FIXTURE_INATURALIST_BASE }),
      Error,
      trecho,
    );
  }
  const fixture = buscarFixture();
  const poucasObservacoes = async (url: string) => {
    const corpo = (await fixture(url)) as Record<string, unknown>;
    return url.includes("/observations?") ? { ...corpo, total_results: 10 } : corpo;
  };
  await assert.rejects(carregarInaturalist(poucasObservacoes, { base: FIXTURE_INATURALIST_BASE }), /inconsistentes/);
});

test("busca do GBIF recusa resposta fora do contrato", () => {
  assert.throws(() => lerBuscaGbif(null));
  assert.throws(() => lerBuscaGbif([]));
  assert.throws(() => lerBuscaGbif({ count: -1 }));
  assert.throws(() => lerBuscaGbif({ count: 1.5 }));
  assert.throws(() => lerBuscaGbif({ count: "10" }));
  assert.throws(() => lerBuscaGbif({ count: 2, facets: [{ field: "SPECIES_KEY", counts: [{ name: "1", count: 0 }] }] }));
  assert.throws(() =>
    lerBuscaGbif({ count: 2, facets: [{ field: "SPECIES_KEY", counts: [{ name: "1", count: 1 }, { name: "1", count: 1 }] }] }),
  );
  assert.throws(() => lerBuscaGbif({ count: 2, facets: [{ field: "YEAR", counts: [] }, { field: "YEAR", counts: [] }] }));
  assert.doesNotThrow(() => lerBuscaGbif({ count: 0, results: [] }));
});

test("visão geral recusa faceta truncada, ano impossível, chave inválida e tipos de registro que não fecham", () => {
  const base = corpoFixture(urlGbifVisaoGeral(FIXTURE_GBIF_BASE));
  const trocar = (campo: string, counts: unknown) => ({
    ...base,
    facets: (base.facets as Array<{ field: string }>).map((item) => (item.field === campo ? { field: campo, counts } : item)),
  });
  assert.doesNotThrow(() => lerVisaoGeralGbif(base, AGORA));
  const muitas = Array.from({ length: GBIF_LIMITE_FACETA }, (_, indice) => ({ name: String(indice + 1), count: 1 }));
  assert.throws(() => lerVisaoGeralGbif(trocar("SPECIES_KEY", muitas), AGORA), /truncada/);
  assert.throws(() => lerVisaoGeralGbif(trocar("SPECIES_KEY", [{ name: "abc", count: 1 }]), AGORA));
  assert.throws(() => lerVisaoGeralGbif(trocar("SPECIES_KEY", [{ name: "1", count: 5000 }]), AGORA));
  assert.throws(() => lerVisaoGeralGbif(trocar("YEAR", [{ name: "2030", count: 1 }]), AGORA));
  assert.throws(() => lerVisaoGeralGbif(trocar("DATASET_KEY", [{ name: "nao-e-uuid", count: 1 }]), AGORA));
  assert.throws(() => lerVisaoGeralGbif(trocar("BASIS_OF_RECORD", [{ name: "HUMAN_OBSERVATION", count: 1 }]), AGORA), /inconsistentes/);
  const semFaceta = { ...base, facets: (base.facets as Array<{ field: string }>).filter((item) => item.field !== "YEAR") };
  assert.throws(() => lerVisaoGeralGbif(semFaceta, AGORA), /ausente/);
});

test("grupos saem por diferença e recusam contagens que não cabem no total", () => {
  const zero = { especies: 0, registros: 0 };
  const porGrupo = { aves: { especies: 5, registros: 9 }, plantas: zero, anfibios: zero, insetos: zero, aracnideos: zero, repteis: zero, mamiferos: zero, fungos: zero };
  assert.deepEqual(montarGruposGbif({ especies: 5, registros: 9 }, porGrupo, { especies: 5, registros: 9 }), [
    { id: "aves", nome: "Aves", especies: 5, registros: 9 },
  ]);
  // Mais aves que cordados, ou grupos somando mais que o total: dado incoerente, não publicar.
  assert.throws(() => montarGruposGbif({ especies: 10, registros: 20 }, porGrupo, { especies: 4, registros: 9 }), /cordados/);
  assert.throws(() => montarGruposGbif({ especies: 4, registros: 9 }, porGrupo, { especies: 5, registros: 9 }), /soma/);
});

test("classificação do GBIF vira grupo, inclusive peixes sem classe e répteis da taxonomia nova", () => {
  assert.equal(grupoDaClassificacaoGbif({ kingdomKey: 1, phylumKey: 44, classKey: 212 }), "aves");
  assert.equal(grupoDaClassificacaoGbif({ kingdomKey: 1, phylumKey: 44, classKey: 11592253 }), "repteis");
  assert.equal(grupoDaClassificacaoGbif({ kingdomKey: 1, phylumKey: 44 }), "peixes");
  assert.equal(grupoDaClassificacaoGbif({ kingdomKey: 6, phylumKey: 7707728, classKey: 220 }), "plantas");
  assert.equal(grupoDaClassificacaoGbif({ kingdomKey: 1, phylumKey: 52 }), "outros");
  assert.equal(grupoDaClassificacaoGbif({ kingdomKey: 4 }), "outros");
});

test("detalhe de espécie do GBIF confere chave, nível e nome", () => {
  const especie = { key: 10, rank: "SPECIES", canonicalName: "Ara ararauna", kingdomKey: 1, phylumKey: 44, classKey: 212 };
  assert.deepEqual(lerEspecieGbif(especie, 10), { chave: 10, nomeCientifico: "Ara ararauna", grupo: "aves" });
  assert.throws(() => lerEspecieGbif(especie, 11));
  assert.throws(() => lerEspecieGbif({ ...especie, rank: "GENUS" }, 10));
  assert.throws(() => lerEspecieGbif({ ...especie, canonicalName: "<b>Ara</b>" }, 10));
  assert.throws(() => lerEspecieGbif({ ...especie, classKey: -1 }, 10));
});

test("ameaçadas: agrupa por espécie, ordena pela gravidade e sinaliza lista parcial", () => {
  const ocorrencia = (speciesKey: number, species: string, iucnRedListCategory: string) => ({ speciesKey, species, iucnRedListCategory, kingdomKey: 1, phylumKey: 44, classKey: 212 });
  const { especies, parcial } = lerAmeacadasGbif({
    count: 5,
    results: [ocorrencia(1, "B nt", "NT"), ocorrencia(2, "A en", "EN"), ocorrencia(1, "B nt", "NT"), { iucnRedListCategory: "VU" }],
  });
  assert.deepEqual(especies.map((especie) => [especie.chave, especie.categoria, especie.registros]), [[2, "EN", 1], [1, "NT", 2]]);
  assert.equal(parcial, true);
  assert.throws(() => lerAmeacadasGbif({ count: 1, results: [ocorrencia(1, "X", "LC")] }), /fora do filtro/);
  assert.throws(() => lerAmeacadasGbif({ count: 2, results: [ocorrencia(1, "X", "NT"), ocorrencia(1, "X", "VU")] }), /duas categorias/);
});

test("nome popular: prefere o catálogo brasileiro, só português, sem texto estranho", () => {
  const nomes = (lista: Array<[string, string, string?]>) => ({ results: lista.map(([vernacularName, language, source]) => ({ vernacularName, language, source })) });
  assert.equal(escolherNomePopularGbif(nomes([["Blue-and-yellow Macaw", "eng"], ["Arara", "por", "Catalogue of Life"], ["arara-canindé", "por", "Catálogo Taxonômico da Fauna do Brasil"]])), "Arara-canindé");
  assert.equal(escolherNomePopularGbif(nomes([["Arara", "por", "Catalogue of Life"], ["Arara-azul", "por", "ITIS"]])), "Arara");
  assert.equal(escolherNomePopularGbif(nomes([["Macaw", "eng"]])), null);
  assert.equal(escolherNomePopularGbif(nomes([["<script>", "por"], ["Ara ararauna", "por"]]), "Ara ararauna"), null);
  assert.throws(() => escolherNomePopularGbif({}));
  assert.equal(normalizarNomePopular("  bem-te-vi   rajado "), "Bem-te-vi rajado");
  assert.equal(normalizarNomePopular("x".repeat(81)), null);
  assert.equal(normalizarNomePopular(42), null);
});

test("texto de terceiros perde o travessão", () => {
  assert.equal(limparTexto("EOD \u2013 eBird"), "EOD: eBird");
  assert.equal(limparTexto("Coleção \u2014 Herbário"), "Coleção: Herbário");
  assert.equal(limparTexto("1985\u20132024"), "1985-2024");
  assert.doesNotMatch(limparTexto("a \u2013 b \u2014 c"), /[\u2013\u2014]/);
});

test("iNaturalist recusa resposta fora do contrato", () => {
  const corpo = corpoFixture(urlInaturalistEspecies(FIXTURE_INATURALIST_BASE));
  const resultados = corpo.results as Array<{ count: number; taxon: Record<string, unknown> }>;
  assert.doesNotThrow(() => lerEspeciesInaturalist(corpo));
  assert.throws(() => lerEspeciesInaturalist({ ...corpo, total_results: 2 }), /maior que o total/);
  assert.throws(() => lerEspeciesInaturalist({ ...corpo, results: [...resultados, resultados[0]] }));
  assert.throws(() => lerEspeciesInaturalist({ ...corpo, results: [...resultados].reverse() }), /fora de ordem/);
  assert.throws(() =>
    lerEspeciesInaturalist({ ...corpo, results: [{ ...resultados[0], taxon: { ...resultados[0].taxon, rank: "genus" } }] }),
  );
  assert.throws(() => lerEspeciesInaturalist({ ...corpo, results: [{ ...resultados[0], count: 0 }] }));
  // Grupo icônico desconhecido não quebra: vai para "outros", mesmo com nome de propriedade do objeto.
  const estranho = lerEspeciesInaturalist({ ...corpo, results: [{ ...resultados[0], taxon: { ...resultados[0].taxon, iconic_taxon_name: "constructor" } }] });
  assert.equal(estranho.maisObservadas[0].grupo, "outros");
  assert.equal(lerTotalInaturalist({ total_results: 3, results: [] }), 3);
  assert.throws(() => lerTotalInaturalist({ total_results: 3, results: [{ user: "pessoa" }] }));
  assert.throws(() => lerTotalInaturalist({ total_results: -3 }));
});

test("limitador nunca passa do máximo de tarefas simultâneas", async () => {
  const limitar = criarLimitador(2);
  let ativas = 0;
  let pico = 0;
  const resultados = await Promise.all(
    Array.from({ length: 7 }, (_, indice) =>
      limitar(async () => {
        ativas += 1;
        pico = Math.max(pico, ativas);
        await new Promise((resolve) => setTimeout(resolve, 2));
        ativas -= 1;
        if (indice === 3) throw new Error("falha");
        return indice;
      }).catch(() => -1),
    ),
  );
  assert.equal(pico, 2);
  assert.deepEqual(resultados, [0, 1, 2, -1, 4, 5, 6]);
});
