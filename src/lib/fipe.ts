// Consulta da tabela FIPE (PBAFipe). Funções puras, usadas no servidor (rota
// /api/fipe/...) e no navegador (validação da resposta da rota).

export const TIPOS_FIPE = {
  carros: { api: "cars", rotulo: "Carros" },
  motos: { api: "motorcycles", rotulo: "Motos" },
  caminhoes: { api: "trucks", rotulo: "Caminhões" },
} as const;

export type TipoFipe = keyof typeof TIPOS_FIPE;
export const LISTA_TIPOS_FIPE = Object.keys(TIPOS_FIPE) as TipoFipe[];

export type OpcaoFipe = { codigo: string; nome: string };

export type PrecoFipe = {
  valor: number;
  marca: string;
  modelo: string;
  anoModelo: number;
  combustivel: string;
  codigoFipe: string;
  mesReferencia: string;
};

export type ConsultaFipe =
  | { tipo: TipoFipe; etapa: "marcas" }
  | { tipo: TipoFipe; etapa: "modelos"; marca: string }
  | { tipo: TipoFipe; etapa: "anos"; marca: string; modelo: string }
  | { tipo: TipoFipe; etapa: "preco"; marca: string; modelo: string; ano: string };

export type RespostaOpcoesFipe = { etapa: "marcas" | "modelos" | "anos"; opcoes: OpcaoFipe[] };
export type RespostaPrecoFipe = { etapa: "preco"; preco: PrecoFipe };

const CODIGO_NUMERICO = /^\d{1,6}$/;
// Ano-modelo com o código do combustível; a FIPE usa 32000 para veículo zero km.
const CODIGO_ANO = /^(?:19|20)\d{2}-\d$|^32000-\d$/;
const CODIGO_FIPE = /^\d{6}-\d$/;
const MAX_OPCOES = 3000;
const MAX_NOME = 160;

const ordemPtBr = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

function eTipoFipe(valor: string): valor is TipoFipe {
  return Object.prototype.hasOwnProperty.call(TIPOS_FIPE, valor);
}

/** Lê os segmentos de /api/fipe/<tipo>[/<marca>[/<modelo>[/<ano>]]]. */
export function parseConsultaFipe(partes: readonly string[]): ConsultaFipe | null {
  if (partes.length < 1 || partes.length > 4) return null;
  const [tipo, marca, modelo, ano] = partes;
  if (!eTipoFipe(tipo)) return null;
  if (partes.length === 1) return { tipo, etapa: "marcas" };
  if (!CODIGO_NUMERICO.test(marca)) return null;
  if (partes.length === 2) return { tipo, etapa: "modelos", marca };
  if (!CODIGO_NUMERICO.test(modelo)) return null;
  if (partes.length === 3) return { tipo, etapa: "anos", marca, modelo };
  if (!CODIGO_ANO.test(ano)) return null;
  return { tipo, etapa: "preco", marca, modelo, ano };
}

/** Caminho da API FIPE v2 (fipe.parallelum.com.br/api/v2) para a consulta. */
export function caminhoFipeV2(consulta: ConsultaFipe): string {
  const base = `/${TIPOS_FIPE[consulta.tipo].api}/brands`;
  switch (consulta.etapa) {
    case "marcas":
      return base;
    case "modelos":
      return `${base}/${consulta.marca}/models`;
    case "anos":
      return `${base}/${consulta.marca}/models/${consulta.modelo}/years`;
    case "preco":
      return `${base}/${consulta.marca}/models/${consulta.modelo}/years/${consulta.ano}`;
  }
}

/** Caminho da rota do site para a consulta (inverso de parseConsultaFipe). */
export function caminhoRotaFipe(consulta: ConsultaFipe): string {
  const partes: string[] = [consulta.tipo];
  if (consulta.etapa !== "marcas") partes.push(consulta.marca);
  if (consulta.etapa === "anos" || consulta.etapa === "preco") partes.push(consulta.modelo);
  if (consulta.etapa === "preco") partes.push(consulta.ano);
  return `/api/fipe/${partes.join("/")}`;
}

function registro(valor: unknown): Record<string, unknown> {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    throw new Error("Resposta da FIPE inválida.");
  }
  return valor as Record<string, unknown>;
}

function texto(valor: unknown): string {
  if (typeof valor !== "string") throw new Error("Texto da FIPE inválido.");
  const limpo = valor.replace(/\s+/g, " ").trim();
  if (!limpo || limpo.length > MAX_NOME) throw new Error("Texto da FIPE inválido.");
  return limpo;
}

/** Rótulo do ano exibido ao usuário: "32000 Flex" vira "Zero km Flex". */
export function rotuloAnoFipe(nome: string): string {
  return nome.replace(/^32000\b/, "Zero km");
}

/**
 * Valida a lista de marcas, modelos ou anos da API FIPE v2 e a devolve em ordem
 * útil: marcas e modelos em ordem alfabética; anos do mais novo ao mais antigo,
 * com o zero km primeiro.
 */
export function parseOpcoesFipe(valor: unknown, etapa: "marcas" | "modelos" | "anos"): OpcaoFipe[] {
  if (!Array.isArray(valor) || valor.length === 0 || valor.length > MAX_OPCOES) {
    throw new Error("Lista da FIPE inválida.");
  }
  const formato = etapa === "anos" ? CODIGO_ANO : CODIGO_NUMERICO;
  const vistos = new Set<string>();
  const opcoes = valor.map((item): OpcaoFipe => {
    const dado = registro(item);
    const codigo = typeof dado.code === "number" ? String(dado.code) : dado.code;
    if (typeof codigo !== "string" || !formato.test(codigo)) throw new Error("Código da FIPE inválido.");
    if (vistos.has(codigo)) throw new Error("Código da FIPE repetido.");
    vistos.add(codigo);
    const nome = texto(dado.name);
    return { codigo, nome: etapa === "anos" ? rotuloAnoFipe(nome) : nome };
  });
  if (etapa === "anos") {
    return opcoes.sort((a, b) => b.codigo.localeCompare(a.codigo, "en", { numeric: true }));
  }
  return opcoes.sort((a, b) => ordemPtBr.compare(a.nome, b.nome));
}

/** "R$ 29.180,00" -> 29180. */
export function valorFipeEmReais(valor: unknown): number {
  if (typeof valor !== "string") throw new Error("Preço da FIPE inválido.");
  const casado = valor.trim().match(/^R\$\s?(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})$/);
  if (!casado) throw new Error("Preço da FIPE inválido.");
  const reais = Number(`${casado[1].replaceAll(".", "")}.${casado[2]}`);
  if (!Number.isFinite(reais) || reais <= 0) throw new Error("Preço da FIPE inválido.");
  return reais;
}

/** Valida o preço devolvido pela API FIPE v2. */
export function parsePrecoFipe(valor: unknown): PrecoFipe {
  const dado = registro(valor);
  const anoModelo = dado.modelYear;
  if (typeof anoModelo !== "number" || !Number.isInteger(anoModelo) || anoModelo < 1900 || anoModelo > 32000) {
    throw new Error("Ano da FIPE inválido.");
  }
  const codigoFipe = texto(dado.codeFipe);
  if (!CODIGO_FIPE.test(codigoFipe)) throw new Error("Código FIPE inválido.");
  return {
    valor: valorFipeEmReais(dado.price),
    marca: texto(dado.brand),
    modelo: texto(dado.model),
    anoModelo,
    combustivel: texto(dado.fuel),
    codigoFipe,
    mesReferencia: texto(dado.referenceMonth),
  };
}

/** Valida a resposta de lista da rota do site (no navegador). */
export function parseRespostaOpcoesFipe(valor: unknown, etapa: "marcas" | "modelos" | "anos"): OpcaoFipe[] {
  const dado = registro(valor);
  if (dado.etapa !== etapa || !Array.isArray(dado.opcoes) || dado.opcoes.length === 0 || dado.opcoes.length > MAX_OPCOES) {
    throw new Error("Resposta da consulta FIPE inválida.");
  }
  const formato = etapa === "anos" ? CODIGO_ANO : CODIGO_NUMERICO;
  return dado.opcoes.map((item): OpcaoFipe => {
    const opcao = registro(item);
    if (typeof opcao.codigo !== "string" || !formato.test(opcao.codigo)) {
      throw new Error("Resposta da consulta FIPE inválida.");
    }
    return { codigo: opcao.codigo, nome: texto(opcao.nome) };
  });
}

/** Valida a resposta de preço da rota do site (no navegador). */
export function parseRespostaPrecoFipe(valor: unknown): PrecoFipe {
  const dado = registro(valor);
  if (dado.etapa !== "preco") throw new Error("Resposta da consulta FIPE inválida.");
  const preco = registro(dado.preco);
  if (typeof preco.valor !== "number" || !Number.isFinite(preco.valor) || preco.valor <= 0) {
    throw new Error("Resposta da consulta FIPE inválida.");
  }
  if (typeof preco.anoModelo !== "number" || !Number.isInteger(preco.anoModelo)) {
    throw new Error("Resposta da consulta FIPE inválida.");
  }
  const codigoFipe = texto(preco.codigoFipe);
  if (!CODIGO_FIPE.test(codigoFipe)) throw new Error("Resposta da consulta FIPE inválida.");
  return {
    valor: preco.valor,
    marca: texto(preco.marca),
    modelo: texto(preco.modelo),
    anoModelo: preco.anoModelo,
    combustivel: texto(preco.combustivel),
    codigoFipe,
    mesReferencia: texto(preco.mesReferencia),
  };
}
