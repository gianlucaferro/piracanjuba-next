/**
 * Perfis de deputados federais pela API de Dados Abertos da Câmara dos Deputados (v2, sem chave).
 *
 * Módulo puro: não faz rede por conta própria e não usa imports com "@/", para rodar no
 * `node --test`. A rede (fetch com cache de 24 h, timeout e leitura limitada) fica em
 * src/lib/data/camara-deputados.ts, que injeta `buscarJson` aqui.
 *
 * Casamento de nomes (2026-11-25): o autor chega do Supabase como "Nome (PARTIDO-UF)" na
 * esfera federal. O nome é comparado sem acento, em maiúsculas e sem pontuação; se não houver
 * igualdade exata, compara-se o núcleo do nome (sem título inicial como "Delegada" e sem
 * partículas como "da"). Mais de um deputado possível: fica o da UF da emenda (GO na falta
 * dela). Continuando ambíguo, não há associação: melhor sem foto do que com a foto errada.
 */

export const CAMARA_API_BASE = "https://dadosabertos.camara.leg.br/api/v2";
export const CAMARA_DADOS_ABERTOS_URL = "https://dadosabertos.camara.leg.br/";
export const CAMARA_TERMOS_USO_URL = "https://www2.camara.leg.br/termo-de-uso-e-politica-de-privacidade";
export const CAMARA_PERFIL_BASE = "https://www.camara.leg.br/deputados/";
export const CAMARA_REVALIDATE_SECONDS = 86_400;
export const CAMARA_ITENS_POR_PAGINA = 100;

const UFS = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

const PARTICULAS = new Set(["DA", "DE", "DO", "DAS", "DOS", "E"]);

// Títulos que deputados usam no nome parlamentar e que a fonte da emenda às vezes omite
// ("Adriana Accorsi" na emenda, "Delegada Adriana Accorsi" na Câmara).
const TITULOS = new Set([
  "DELEGADO", "DELEGADA", "DR", "DRA", "DOUTOR", "DOUTORA", "PROFESSOR", "PROFESSORA",
  "PROF", "PROFA", "CORONEL", "CEL", "CAPITAO", "CAPITA", "SARGENTO", "SGT", "SUBTENENTE",
  "TENENTE", "MAJOR", "GENERAL", "COMANDANTE", "CMTE", "PASTOR", "PASTORA", "PADRE",
  "BISPO", "BISPA", "IRMAO", "IRMA", "MISSIONARIO", "MISSIONARIA", "APOSTOLO", "DEPUTADO",
  "DEPUTADA", "DEP", "ENFERMEIRO", "ENFERMEIRA", "POLICIAL", "CABO", "SOLDADO", "PERITO",
  "PERITA", "JUIZ", "JUIZA", "PROMOTOR", "PROMOTORA",
]);

// Autores federais que não são deputados: a API da Câmara não os cobre.
const NAO_DEPUTADO = /^(BANCADA|SENADOR|SENADORA|SEN|COMISSAO|RELATOR|RELATORA|RELATORIA|GOVERNO|MINISTERIO|LIDERANCA|MESA)\b/;

export type EmendaAutor = {
  parlamentar_nome: string;
  parlamentar_esfera: string | null;
  ano: number;
  valor_empenhado?: number | null;
  valor_pago?: number | null;
};

export type AutorExtraido = { nome: string; partido: string | null; uf: string | null };

export type DeputadoListado = {
  id: number;
  nome: string;
  siglaUf: string | null;
  idLegislatura: number | null;
};

export type PaginaDeputados = { itens: DeputadoListado[]; temProximaPagina: boolean };

export type PerfilDeputadoFederal = {
  id: number;
  /** Nome parlamentar (nome eleitoral) registrado hoje na Câmara. */
  nome: string;
  /** Partido atual na Câmara, que pode diferir do partido indicado na emenda. */
  partido: string | null;
  uf: string | null;
  situacao: string | null;
  emExercicio: boolean;
  urlFoto: string | null;
  urlPerfil: string;
};

export type Casamento = { id: number; criterio: "nome" | "nome_sem_titulo" };

export type StatusConsultaCamara = "ok" | "parcial" | "indisponivel" | "sem_autores";

export type ResultadoPerfisCamara = {
  status: StatusConsultaCamara;
  /** Chave: `parlamentar_nome` exatamente como está na emenda. */
  perfis: Record<string, PerfilDeputadoFederal>;
  /** Autores federais consultados que ficaram sem perfil (não achados, ambíguos ou com falha). */
  semPerfil: string[];
  /** Data (YYYY-MM-DD, horário de Brasília) da resposta mais antiga da Câmara usada. */
  consultadoEm: string | null;
};

export type RespostaJson = { json: unknown; data: string | null };
export type BuscarJson = (url: string) => Promise<RespostaJson>;

export function resultadoIndisponivel(semPerfil: string[] = []): ResultadoPerfisCamara {
  return { status: "indisponivel", perfis: {}, semPerfil: [...semPerfil].sort(), consultadoEm: null };
}

/** Sem acento, maiúsculas, pontuação trocada por espaço e espaços colapsados. */
export function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Nome sem títulos iniciais e sem partículas ("Delegada Adriana da Silva" vira "ADRIANA SILVA"). */
export function nucleoDoNome(nome: string): string {
  const tokens = normalizarNome(nome).split(" ").filter(Boolean);
  while (tokens.length > 1 && TITULOS.has(tokens[0])) tokens.shift();
  const semParticulas = tokens.filter((token) => !PARTICULAS.has(token));
  return (semParticulas.length ? semParticulas : tokens).join(" ");
}

/** Separa "Nome (PARTIDO-UF)" do jeito que a emenda federal chega do Supabase. */
export function extrairAutor(parlamentarNome: string): AutorExtraido {
  const bruto = parlamentarNome.trim().replace(/\s+/g, " ");
  const match = /^(.*?)\s*\(([^()]*)\)$/.exec(bruto);
  if (!match || !match[1].trim()) return { nome: bruto, partido: null, uf: null };
  const nome = match[1].trim();
  const dentro = match[2].trim();
  const partes = /^(.+?)\s*[-/]\s*([A-Za-z]{2})$/.exec(dentro);
  if (partes && UFS.has(partes[2].toUpperCase())) {
    return { nome, partido: partes[1].trim() || null, uf: partes[2].toUpperCase() };
  }
  if (UFS.has(dentro.toUpperCase())) return { nome, partido: null, uf: dentro.toUpperCase() };
  return { nome, partido: dentro || null, uf: null };
}

/** Emenda de esfera federal cujo autor pode ser deputado (exclui bancada, senador, relator). */
export function ehAutorDeputadoFederal(emenda: Pick<EmendaAutor, "parlamentar_nome" | "parlamentar_esfera">): boolean {
  if ((emenda.parlamentar_esfera ?? "").trim().toLowerCase() !== "federal") return false;
  const nome = normalizarNome(extrairAutor(emenda.parlamentar_nome ?? "").nome);
  return nome.length > 0 && !NAO_DEPUTADO.test(nome);
}

/** Legislatura federal em que cai o ano (57ª: 2023 a 2027). Válido a partir da 49ª (1991). */
export function legislaturaDoAno(ano: number): number | null {
  if (!Number.isInteger(ano) || ano < 1991 || ano > 2200) return null;
  return Math.floor((ano - 1795) / 4);
}

/**
 * Emendas do ano Y são propostas no ano Y-1 (lei orçamentária) e pagas a partir de Y: consulta
 * as legislaturas dos dois anos. Limita às 6 mais recentes para a consulta não crescer sem fim.
 */
export function legislaturasDosAnos(anos: Iterable<number>): number[] {
  const legislaturas = new Set<number>();
  for (const ano of anos) {
    for (const candidato of [ano - 1, ano]) {
      const legislatura = legislaturaDoAno(candidato);
      if (legislatura !== null) legislaturas.add(legislatura);
    }
  }
  return [...legislaturas].sort((a, b) => a - b).slice(-6);
}

/**
 * Termos para o filtro `nome=` da Câmara, que busca trecho do nome e ignora acento: primeiro o
 * maior pedaço do núcleo (acha também variantes como "Glaustin da Fokus"); se a resposta vier
 * paginada, o núcleo inteiro.
 */
export function termosDeBusca(nome: string): string[] {
  const nucleo = nucleoDoNome(nome);
  const pedacos = nucleo.split(" ").filter((token) => token.length >= 3);
  const reserva = normalizarNome(nome).split(" ").filter((token) => token.length >= 3);
  const base = pedacos.length ? pedacos : reserva;
  if (!base.length) return [];
  const maior = base.reduce((atual, token) => (token.length > atual.length ? token : atual));
  const termos = [maior];
  if (nucleo.includes(" ") && nucleo !== maior) termos.push(nucleo);
  return termos;
}

export function urlBuscaDeputados(baseUrl: string, termo: string, legislaturas: number[]): string {
  const params = new URLSearchParams({ nome: termo });
  for (const legislatura of legislaturas) params.append("idLegislatura", String(legislatura));
  params.set("itens", String(CAMARA_ITENS_POR_PAGINA));
  params.set("ordem", "ASC");
  params.set("ordenarPor", "nome");
  return `${baseUrl}/deputados?${params.toString()}`;
}

export function urlDetalheDeputado(baseUrl: string, id: number): string {
  return `${baseUrl}/deputados/${id}`;
}

function registro(valor: unknown, contexto: string): Record<string, unknown> {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    throw new Error(`Resposta da Câmara inválida: ${contexto}.`);
  }
  return valor as Record<string, unknown>;
}

function idValido(valor: unknown): number {
  if (typeof valor !== "number" || !Number.isSafeInteger(valor) || valor <= 0) {
    throw new Error("Resposta da Câmara inválida: id.");
  }
  return valor;
}

function textoObrigatorio(valor: unknown, contexto: string, max = 200): string {
  if (typeof valor !== "string") throw new Error(`Resposta da Câmara inválida: ${contexto}.`);
  const texto = valor.trim().replace(/\s+/g, " ");
  if (!texto || texto.length > max) throw new Error(`Resposta da Câmara inválida: ${contexto}.`);
  return texto;
}

function textoOpcional(valor: unknown, contexto: string, max: number): string | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== "string") throw new Error(`Resposta da Câmara inválida: ${contexto}.`);
  const texto = valor.trim().replace(/\s+/g, " ");
  if (!texto) return null;
  if (texto.length > max) throw new Error(`Resposta da Câmara inválida: ${contexto}.`);
  return texto;
}

function ufOpcional(valor: unknown): string | null {
  const uf = textoOpcional(valor, "siglaUf", 2);
  if (uf === null) return null;
  if (!UFS.has(uf)) throw new Error("Resposta da Câmara inválida: siglaUf.");
  return uf;
}

function legislaturaOpcional(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== "number" || !Number.isInteger(valor) || valor < 1 || valor > 200) {
    throw new Error("Resposta da Câmara inválida: idLegislatura.");
  }
  return valor;
}

/** Valida `GET /deputados`. Qualquer item fora do formato invalida a resposta inteira. */
export function lerListaDeputados(json: unknown): PaginaDeputados {
  const corpo = registro(json, "lista");
  if (!Array.isArray(corpo.dados)) throw new Error("Resposta da Câmara inválida: dados.");
  if (corpo.dados.length > CAMARA_ITENS_POR_PAGINA) throw new Error("Resposta da Câmara inválida: itens demais.");
  const itens = corpo.dados.map((bruto): DeputadoListado => {
    const item = registro(bruto, "deputado");
    return {
      id: idValido(item.id),
      nome: textoObrigatorio(item.nome, "nome"),
      siglaUf: ufOpcional(item.siglaUf),
      idLegislatura: legislaturaOpcional(item.idLegislatura),
    };
  });
  const links = Array.isArray(corpo.links) ? corpo.links : [];
  const temLinkProximo = links.some((link) => typeof link === "object" && link !== null && (link as Record<string, unknown>).rel === "next");
  // Página cheia sem link "next" também pode estar truncada: não confia no casamento.
  return { itens, temProximaPagina: temLinkProximo || itens.length >= CAMARA_ITENS_POR_PAGINA };
}

function fotoDaCamara(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  try {
    const url = new URL(valor);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || (host !== "camara.leg.br" && !host.endsWith(".camara.leg.br"))) return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Valida `GET /deputados/{id}` e devolve só os campos exibidos. CPF, data de nascimento,
 * e-mail e demais dados pessoais da resposta nunca saem daqui.
 */
export function lerDetalheDeputado(json: unknown, idEsperado: number): PerfilDeputadoFederal {
  const dados = registro(registro(json, "detalhe").dados, "dados");
  const id = idValido(dados.id);
  if (id !== idEsperado) throw new Error("Resposta da Câmara inválida: id diferente do pedido.");
  const status = registro(dados.ultimoStatus, "ultimoStatus");
  const nome = textoOpcional(status.nomeEleitoral, "nomeEleitoral", 200) ?? textoObrigatorio(status.nome, "nome");
  const siglaPartido = textoOpcional(status.siglaPartido, "siglaPartido", 30);
  // Sigla com caractere inesperado não vai para a tela; o resto do perfil continua valendo.
  const partido = siglaPartido !== null && /^[A-Za-zÀ-ÿ0-9. ]+$/.test(siglaPartido) ? siglaPartido : null;
  const situacao = textoOpcional(status.situacao, "situacao", 80);
  return {
    id,
    nome,
    partido,
    uf: ufOpcional(status.siglaUf),
    situacao,
    emExercicio: situacao !== null && normalizarNome(situacao) === "EXERCICIO",
    urlFoto: fotoDaCamara(status.urlFoto),
    urlPerfil: `${CAMARA_PERFIL_BASE}${id}`,
  };
}

type CandidatoAgrupado = { nomes: Set<string>; nucleos: Set<string>; ufs: Set<string> };

/**
 * Casa o autor da emenda com os deputados devolvidos pela busca. Primeiro por nome igual;
 * sem nenhum, pelo núcleo do nome (só com dois pedaços ou mais, para "Waldir" sozinho não
 * casar com qualquer Waldir). Com UF na emenda, o deputado precisa ser dessa UF; sem UF,
 * prefere a `ufPreferida`. Sobrando mais de um, devolve null.
 */
export function casarAutorComDeputado(
  parlamentarNome: string,
  candidatos: ReadonlyArray<DeputadoListado>,
  ufPreferida = "GO",
): Casamento | null {
  const autor = extrairAutor(parlamentarNome);
  const alvoNome = normalizarNome(autor.nome);
  const alvoNucleo = nucleoDoNome(autor.nome);
  if (!alvoNome) return null;

  const porId = new Map<number, CandidatoAgrupado>();
  for (const candidato of candidatos) {
    const grupo = porId.get(candidato.id) ?? { nomes: new Set(), nucleos: new Set(), ufs: new Set() };
    grupo.nomes.add(normalizarNome(candidato.nome));
    grupo.nucleos.add(nucleoDoNome(candidato.nome));
    if (candidato.siglaUf) grupo.ufs.add(candidato.siglaUf);
    porId.set(candidato.id, grupo);
  }

  const niveis: Array<[Casamento["criterio"], (grupo: CandidatoAgrupado) => boolean]> = [
    ["nome", (grupo) => grupo.nomes.has(alvoNome)],
    ["nome_sem_titulo", (grupo) => alvoNucleo.includes(" ") && grupo.nucleos.has(alvoNucleo)],
  ];

  for (const [criterio, casa] of niveis) {
    let ids = [...porId.entries()].filter(([, grupo]) => casa(grupo)).map(([id]) => id);
    if (!ids.length) continue;
    if (autor.uf) {
      ids = ids.filter((id) => porId.get(id)?.ufs.has(autor.uf as string));
      if (!ids.length) continue;
    } else if (ids.length > 1) {
      const preferidos = ids.filter((id) => porId.get(id)?.ufs.has(ufPreferida));
      if (preferidos.length) ids = preferidos;
    }
    return ids.length === 1 ? { id: ids[0], criterio } : null;
  }
  return null;
}

/** Converte o header Date da resposta em YYYY-MM-DD no horário de Brasília. */
export function dataDoHeader(header: string | null): string | null {
  if (!header) return null;
  const ms = Date.parse(header);
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

async function emLotes<T, R>(itens: T[], tamanho: number, tarefa: (item: T) => Promise<R>): Promise<R[]> {
  const resultados: R[] = [];
  for (let inicio = 0; inicio < itens.length; inicio += tamanho) {
    resultados.push(...(await Promise.all(itens.slice(inicio, inicio + tamanho).map(tarefa))));
  }
  return resultados;
}

export type OpcoesConsulta = {
  buscarJson: BuscarJson;
  baseUrl?: string;
  ufPreferida?: string;
  concorrencia?: number;
};

/**
 * Busca o perfil de cada deputado federal autor de emenda. Nunca lança: falha de rede ou JSON
 * fora do formato só tira o perfil daquele autor e muda o `status`.
 */
export async function consultarPerfisDeputadosFederais(
  emendas: ReadonlyArray<EmendaAutor>,
  opcoes: OpcoesConsulta,
): Promise<ResultadoPerfisCamara> {
  const baseUrl = (opcoes.baseUrl ?? CAMARA_API_BASE).replace(/\/+$/, "");
  const ufPreferida = opcoes.ufPreferida ?? "GO";
  const concorrencia = Math.max(1, Math.min(opcoes.concorrencia ?? 4, 8));

  const anosPorAutor = new Map<string, Set<number>>();
  for (const emenda of emendas) {
    if (!ehAutorDeputadoFederal(emenda)) continue;
    const anos = anosPorAutor.get(emenda.parlamentar_nome) ?? new Set<number>();
    if (Number.isInteger(emenda.ano)) anos.add(emenda.ano);
    anosPorAutor.set(emenda.parlamentar_nome, anos);
  }
  const autores = [...anosPorAutor.keys()].sort();
  if (!autores.length) return { status: "sem_autores", perfis: {}, semPerfil: [], consultadoEm: null };

  let requisicoes = 0;
  let falhas = 0;
  const datas: string[] = [];

  async function pedir(url: string): Promise<unknown> {
    requisicoes += 1;
    const resposta = await opcoes.buscarJson(url);
    const data = dataDoHeader(resposta.data);
    if (data) datas.push(data);
    return resposta.json;
  }

  const casamentos = await emLotes(autores, concorrencia, async (autor) => {
    const legislaturas = legislaturasDosAnos(anosPorAutor.get(autor) ?? []);
    const termos = termosDeBusca(extrairAutor(autor).nome);
    if (!legislaturas.length || !termos.length) return null;
    for (const termo of termos) {
      try {
        const pagina = lerListaDeputados(await pedir(urlBuscaDeputados(baseUrl, termo, legislaturas)));
        if (pagina.temProximaPagina) continue;
        return casarAutorComDeputado(autor, pagina.itens, ufPreferida);
      } catch {
        falhas += 1;
        return null;
      }
    }
    return null;
  });

  const idsPorAutor = new Map<string, number>();
  casamentos.forEach((casamento, indice) => {
    if (casamento) idsPorAutor.set(autores[indice], casamento.id);
  });
  const ids = [...new Set(idsPorAutor.values())].sort((a, b) => a - b);
  const detalhes = await emLotes(ids, concorrencia, async (id) => {
    try {
      return lerDetalheDeputado(await pedir(urlDetalheDeputado(baseUrl, id)), id);
    } catch {
      falhas += 1;
      return null;
    }
  });
  const perfilPorId = new Map<number, PerfilDeputadoFederal>();
  detalhes.forEach((perfil) => {
    if (perfil) perfilPorId.set(perfil.id, perfil);
  });

  const perfis: Record<string, PerfilDeputadoFederal> = {};
  const semPerfil: string[] = [];
  for (const autor of autores) {
    const id = idsPorAutor.get(autor);
    const perfil = id === undefined ? undefined : perfilPorId.get(id);
    if (perfil) perfis[autor] = perfil;
    else semPerfil.push(autor);
  }

  const status: StatusConsultaCamara =
    falhas === 0 ? "ok" : falhas >= requisicoes ? "indisponivel" : "parcial";
  return { status, perfis, semPerfil, consultadoEm: datas.length ? [...datas].sort()[0] : null };
}

export type GrupoDeputadoFederal = {
  perfil: PerfilDeputadoFederal;
  /** Como o autor aparece nas emendas (pode haver grafias diferentes do mesmo deputado). */
  nomesNaEmenda: string[];
  totalEmpenhado: number;
  totalPago: number;
  quantidade: number;
};

export type AutorFederalSemPerfil = {
  nome: string;
  totalEmpenhado: number;
  totalPago: number;
  quantidade: number;
};

/** Soma as emendas federais por deputado associado (pelo id da Câmara) e lista as sem perfil. */
export function agruparEmendasPorDeputado(
  emendas: ReadonlyArray<EmendaAutor>,
  perfis: Readonly<Record<string, PerfilDeputadoFederal>>,
): { grupos: GrupoDeputadoFederal[]; semPerfil: AutorFederalSemPerfil[] } {
  const grupos = new Map<number, GrupoDeputadoFederal>();
  const semPerfil = new Map<string, AutorFederalSemPerfil>();
  for (const emenda of emendas) {
    if (!ehAutorDeputadoFederal(emenda)) continue;
    const empenhado = Number(emenda.valor_empenhado || 0);
    const pago = Number(emenda.valor_pago || 0);
    const perfil = Object.prototype.hasOwnProperty.call(perfis, emenda.parlamentar_nome)
      ? perfis[emenda.parlamentar_nome]
      : undefined;
    if (perfil) {
      const grupo = grupos.get(perfil.id) ?? { perfil, nomesNaEmenda: [], totalEmpenhado: 0, totalPago: 0, quantidade: 0 };
      if (!grupo.nomesNaEmenda.includes(emenda.parlamentar_nome)) grupo.nomesNaEmenda.push(emenda.parlamentar_nome);
      grupo.totalEmpenhado += empenhado;
      grupo.totalPago += pago;
      grupo.quantidade += 1;
      grupos.set(perfil.id, grupo);
    } else {
      const autor = semPerfil.get(emenda.parlamentar_nome) ?? { nome: emenda.parlamentar_nome, totalEmpenhado: 0, totalPago: 0, quantidade: 0 };
      autor.totalEmpenhado += empenhado;
      autor.totalPago += pago;
      autor.quantidade += 1;
      semPerfil.set(emenda.parlamentar_nome, autor);
    }
  }
  const ordem = <T extends { totalPago: number; totalEmpenhado: number }>(a: T, b: T, nomeA: string, nomeB: string) =>
    b.totalPago - a.totalPago || b.totalEmpenhado - a.totalEmpenhado || nomeA.localeCompare(nomeB, "pt-BR");
  return {
    grupos: [...grupos.values()]
      .map((grupo) => ({ ...grupo, nomesNaEmenda: [...grupo.nomesNaEmenda].sort((a, b) => a.localeCompare(b, "pt-BR")) }))
      .sort((a, b) => ordem(a, b, a.perfil.nome, b.perfil.nome)),
    semPerfil: [...semPerfil.values()].sort((a, b) => ordem(a, b, a.nome, b.nome)),
  };
}
