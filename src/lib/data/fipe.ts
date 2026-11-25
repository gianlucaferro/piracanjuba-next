import "server-only";
import { unstable_cache } from "next/cache";
// Leitor de JSON com limite de tamanho compartilhado com a cotação de câmbio.
import { readBoundedJson } from "@/lib/data/cambio";
import {
  caminhoFipeV2,
  parseOpcoesFipe,
  parsePrecoFipe,
  type ConsultaFipe,
  type RespostaOpcoesFipe,
  type RespostaPrecoFipe,
} from "@/lib/fipe";

// API FIPE v2 de Deivid Fortuna (deividfortuna.github.io/fipe/v2), com dados da Tabela FIPE.
// Sem token: 500 consultas por dia por IP. Com token gratuito (fipe.api.br) em
// FIPE_API_TOKEN: 1.000 por dia, contadas pelo token e não pelo IP compartilhado da Vercel.
const FIPE_V2_BASE = "https://fipe.parallelum.com.br/api/v2";
const FIPE_TIMEOUT_MS = 8_000;
const FIPE_MAX_BYTES = 262_144;
// A tabela muda uma vez por mês; listas e preços ficam 12 horas no cache do servidor.
export const FIPE_REVALIDATE_SECONDS = 43_200;

export class FipeNaoEncontrada extends Error {}
export class FipeLimiteAtingido extends Error {}

async function buscarFipeV2(caminho: string): Promise<unknown> {
  const token = process.env.FIPE_API_TOKEN?.trim();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers["X-Subscription-Token"] = token;
  let response: Response;
  try {
    response = await fetch(`${FIPE_V2_BASE}${caminho}`, {
      cache: "no-store",
      redirect: "error",
      headers,
      signal: AbortSignal.timeout(FIPE_TIMEOUT_MS),
    });
  } catch {
    throw new Error("Tabela FIPE indisponível.");
  }
  if (response.status === 404) {
    await response.body?.cancel();
    throw new FipeNaoEncontrada("Veículo não encontrado na tabela FIPE.");
  }
  if (response.status === 429) {
    await response.body?.cancel();
    throw new FipeLimiteAtingido("Limite diário de consultas à tabela FIPE atingido.");
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("Tabela FIPE indisponível.");
  }
  try {
    return await readBoundedJson(response, FIPE_MAX_BYTES);
  } catch {
    // Não propagar corpo nem mensagens do fornecedor para os logs.
    throw new Error("Resposta da tabela FIPE inválida.");
  }
}

async function carregarOpcoes(consulta: ConsultaFipe & { etapa: "marcas" | "modelos" | "anos" }): Promise<RespostaOpcoesFipe> {
  const opcoes = parseOpcoesFipe(await buscarFipeV2(caminhoFipeV2(consulta)), consulta.etapa);
  return { etapa: consulta.etapa, opcoes };
}

async function carregarPreco(consulta: ConsultaFipe & { etapa: "preco" }): Promise<RespostaPrecoFipe> {
  return { etapa: "preco", preco: parsePrecoFipe(await buscarFipeV2(caminhoFipeV2(consulta))) };
}

// Os argumentos entram na chave do cache. Só respostas válidas são guardadas:
// erro de consulta não substitui o que já estava no cache.
const opcoesEmCache = unstable_cache(carregarOpcoes, ["pba-fipe-opcoes-v1"], { revalidate: FIPE_REVALIDATE_SECONDS });
const precoEmCache = unstable_cache(carregarPreco, ["pba-fipe-preco-v1"], { revalidate: FIPE_REVALIDATE_SECONDS });

function contem(opcoes: RespostaOpcoesFipe, codigo: string) {
  return opcoes.opcoes.some((opcao) => opcao.codigo === codigo);
}

/**
 * Responde à consulta conferindo cada código na lista da etapa anterior, que já
 * está em cache. Código que não existe na tabela é recusado sem consultar a API,
 * para que pedidos inventados não consumam o limite diário.
 */
export async function consultarFipe(consulta: ConsultaFipe): Promise<RespostaOpcoesFipe | RespostaPrecoFipe> {
  const marcas = await opcoesEmCache({ tipo: consulta.tipo, etapa: "marcas" });
  if (consulta.etapa === "marcas") return marcas;
  if (!contem(marcas, consulta.marca)) throw new FipeNaoEncontrada("Marca não encontrada na tabela FIPE.");

  const modelos = await opcoesEmCache({ tipo: consulta.tipo, etapa: "modelos", marca: consulta.marca });
  if (consulta.etapa === "modelos") return modelos;
  if (!contem(modelos, consulta.modelo)) throw new FipeNaoEncontrada("Modelo não encontrado na tabela FIPE.");

  const anos = await opcoesEmCache({ tipo: consulta.tipo, etapa: "anos", marca: consulta.marca, modelo: consulta.modelo });
  if (consulta.etapa === "anos") return anos;
  if (!contem(anos, consulta.ano)) throw new FipeNaoEncontrada("Ano não encontrado na tabela FIPE.");

  return precoEmCache(consulta);
}
