/**
 * Biodiversidade registrada em Piracanjuba-GO, a partir do GBIF e do iNaturalist.
 *
 * Funções puras: montam as URLs, validam cada resposta antes de usar e agregam os números.
 * A busca de rede, o tempo limite e o cache ficam em `src/lib/data/biodiversidade.ts`.
 *
 * Recorte geográfico, conferido em 2026-11-25:
 * - GBIF: região GADM `BRA.9.183_2` (Piracanjuba, Goiás, Brasil, nível de município),
 *   atribuída pelo próprio GBIF a partir das coordenadas de cada registro.
 * - iNaturalist: lugar `21162` ("Piracanjuba, GO, BR", admin_level 20, dentro de Goiás 12592
 *   e Brasil 6878). O retângulo do polígono coincide com o da malha do IBGE do município
 *   5217104 (longitude -49,302 a -48,697; latitude -17,600 a -17,02).
 * O limite do município é mais fiel que um círculo ou uma caixa em volta da cidade.
 */

export const GBIF_API_URL = "https://api.gbif.org/v1";
export const INATURALIST_API_URL = "https://api.inaturalist.org/v1";
export const GBIF_GADM_PIRACANJUBA = "BRA.9.183_2";
export const INATURALIST_LUGAR_PIRACANJUBA = 21162;
/** O site exibe anúncios: do GBIF entram só registros com licença que permite uso comercial. */
export const GBIF_LICENCAS = ["CC0_1_0", "CC_BY_4_0"] as const;
export const BIODIVERSIDADE_REVALIDATE_SECONDS = 86_400;

/** Acima disso a faceta pode vir truncada; preferimos não publicar um total errado. */
export const GBIF_LIMITE_FACETA = 3000;
export const GBIF_LIMITE_AMEACADAS = 300;
export const TOP_ESPECIES_GBIF = 8;
export const TOP_CONJUNTOS_GBIF = 5;
export const TOP_ESPECIES_INATURALIST = 5;

export type GrupoId =
  | "aves"
  | "plantas"
  | "peixes"
  | "anfibios"
  | "insetos"
  | "aracnideos"
  | "repteis"
  | "mamiferos"
  | "fungos"
  | "outros";

export const NOMES_GRUPOS: Record<GrupoId, string> = {
  aves: "Aves",
  plantas: "Plantas",
  peixes: "Peixes",
  anfibios: "Anfíbios",
  insetos: "Insetos",
  aracnideos: "Aracnídeos",
  repteis: "Répteis",
  mamiferos: "Mamíferos",
  fungos: "Fungos",
  outros: "Outros grupos",
};

type GrupoConsultado = Exclude<GrupoId, "peixes" | "outros">;

/**
 * Chaves da taxonomia do GBIF (conferidas em 2026-11-25). O filtro `taxonKey` inclui todos os
 * descendentes. Répteis levam as três classes da taxonomia atual e a classe antiga Reptilia.
 */
export const GRUPOS_GBIF: ReadonlyArray<{ id: GrupoConsultado; taxonKeys: readonly number[] }> = [
  { id: "aves", taxonKeys: [212] },
  { id: "plantas", taxonKeys: [6] },
  { id: "anfibios", taxonKeys: [131] },
  { id: "insetos", taxonKeys: [216] },
  { id: "aracnideos", taxonKeys: [367] },
  { id: "repteis", taxonKeys: [11592253, 11418114, 11493978, 358] },
  { id: "mamiferos", taxonKeys: [359] },
  { id: "fungos", taxonKeys: [5] },
];

/**
 * Filo Chordata. Na taxonomia atual do GBIF as ordens de peixes ficam direto no filo, sem
 * classe, então "Peixes" é a diferença entre os cordados e as quatro classes de vertebrados.
 */
export const GBIF_CORDADOS = 44;
const VERTEBRADOS_COM_CLASSE: readonly GrupoConsultado[] = ["aves", "anfibios", "repteis", "mamiferos"];

export type CategoriaAmeaca = "CR" | "EN" | "VU" | "NT";
export const CATEGORIAS_AMEACA: readonly CategoriaAmeaca[] = ["CR", "EN", "VU", "NT"];
export const NOMES_CATEGORIAS: Record<CategoriaAmeaca, string> = {
  CR: "Criticamente em perigo",
  EN: "Em perigo",
  VU: "Vulnerável",
  NT: "Quase ameaçada",
};

export type GrupoContagem = { id: GrupoId; nome: string; especies: number; registros: number };

export type EspecieRegistrada = {
  chave: number;
  nomeCientifico: string;
  nomePopular: string | null;
  grupo: GrupoId;
  registros: number;
};

export type EspecieAmeacada = EspecieRegistrada & { categoria: CategoriaAmeaca };

export type ConjuntoDeDados = { chave: string; titulo: string; registros: number };

export type ResumoGbif = {
  fonte: "GBIF";
  consultadoEm: string;
  registros: number;
  especies: number;
  conjuntosDeDados: number;
  anoInicial: number | null;
  anoFinal: number | null;
  observacoesCampo: number;
  exemplaresColecao: number;
  grupos: GrupoContagem[];
  maisRegistradas: EspecieRegistrada[];
  ameacadas: EspecieAmeacada[];
  ameacadasParcial: boolean;
  principaisConjuntos: ConjuntoDeDados[];
};

export type EspecieObservada = {
  id: number;
  nomeCientifico: string;
  nomePopular: string | null;
  grupo: GrupoId;
  observacoes: number;
};

export type ResumoInaturalist = {
  fonte: "iNaturalist";
  consultadoEm: string;
  observacoes: number;
  especies: number;
  observadores: number;
  maisObservadas: EspecieObservada[];
};

export type Biodiversidade = { gbif: ResumoGbif | null; inaturalist: ResumoInaturalist | null };

export type BuscarJson = (url: string) => Promise<unknown>;

// ---------------------------------------------------------------------------
// Validação

function objeto(valor: unknown, contexto: string): Record<string, unknown> {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    throw new Error(`${contexto}: resposta inválida.`);
  }
  return valor as Record<string, unknown>;
}

function lista(valor: unknown, contexto: string, maximo: number): unknown[] {
  if (!Array.isArray(valor) || valor.length > maximo) throw new Error(`${contexto}: lista inválida.`);
  return valor;
}

function inteiro(valor: unknown, contexto: string, minimo = 0): number {
  if (typeof valor !== "number" || !Number.isSafeInteger(valor) || valor < minimo) {
    throw new Error(`${contexto}: número inválido.`);
  }
  return valor;
}

function chaveOpcional(valor: unknown, contexto: string): number | undefined {
  if (valor === undefined || valor === null) return undefined;
  return inteiro(valor, contexto, 1);
}

// Sem caracteres de controle nem marcação: o texto vai para a página como está.
function textoProibido(valor: string): boolean {
  for (const caractere of valor) {
    const codigo = caractere.codePointAt(0) ?? 0;
    if (codigo < 0x20 || codigo === 0x7f || caractere === "<" || caractere === ">") return true;
  }
  return false;
}

/**
 * Espaços normalizados e sem travessão: o site não usa travessão nem em textos de terceiros
 * (título de conjunto de dados, nome popular). Travessão entre espaços vira dois-pontos.
 */
export function limparTexto(valor: string): string {
  return valor
    .replace(/\s+/g, " ")
    .replace(/ ?[\u2013\u2014] ?/g, (trecho) => (trecho.length > 1 ? ": " : "-"))
    .trim();
}

function texto(valor: unknown, contexto: string, maximo = 300): string {
  if (typeof valor !== "string") throw new Error(`${contexto}: texto inválido.`);
  const limpo = limparTexto(valor);
  if (!limpo || limpo.length > maximo || textoProibido(limpo)) {
    throw new Error(`${contexto}: texto inválido.`);
  }
  return limpo;
}

/** Nome popular com a inicial maiúscula, como no resto do site; nulo se vier vazio ou estranho. */
export function normalizarNomePopular(valor: unknown, nomeCientifico?: string): string | null {
  if (typeof valor !== "string") return null;
  const limpo = limparTexto(valor);
  if (!limpo || limpo.length > 80 || textoProibido(limpo)) return null;
  if (nomeCientifico && limpo.toLowerCase() === nomeCientifico.toLowerCase()) return null;
  return limpo.charAt(0).toLocaleUpperCase("pt-BR") + limpo.slice(1);
}

// ---------------------------------------------------------------------------
// URLs

type Parametro = readonly [string, string | number];

function montarUrl(base: string, caminho: string, parametros: readonly Parametro[]): string {
  const busca = new URLSearchParams();
  for (const [nome, valor] of parametros) busca.append(nome, String(valor));
  const consulta = busca.toString();
  return `${base.replace(/\/+$/, "")}${caminho}${consulta ? `?${consulta}` : ""}`;
}

function filtrosGbif(): Parametro[] {
  return [
    ["gadmGid", GBIF_GADM_PIRACANJUBA],
    ["occurrenceStatus", "PRESENT"],
    ...GBIF_LICENCAS.map((licenca): Parametro => ["license", licenca]),
  ];
}

export function urlGbifVisaoGeral(base = GBIF_API_URL): string {
  return montarUrl(base, "/occurrence/search", [
    ...filtrosGbif(),
    ["limit", 0],
    ["facet", "speciesKey"],
    ["facet", "datasetKey"],
    ["facet", "year"],
    ["facet", "basisOfRecord"],
    ["facetLimit", GBIF_LIMITE_FACETA],
  ]);
}

export function urlGbifGrupo(taxonKeys: readonly number[], base = GBIF_API_URL): string {
  return montarUrl(base, "/occurrence/search", [
    ...filtrosGbif(),
    ...taxonKeys.map((chave): Parametro => ["taxonKey", chave]),
    ["limit", 0],
    ["facet", "speciesKey"],
    ["facetLimit", GBIF_LIMITE_FACETA],
  ]);
}

export function urlGbifAmeacadas(base = GBIF_API_URL): string {
  return montarUrl(base, "/occurrence/search", [
    ...filtrosGbif(),
    ...CATEGORIAS_AMEACA.map((categoria): Parametro => ["iucnRedListCategory", categoria]),
    ["limit", GBIF_LIMITE_AMEACADAS],
  ]);
}

export function urlGbifEspecie(chave: number, base = GBIF_API_URL): string {
  return montarUrl(base, `/species/${chave}`, []);
}

export function urlGbifNomesPopulares(chave: number, base = GBIF_API_URL): string {
  // Espécies comuns passam de cem nomes em várias línguas; o nome brasileiro pode vir no fim.
  return montarUrl(base, `/species/${chave}/vernacularNames`, [["limit", 1000]]);
}

export function urlGbifConjunto(chave: string, base = GBIF_API_URL): string {
  return montarUrl(base, `/dataset/${encodeURIComponent(chave)}`, []);
}

function filtrosInaturalist(): Parametro[] {
  return [
    ["place_id", INATURALIST_LUGAR_PIRACANJUBA],
    ["verifiable", "true"],
  ];
}

export function urlInaturalistEspecies(base = INATURALIST_API_URL): string {
  return montarUrl(base, "/observations/species_counts", [
    ...filtrosInaturalist(),
    ["rank", "species"],
    ["locale", "pt-BR"],
    ["per_page", TOP_ESPECIES_INATURALIST],
  ]);
}

export function urlInaturalistObservacoes(base = INATURALIST_API_URL): string {
  return montarUrl(base, "/observations", [...filtrosInaturalist(), ["per_page", 0]]);
}

export function urlInaturalistObservadores(base = INATURALIST_API_URL): string {
  return montarUrl(base, "/observations/observers", [...filtrosInaturalist(), ["per_page", 0]]);
}

/** Páginas públicas com o mesmo recorte dos números exibidos. */
export const LINK_GBIF_REGISTROS = montarUrl("https://www.gbif.org", "/occurrence/search", filtrosGbif());
export const LINK_INATURALIST_ESPECIES = montarUrl("https://www.inaturalist.org", "/observations", [
  ...filtrosInaturalist(),
  ["view", "species"],
]);
export const linkGbifEspecie = (chave: number) => `https://www.gbif.org/species/${chave}`;
export const linkGbifConjunto = (chave: string) => `https://www.gbif.org/dataset/${encodeURIComponent(chave)}`;
export const linkInaturalistTaxon = (id: number) => `https://www.inaturalist.org/taxa/${id}`;

// ---------------------------------------------------------------------------
// GBIF

type ItemFaceta = { nome: string; total: number };
type BuscaGbif = { total: number; facetas: Map<string, ItemFaceta[]>; resultados: unknown[] };

export function lerBuscaGbif(valor: unknown): BuscaGbif {
  const resposta = objeto(valor, "GBIF");
  const total = inteiro(resposta.count, "GBIF: total");
  const facetas = new Map<string, ItemFaceta[]>();
  for (const bruto of lista(resposta.facets ?? [], "GBIF: facetas", 20)) {
    const faceta = objeto(bruto, "GBIF: faceta");
    const campo = texto(faceta.field, "GBIF: campo da faceta", 40);
    if (facetas.has(campo)) throw new Error("GBIF: faceta repetida.");
    const vistos = new Set<string>();
    const itens = lista(faceta.counts, "GBIF: itens da faceta", GBIF_LIMITE_FACETA).map((item): ItemFaceta => {
      const registro = objeto(item, "GBIF: item da faceta");
      const nome = texto(registro.name, "GBIF: nome do item", 100);
      if (vistos.has(nome)) throw new Error("GBIF: item de faceta repetido.");
      vistos.add(nome);
      return { nome, total: inteiro(registro.count, "GBIF: contagem do item", 1) };
    });
    facetas.set(campo, itens);
  }
  return { total, facetas, resultados: lista(resposta.results ?? [], "GBIF: resultados", GBIF_LIMITE_AMEACADAS) };
}

function faceta(busca: BuscaGbif, campo: string): ItemFaceta[] {
  const itens = busca.facetas.get(campo);
  if (itens) return itens;
  // Sem registros o GBIF pode omitir a faceta; com registros, a ausência é erro.
  if (busca.total === 0) return [];
  throw new Error(`GBIF: faceta ${campo} ausente.`);
}

function especiesDaFaceta(busca: BuscaGbif): Array<{ chave: number; registros: number }> {
  const itens = faceta(busca, "SPECIES_KEY");
  if (itens.length >= GBIF_LIMITE_FACETA) throw new Error("GBIF: faceta de espécies truncada.");
  return itens.map((item) => {
    if (!/^[1-9]\d{0,9}$/.test(item.nome)) throw new Error("GBIF: chave de espécie inválida.");
    if (item.total > busca.total) throw new Error("GBIF: contagem de espécie inconsistente.");
    return { chave: Number(item.nome), registros: item.total };
  });
}

/** Contagem de espécies (faceta speciesKey) e de registros de um grupo. */
export function lerContagemGbif(valor: unknown): { especies: number; registros: number } {
  const busca = lerBuscaGbif(valor);
  return { especies: especiesDaFaceta(busca).length, registros: busca.total };
}

const BASES_OBSERVACAO = new Set(["HUMAN_OBSERVATION", "MACHINE_OBSERVATION", "OBSERVATION"]);
const BASES_COLECAO = new Set(["PRESERVED_SPECIMEN", "LIVING_SPECIMEN", "MATERIAL_SAMPLE", "FOSSIL_SPECIMEN"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type VisaoGeralGbif = {
  registros: number;
  especies: number;
  topEspecies: Array<{ chave: number; registros: number }>;
  conjuntos: Array<{ chave: string; registros: number }>;
  anoInicial: number | null;
  anoFinal: number | null;
  observacoesCampo: number;
  exemplaresColecao: number;
};

export function lerVisaoGeralGbif(valor: unknown, agoraMs = Date.now()): VisaoGeralGbif {
  const busca = lerBuscaGbif(valor);
  const especies = especiesDaFaceta(busca);
  const topEspecies = [...especies]
    .sort((a, b) => b.registros - a.registros || a.chave - b.chave)
    .slice(0, TOP_ESPECIES_GBIF);

  const conjuntos = faceta(busca, "DATASET_KEY")
    .map((item) => {
      if (!UUID.test(item.nome)) throw new Error("GBIF: chave de conjunto de dados inválida.");
      return { chave: item.nome, registros: item.total };
    })
    .sort((a, b) => b.registros - a.registros || a.chave.localeCompare(b.chave));

  const anoLimite = new Date(agoraMs).getUTCFullYear() + 1;
  const anos = faceta(busca, "YEAR").map((item) => {
    const ano = Number(item.nome);
    if (!/^\d{4}$/.test(item.nome) || ano < 1700 || ano > anoLimite) throw new Error("GBIF: ano inválido.");
    return ano;
  });

  let observacoesCampo = 0;
  let exemplaresColecao = 0;
  let somaBases = 0;
  for (const item of faceta(busca, "BASIS_OF_RECORD")) {
    if (!/^[A-Z_]{3,40}$/.test(item.nome)) throw new Error("GBIF: tipo de registro inválido.");
    somaBases += item.total;
    if (BASES_OBSERVACAO.has(item.nome)) observacoesCampo += item.total;
    else if (BASES_COLECAO.has(item.nome)) exemplaresColecao += item.total;
  }
  // Cada registro tem exatamente um tipo: a soma da faceta é o total.
  if (somaBases !== busca.total) throw new Error("GBIF: tipos de registro inconsistentes.");

  return {
    registros: busca.total,
    especies: especies.length,
    topEspecies,
    conjuntos,
    anoInicial: anos.length ? Math.min(...anos) : null,
    anoFinal: anos.length ? Math.max(...anos) : null,
    observacoesCampo,
    exemplaresColecao,
  };
}

type Contagem = { especies: number; registros: number };

/**
 * Junta as contagens por grupo. Os grupos não se sobrepõem (cada espécie tem uma só
 * classificação), então "Peixes" e "Outros grupos" saem por diferença e nunca podem ser negativos.
 */
export function montarGruposGbif(
  total: Contagem,
  porGrupo: Record<GrupoConsultado, Contagem>,
  cordados: Contagem,
): GrupoContagem[] {
  const diferenca = (base: Contagem, partes: Contagem[], contexto: string): Contagem => {
    const especies = base.especies - partes.reduce((soma, parte) => soma + parte.especies, 0);
    const registros = base.registros - partes.reduce((soma, parte) => soma + parte.registros, 0);
    if (especies < 0 || registros < 0) throw new Error(`GBIF: ${contexto} inconsistente.`);
    return { especies, registros };
  };
  const peixes = diferenca(cordados, VERTEBRADOS_COM_CLASSE.map((id) => porGrupo[id]), "contagem de cordados");
  const consultados = GRUPOS_GBIF.map((grupo) => ({ id: grupo.id as GrupoId, ...porGrupo[grupo.id] }));
  const outros = diferenca(total, [...consultados, peixes], "soma dos grupos");

  const grupos = [...consultados, { id: "peixes" as GrupoId, ...peixes }]
    .filter((grupo) => grupo.especies > 0)
    .sort((a, b) => b.especies - a.especies || b.registros - a.registros || a.id.localeCompare(b.id));
  if (outros.especies > 0) grupos.push({ id: "outros", ...outros });
  return grupos.map((grupo) => ({ ...grupo, nome: NOMES_GRUPOS[grupo.id] }));
}

type Classificacao = { kingdomKey?: number; phylumKey?: number; classKey?: number };

export function grupoDaClassificacaoGbif(classificacao: Classificacao): GrupoId {
  const chaves = [classificacao.kingdomKey, classificacao.phylumKey, classificacao.classKey];
  for (const grupo of GRUPOS_GBIF) {
    if (chaves.some((chave) => chave !== undefined && grupo.taxonKeys.includes(chave))) return grupo.id;
  }
  return classificacao.phylumKey === GBIF_CORDADOS ? "peixes" : "outros";
}

function lerClassificacao(registro: Record<string, unknown>, contexto: string): Classificacao {
  return {
    kingdomKey: chaveOpcional(registro.kingdomKey, `${contexto}: reino`),
    phylumKey: chaveOpcional(registro.phylumKey, `${contexto}: filo`),
    classKey: chaveOpcional(registro.classKey, `${contexto}: classe`),
  };
}

export function lerEspecieGbif(valor: unknown, chaveEsperada: number): { chave: number; nomeCientifico: string; grupo: GrupoId } {
  const especie = objeto(valor, "GBIF: espécie");
  const chave = inteiro(especie.key, "GBIF: chave da espécie", 1);
  if (chave !== chaveEsperada) throw new Error("GBIF: espécie diferente da pedida.");
  if (especie.rank !== "SPECIES") throw new Error("GBIF: táxon fora do nível de espécie.");
  return {
    chave,
    nomeCientifico: texto(especie.canonicalName, "GBIF: nome científico", 120),
    grupo: grupoDaClassificacaoGbif(lerClassificacao(especie, "GBIF: espécie")),
  };
}

// Fontes brasileiras primeiro: os nomes do Catalogue of Life e do ITIS às vezes são de Portugal.
const FONTES_PREFERIDAS = [/Cat[aá]logo Taxon[oô]mico da Fauna do Brasil/i, /Flora e Funga do Brasil|Flora do Brasil/i, /IUCN/i];

/** Nome popular em português entre os nomes do GBIF, ou nulo se não houver. */
export function escolherNomePopularGbif(valor: unknown, nomeCientifico?: string): string | null {
  const resposta = objeto(valor, "GBIF: nomes populares");
  const candidatos: Array<{ nome: string; prioridade: number }> = [];
  for (const bruto of lista(resposta.results, "GBIF: nomes populares", 1000)) {
    const item = objeto(bruto, "GBIF: nome popular");
    if (item.language !== "por" && item.language !== "pt") continue;
    const nome = normalizarNomePopular(item.vernacularName, nomeCientifico);
    if (!nome) continue;
    const fonte = typeof item.source === "string" ? item.source : "";
    const indice = FONTES_PREFERIDAS.findIndex((padrao) => padrao.test(fonte));
    candidatos.push({ nome, prioridade: indice === -1 ? FONTES_PREFERIDAS.length : indice });
  }
  // Estável: em empate de fonte, vale a ordem do GBIF.
  candidatos.sort((a, b) => a.prioridade - b.prioridade);
  return candidatos[0]?.nome ?? null;
}

export function lerConjuntoGbif(valor: unknown, chaveEsperada: string): string {
  const conjunto = objeto(valor, "GBIF: conjunto de dados");
  if (conjunto.key !== chaveEsperada) throw new Error("GBIF: conjunto de dados diferente do pedido.");
  return texto(conjunto.title, "GBIF: título do conjunto de dados", 300);
}

const ORDEM_CATEGORIA: Record<CategoriaAmeaca, number> = { CR: 0, EN: 1, VU: 2, NT: 3 };

export type AmeacadaSemNome = Omit<EspecieAmeacada, "nomePopular">;

/** Espécies em categoria de ameaça (ou quase ameaçadas) a partir das ocorrências filtradas. */
export function lerAmeacadasGbif(valor: unknown): { especies: AmeacadaSemNome[]; parcial: boolean } {
  const busca = lerBuscaGbif(valor);
  const porEspecie = new Map<number, AmeacadaSemNome>();
  for (const bruto of busca.resultados) {
    const registro = objeto(bruto, "GBIF: ocorrência");
    const categoria = registro.iucnRedListCategory;
    if (typeof categoria !== "string" || !CATEGORIAS_AMEACA.includes(categoria as CategoriaAmeaca)) {
      throw new Error("GBIF: categoria de ameaça fora do filtro.");
    }
    // A categoria da IUCN é por espécie; registro sem espécie não entra na lista.
    const chave = chaveOpcional(registro.speciesKey, "GBIF: espécie da ocorrência");
    if (chave === undefined) continue;
    const atual = porEspecie.get(chave);
    if (atual) {
      if (atual.categoria !== categoria) throw new Error("GBIF: espécie com duas categorias.");
      atual.registros += 1;
      continue;
    }
    porEspecie.set(chave, {
      chave,
      nomeCientifico: texto(registro.species, "GBIF: nome da espécie", 120),
      grupo: grupoDaClassificacaoGbif(lerClassificacao(registro, "GBIF: ocorrência")),
      categoria: categoria as CategoriaAmeaca,
      registros: 1,
    });
  }
  const especies = [...porEspecie.values()].sort(
    (a, b) =>
      ORDEM_CATEGORIA[a.categoria] - ORDEM_CATEGORIA[b.categoria]
      || b.registros - a.registros
      || a.nomeCientifico.localeCompare(b.nomeCientifico),
  );
  return { especies, parcial: busca.total > busca.resultados.length };
}

/** Executa no máximo `maximo` tarefas ao mesmo tempo, para não sobrecarregar a fonte. */
export function criarLimitador(maximo: number) {
  let ativos = 0;
  const fila: Array<() => void> = [];
  return async function limitar<T>(tarefa: () => Promise<T>): Promise<T> {
    // Quem espera recebe a vaga direto de quem termina, sem brecha para um terceiro entrar.
    if (ativos >= maximo) await new Promise<void>((resolve) => fila.push(resolve));
    else ativos += 1;
    try {
      return await tarefa();
    } finally {
      const proximo = fila.shift();
      if (proximo) proximo();
      else ativos -= 1;
    }
  };
}

type OpcoesCarga = { base?: string; agoraMs?: number; concorrencia?: number };

/**
 * Carrega o panorama do GBIF. A visão geral, os grupos e as ameaçadas são obrigatórios: se um
 * falhar, o bloco inteiro falha. Nomes de espécies e títulos de conjuntos são complementos:
 * espécie sem nome científico sai da lista, e nome popular ausente vira só o nome científico.
 */
export async function carregarGbif(buscar: BuscarJson, opcoes: OpcoesCarga = {}): Promise<ResumoGbif> {
  const base = opcoes.base ?? GBIF_API_URL;
  const agoraMs = opcoes.agoraMs ?? Date.now();
  const limitar = criarLimitador(opcoes.concorrencia ?? 4);
  const obter = (url: string) => limitar(() => buscar(url));

  const [visao, cordados, ameacadas, ...contagens] = await Promise.all([
    obter(urlGbifVisaoGeral(base)).then((valor) => lerVisaoGeralGbif(valor, agoraMs)),
    obter(urlGbifGrupo([GBIF_CORDADOS], base)).then(lerContagemGbif),
    obter(urlGbifAmeacadas(base)).then(lerAmeacadasGbif),
    ...GRUPOS_GBIF.map((grupo) => obter(urlGbifGrupo(grupo.taxonKeys, base)).then(lerContagemGbif)),
  ]);
  const porGrupo = Object.fromEntries(GRUPOS_GBIF.map((grupo, indice) => [grupo.id, contagens[indice]])) as Record<
    GrupoConsultado,
    Contagem
  >;
  for (const contagem of [cordados, ...contagens]) {
    if (contagem.especies > visao.especies || contagem.registros > visao.registros) {
      throw new Error("GBIF: grupo maior que o total.");
    }
  }
  const grupos = montarGruposGbif(visao, porGrupo, cordados);

  const nomesPopulares = new Map<number, Promise<string | null>>();
  const nomePopular = (chave: number, nomeCientifico: string) => {
    let pendente = nomesPopulares.get(chave);
    if (!pendente) {
      pendente = obter(urlGbifNomesPopulares(chave, base))
        .then((valor) => escolherNomePopularGbif(valor, nomeCientifico))
        .catch(() => null);
      nomesPopulares.set(chave, pendente);
    }
    return pendente;
  };

  const [maisRegistradas, ameacadasComNome, principaisConjuntos] = await Promise.all([
    Promise.all(
      visao.topEspecies.map(async ({ chave, registros }): Promise<EspecieRegistrada | null> => {
        try {
          const especie = lerEspecieGbif(await obter(urlGbifEspecie(chave, base)), chave);
          return { ...especie, registros, nomePopular: await nomePopular(chave, especie.nomeCientifico) };
        } catch {
          return null;
        }
      }),
    ),
    Promise.all(
      ameacadas.especies.map(async (especie): Promise<EspecieAmeacada> => ({
        ...especie,
        nomePopular: await nomePopular(especie.chave, especie.nomeCientifico),
      })),
    ),
    Promise.all(
      visao.conjuntos.slice(0, TOP_CONJUNTOS_GBIF).map(async ({ chave, registros }): Promise<ConjuntoDeDados | null> => {
        try {
          return { chave, registros, titulo: lerConjuntoGbif(await obter(urlGbifConjunto(chave, base)), chave) };
        } catch {
          return null;
        }
      }),
    ),
  ]);

  return {
    fonte: "GBIF",
    consultadoEm: new Date(agoraMs).toISOString(),
    registros: visao.registros,
    especies: visao.especies,
    conjuntosDeDados: visao.conjuntos.length,
    anoInicial: visao.anoInicial,
    anoFinal: visao.anoFinal,
    observacoesCampo: visao.observacoesCampo,
    exemplaresColecao: visao.exemplaresColecao,
    grupos,
    maisRegistradas: maisRegistradas.filter((especie): especie is EspecieRegistrada => especie !== null),
    ameacadas: ameacadasComNome,
    ameacadasParcial: ameacadas.parcial,
    principaisConjuntos: principaisConjuntos.filter((conjunto): conjunto is ConjuntoDeDados => conjunto !== null),
  };
}

// ---------------------------------------------------------------------------
// iNaturalist

const GRUPOS_ICONICOS = new Map<string, GrupoId>([
  ["Aves", "aves"],
  ["Plantae", "plantas"],
  ["Actinopterygii", "peixes"],
  ["Amphibia", "anfibios"],
  ["Insecta", "insetos"],
  ["Arachnida", "aracnideos"],
  ["Reptilia", "repteis"],
  ["Mammalia", "mamiferos"],
  ["Fungi", "fungos"],
]);

export function lerTotalInaturalist(valor: unknown): number {
  const resposta = objeto(valor, "iNaturalist");
  lista(resposta.results ?? [], "iNaturalist: resultados", 0);
  return inteiro(resposta.total_results, "iNaturalist: total");
}

export function lerEspeciesInaturalist(valor: unknown): { especies: number; maisObservadas: EspecieObservada[] } {
  const resposta = objeto(valor, "iNaturalist: espécies");
  const especies = inteiro(resposta.total_results, "iNaturalist: total de espécies");
  const resultados = lista(resposta.results, "iNaturalist: espécies", TOP_ESPECIES_INATURALIST);
  if (resultados.length > especies) throw new Error("iNaturalist: lista maior que o total.");
  const vistos = new Set<number>();
  const maisObservadas = resultados.map((bruto): EspecieObservada => {
    const item = objeto(bruto, "iNaturalist: espécie");
    const taxon = objeto(item.taxon, "iNaturalist: táxon");
    const id = inteiro(taxon.id, "iNaturalist: id do táxon", 1);
    if (vistos.has(id)) throw new Error("iNaturalist: táxon repetido.");
    vistos.add(id);
    if (taxon.rank !== "species") throw new Error("iNaturalist: táxon fora do nível de espécie.");
    const nomeCientifico = texto(taxon.name, "iNaturalist: nome científico", 120);
    const iconico = typeof taxon.iconic_taxon_name === "string" ? taxon.iconic_taxon_name : "";
    return {
      id,
      nomeCientifico,
      nomePopular: normalizarNomePopular(taxon.preferred_common_name, nomeCientifico),
      grupo: GRUPOS_ICONICOS.get(iconico) ?? "outros",
      observacoes: inteiro(item.count, "iNaturalist: observações da espécie", 1),
    };
  });
  for (let indice = 1; indice < maisObservadas.length; indice += 1) {
    if (maisObservadas[indice].observacoes > maisObservadas[indice - 1].observacoes) {
      throw new Error("iNaturalist: lista fora de ordem.");
    }
  }
  return { especies, maisObservadas };
}

/** Três consultas em sequência: o iNaturalist pede no máximo uma por segundo, em média. */
export async function carregarInaturalist(buscar: BuscarJson, opcoes: OpcoesCarga = {}): Promise<ResumoInaturalist> {
  const base = opcoes.base ?? INATURALIST_API_URL;
  const agoraMs = opcoes.agoraMs ?? Date.now();
  const { especies, maisObservadas } = lerEspeciesInaturalist(await buscar(urlInaturalistEspecies(base)));
  const observacoes = lerTotalInaturalist(await buscar(urlInaturalistObservacoes(base)));
  const observadores = lerTotalInaturalist(await buscar(urlInaturalistObservadores(base)));
  // Cada observação é de uma pessoa e de no máximo uma espécie.
  if (especies > observacoes || observadores > observacoes) {
    throw new Error("iNaturalist: totais inconsistentes.");
  }
  if (maisObservadas.some((especie) => especie.observacoes > observacoes)) {
    throw new Error("iNaturalist: espécie com mais observações que o total.");
  }
  return {
    fonte: "iNaturalist",
    consultadoEm: new Date(agoraMs).toISOString(),
    observacoes,
    especies,
    observadores,
    maisObservadas,
  };
}
