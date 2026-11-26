// Respostas sintéticas do GBIF e do iNaturalist para a seção de biodiversidade de /meio-ambiente.
// Servem aos testes de unidade (fetch injetado) e ao servidor de e2e (prefixo /__fixtures/).
// Os números são inventados, diferentes dos reais, para o teste provar que não usou a rede.
// Cada rota confere os filtros pedidos: um recorte errado responde 400.

const GADM = "BRA.9.183_2";
const LUGAR = "21162";

const dataset = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** Grupos consultados por taxonKey: espécies e registros. */
const GRUPOS = [
  { chaves: ["212"], especies: 150, registros: 600 },
  { chaves: ["6"], especies: 90, registros: 250 },
  { chaves: ["131"], especies: 20, registros: 120 },
  { chaves: ["216"], especies: 15, registros: 30 },
  { chaves: ["367"], especies: 8, registros: 36 },
  { chaves: ["11592253", "11418114", "11493978", "358"], especies: 4, registros: 6 },
  { chaves: ["359"], especies: 3, registros: 5 },
  { chaves: ["5"], especies: 1, registros: 1 },
  // Filo Chordata: 33 espécies e 30 registros sobram para os peixes.
  { chaves: ["44"], especies: 210, registros: 761 },
];

const TOTAL_REGISTROS = 1234;
const TOTAL_ESPECIES = 330;

const ESPECIES = {
  2428549: { nome: "Dendropsophus minutus", registros: 20, classe: { kingdomKey: 1, phylumKey: 44, classKey: 131 }, nomes: [["Lesser Treefrog", "eng", "Catalogue of Life"], ["Perereca-pequena", "por", "Catalogue of Life"]] },
  5217879: { nome: "Scinax fuscomarginatus", registros: 18, classe: { kingdomKey: 1, phylumKey: 44, classKey: 131 }, nomes: [["Brown-bordered Snouted Treefrog", "eng", "Catalogue of Life"]] },
  2481942: { nome: "Coragyps atratus", registros: 11, classe: { kingdomKey: 1, phylumKey: 44, classKey: 212 }, nomes: [["Urubu-de-cabeça-preta", "por", "Catalogue of Life"], ["urubu", "por", "Catálogo Taxonômico da Fauna do Brasil"]] },
  5959231: { nome: "Ara ararauna", registros: 11, classe: { kingdomKey: 1, phylumKey: 44, classKey: 212 }, nomes: [["arara-canindé", "por", "Catálogo Taxonômico da Fauna do Brasil"]] },
  2480989: { nome: "Caracara plancus", registros: 10, classe: { kingdomKey: 1, phylumKey: 44, classKey: 212 }, nomes: [["carcará", "por", "Catálogo Taxonômico da Fauna do Brasil"]] },
  // A consulta desta espécie falha: ela sai da lista, sem derrubar o resto.
  2482755: { nome: "Falha simulada", registros: 10, falha: true },
  2353648: { nome: "Aphyocharax rathbuni", registros: 9, classe: { kingdomKey: 1, phylumKey: 44 }, nomes: [] },
  5285637: { nome: "Qualea grandiflora", registros: 9, classe: { kingdomKey: 6, phylumKey: 7707728, classKey: 220 }, nomes: [["pau-terra", "por", "Flora e Funga do Brasil"]] },
  2479662: { nome: "Amazona aestiva", registros: 4, classe: { kingdomKey: 1, phylumKey: 44, classKey: 212 }, nomes: [["Curau", "por", "Catalogue of Life"], ["papagaio-verdadeiro", "por", "Catálogo Taxonômico da Fauna do Brasil"]] },
  2482174: { nome: "Crax fasciolata", registros: 2, classe: { kingdomKey: 1, phylumKey: 44, classKey: 212 }, nomes: [["mutum-de-penacho", "por", "Catálogo Taxonômico da Fauna do Brasil"], ["mutum-do-cerrado", "por", "Catalogue of Life"]] },
  7785578: { nome: "Sapajus libidinosus", registros: 2, classe: { kingdomKey: 1, phylumKey: 44, classKey: 359 }, nomes: [["Macaco-prego-amarelo", "por", "Catalogue of Life"], ["Macaco-prego", "por", "The IUCN Red List of Threatened Species"]] },
};

const CONJUNTOS = [
  { chave: dataset(1), registros: 600, titulo: "EOD \u2013 eBird Observation Dataset" },
  { chave: dataset(2), registros: 300, titulo: "ICMBio | Dados de ocorrência de espécies do Sistema de Autorização e Informações de Biodiversidade (SISBio) do ICMBio" },
  { chave: dataset(3), registros: 150, titulo: "iNaturalist Research-grade Observations" },
  // Título indisponível: o conjunto sai da lista de créditos, mas continua na contagem.
  { chave: dataset(4), registros: 80, titulo: null },
  { chave: dataset(5), registros: 40, titulo: "RB - Coleção do Herbário do Jardim Botânico do Rio de Janeiro" },
  ...[15, 12, 10, 9, 8, 6, 4].map((registros, indice) => ({ chave: dataset(6 + indice), registros, titulo: `Conjunto ${6 + indice}` })),
];

const OCORRENCIAS_AMEACADAS = [
  ...Array.from({ length: 4 }, () => ({ chave: 2479662, categoria: "NT" })),
  ...Array.from({ length: 2 }, () => ({ chave: 2482174, categoria: "VU" })),
  ...Array.from({ length: 2 }, () => ({ chave: 7785578, categoria: "NT" })),
];

const INATURALIST_ESPECIES = [
  { count: 4, taxon: { id: 29104, rank: "species", name: "Philodryas nattereri", preferred_common_name: "cobra-cipó", iconic_taxon_name: "Reptilia" } },
  { count: 3, taxon: { id: 14, rank: "species", name: "Cariama cristata", preferred_common_name: "Seriema", iconic_taxon_name: "Aves" } },
  { count: 3, taxon: { id: 1080463, rank: "species", name: "Garcinia gardneriana", preferred_common_name: "Bacupari", iconic_taxon_name: "Plantae" } },
  { count: 2, taxon: { id: 68062, rank: "species", name: "Menemerus bivittatus", iconic_taxon_name: "Arachnida" } },
  { count: 2, taxon: { id: 468742, rank: "species", name: "Tityus serrulatus", preferred_common_name: "Escorpião-amarelo", iconic_taxon_name: "Arachnida" } },
];

function faceta(field, counts) {
  return { field, counts: counts.map(([name, count]) => ({ name: String(name), count })) };
}

function filtrosGbifCorretos(params) {
  const licencas = params.getAll("license").sort().join(",");
  return params.get("gadmGid") === GADM && params.get("occurrenceStatus") === "PRESENT" && licencas === "CC0_1_0,CC_BY_4_0";
}

function facetaEspecies(quantidade, comNomeadas = false) {
  // Na visão geral, as espécies nomeadas vêm primeiro; o resto completa a contagem com um
  // registro cada. Nos grupos, só o tamanho da faceta importa.
  const nomeadas = comNomeadas ? Object.entries(ESPECIES).map(([chave, especie]) => [chave, especie.registros]) : [];
  const restantes = Array.from({ length: quantidade - nomeadas.length }, (_, indice) => [9_000_001 + indice, 1]);
  return faceta("SPECIES_KEY", [...nomeadas, ...restantes]);
}

function respostaGbif(caminho, params) {
  if (caminho === "/occurrence/search") {
    if (!filtrosGbifCorretos(params)) return { status: 400, body: { error: "recorte inesperado" } };
    const categorias = params.getAll("iucnRedListCategory").sort().join(",");
    if (categorias) {
      if (categorias !== "CR,EN,NT,VU" || params.get("limit") !== "300") return { status: 400, body: { error: "filtro de ameaça inesperado" } };
      const results = OCORRENCIAS_AMEACADAS.map(({ chave, categoria }) => ({
        speciesKey: chave,
        species: ESPECIES[chave].nome,
        iucnRedListCategory: categoria,
        ...ESPECIES[chave].classe,
      }));
      return { status: 200, body: { offset: 0, limit: 300, endOfRecords: true, count: results.length, results } };
    }
    if (params.get("limit") !== "0" || params.get("facetLimit") !== "3000") return { status: 400, body: { error: "paginação inesperada" } };
    const taxonKeys = params.getAll("taxonKey").join(",");
    if (taxonKeys) {
      const grupo = GRUPOS.find((item) => item.chaves.join(",") === taxonKeys);
      if (!grupo || params.getAll("facet").join(",") !== "speciesKey") return { status: 400, body: { error: "grupo inesperado" } };
      return { status: 200, body: { offset: 0, limit: 0, count: grupo.registros, results: [], facets: [facetaEspecies(grupo.especies)] } };
    }
    if (params.getAll("facet").sort().join(",") !== "basisOfRecord,datasetKey,speciesKey,year") return { status: 400, body: { error: "facetas inesperadas" } };
    return {
      status: 200,
      body: {
        offset: 0,
        limit: 0,
        endOfRecords: false,
        count: TOTAL_REGISTROS,
        results: [],
        facets: [
          facetaEspecies(TOTAL_ESPECIES, true),
          faceta("DATASET_KEY", CONJUNTOS.map((conjunto) => [conjunto.chave, conjunto.registros])),
          faceta("YEAR", [[2024, 500], [2023, 400], [2010, 100], [2026, 20], [1950, 3]]),
          faceta("BASIS_OF_RECORD", [["HUMAN_OBSERVATION", 900], ["PRESERVED_SPECIMEN", 300], ["OCCURRENCE", 30], ["MACHINE_OBSERVATION", 4]]),
        ],
      },
    };
  }
  const nomes = caminho.match(/^\/species\/(\d+)\/vernacularNames$/);
  if (nomes) {
    const especie = ESPECIES[nomes[1]];
    if (!especie || especie.falha) return { status: 404, body: {} };
    return { status: 200, body: { offset: 0, limit: 100, endOfRecords: true, results: especie.nomes.map(([vernacularName, language, source]) => ({ vernacularName, language, source })) } };
  }
  const detalhe = caminho.match(/^\/species\/(\d+)$/);
  if (detalhe) {
    const especie = ESPECIES[detalhe[1]];
    if (!especie) return { status: 404, body: {} };
    if (especie.falha) return { status: 503, body: { error: "indisponível" } };
    return { status: 200, body: { key: Number(detalhe[1]), rank: "SPECIES", canonicalName: especie.nome, scientificName: `${especie.nome} (Autor, 1900)`, ...especie.classe } };
  }
  const conjunto = caminho.match(/^\/dataset\/([0-9a-f-]+)$/);
  if (conjunto) {
    const item = CONJUNTOS.find((candidato) => candidato.chave === conjunto[1]);
    if (!item || !item.titulo) return { status: 404, body: {} };
    return { status: 200, body: { key: item.chave, title: item.titulo, license: "http://creativecommons.org/licenses/by/4.0/legalcode" } };
  }
  return { status: 404, body: {} };
}

function respostaInaturalist(caminho, params) {
  if (params.get("place_id") !== LUGAR || params.get("verifiable") !== "true") return { status: 400, body: { error: "lugar inesperado" } };
  if (caminho === "/observations/species_counts") {
    if (params.get("rank") !== "species" || params.get("locale") !== "pt-BR" || params.get("per_page") !== "5") {
      return { status: 400, body: { error: "parâmetros inesperados" } };
    }
    return { status: 200, body: { total_results: 87, page: 1, per_page: 5, results: INATURALIST_ESPECIES } };
  }
  if (params.get("per_page") !== "0") return { status: 400, body: { error: "paginação inesperada" } };
  if (caminho === "/observations") return { status: 200, body: { total_results: 175, page: 1, per_page: 0, results: [] } };
  if (caminho === "/observations/observers") return { status: 200, body: { total_results: 21, page: 1, per_page: 0, results: [] } };
  return { status: 404, body: {} };
}

/**
 * Resposta para uma URL de fixture, ou null se a URL não for deste módulo.
 * @param {URL} url
 * @returns {{ status: number, body: unknown } | null}
 */
export function respostaFixtureBiodiversidade(url) {
  const gbif = url.pathname.match(/^\/__fixtures\/gbif\/v1(\/.*)$/);
  if (gbif) return respostaGbif(gbif[1], url.searchParams);
  const inaturalist = url.pathname.match(/^\/__fixtures\/inaturalist\/v1(\/.*)$/);
  if (inaturalist) return respostaInaturalist(inaturalist[1], url.searchParams);
  return null;
}

export const FIXTURE_GBIF_BASE = "http://127.0.0.1:4319/__fixtures/gbif/v1";
export const FIXTURE_INATURALIST_BASE = "http://127.0.0.1:4319/__fixtures/inaturalist/v1";

/**
 * Fetch falso que responde com as fixtures, para os testes de unidade (sem rede).
 * @param {(url: string) => boolean} [falhar] URLs que devem falhar com erro de rede.
 * @returns {(url: string) => Promise<unknown>}
 */
export function buscarFixture(falhar = () => false) {
  return async (url) => {
    if (falhar(url)) throw new Error("falha de rede simulada");
    const resposta = respostaFixtureBiodiversidade(new URL(url));
    if (!resposta) throw new Error(`fixture inexistente: ${url}`);
    if (resposta.status !== 200) throw new Error(`HTTP ${resposta.status}`);
    // Ida e volta em JSON, como numa resposta real.
    return JSON.parse(JSON.stringify(resposta.body));
  };
}
