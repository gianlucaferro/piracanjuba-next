import "server-only";
import {
  type BuscarJson,
  CAMARA_API_BASE,
  CAMARA_REVALIDATE_SECONDS,
  consultarPerfisDeputadosFederais,
  ehAutorDeputadoFederal,
  resultadoIndisponivel,
  type EmendaAutor,
  type RespostaJson,
  type ResultadoPerfisCamara,
} from "@/lib/camara-deputados";

// API v2 de Dados Abertos da Câmara dos Deputados, sem chave. Cada resposta 200 fica 24 h no
// cache de dados do Next; falha não é gravada, então a próxima renderização tenta de novo.
const CAMARA_TIMEOUT_MS = 6_000;
// Teto da consulta inteira: com a Câmara lenta a página sai sem perfis em vez de estourar o
// tempo de geração da página (60 s na Vercel). Pedido que passar do prazo conta como falha.
const CAMARA_PRAZO_TOTAL_MS = 15_000;
const CAMARA_PAUSA_RETENTATIVA_MS = 400;
// Em 2026-11-25, com 6 pedidos simultâneos a Câmara respondeu 429 (limite de taxa) a um deles;
// com 4, um pedido também falhou. Com 3, a consulta de 9 autores ainda cabe folgada no prazo.
const CAMARA_CONCORRENCIA = 3;
const CAMARA_MAX_BYTES = 512 * 1024;

// Erro de rede, timeout do pedido, 429 ou 5xx: a API da Câmara falha de vez em quando
// (2026-11-25: um 429 no worker, e o mesmo pedido respondeu 200 logo depois). Vale uma nova tentativa.
class FalhaTransitoria extends Error {}

function baseCamara(): string {
  // Só o servidor de e2e (PIRACANJUBA_E2E=1) troca a origem, para servir respostas fixas.
  const teste = process.env.PIRACANJUBA_E2E === "1" ? process.env.CAMARA_API_BASE_URL?.trim() : undefined;
  return teste || CAMARA_API_BASE;
}

async function lerJsonLimitado(response: Response): Promise<unknown> {
  const tipo = response.headers.get("content-type") ?? "";
  if (!tipo.toLowerCase().includes("application/json")) {
    await response.body?.cancel();
    throw new Error("Resposta da Câmara não é JSON.");
  }
  const declarado = Number(response.headers.get("content-length"));
  if (declarado > CAMARA_MAX_BYTES) {
    await response.body?.cancel();
    throw new Error("Resposta da Câmara excede o limite.");
  }
  if (!response.body) throw new Error("Resposta da Câmara vazia.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let texto = "";
  try {
    while (true) {
      const parte = await reader.read();
      if (parte.done) break;
      bytes += parte.value.byteLength;
      if (bytes > CAMARA_MAX_BYTES) {
        await reader.cancel();
        throw new Error("Resposta da Câmara excede o limite.");
      }
      texto += decoder.decode(parte.value, { stream: true });
    }
    texto += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(texto) as unknown;
}

async function buscarUmaVez(url: string, prazo: AbortSignal): Promise<RespostaJson> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.any([AbortSignal.timeout(CAMARA_TIMEOUT_MS), prazo]),
      next: { revalidate: CAMARA_REVALIDATE_SECONDS, tags: ["camara-deputados"] },
    });
  } catch {
    throw new FalhaTransitoria("Câmara dos Deputados sem resposta.");
  }
  if (!response.ok) {
    await response.body?.cancel();
    if (response.status === 429 || response.status >= 500) throw new FalhaTransitoria("Câmara dos Deputados indisponível.");
    throw new Error("Câmara dos Deputados recusou o pedido.");
  }
  return { json: await lerJsonLimitado(response), data: response.headers.get("date") };
}

function criarBuscarJson(prazo: AbortSignal): BuscarJson {
  return async (url) => {
    for (let tentativa = 1; ; tentativa += 1) {
      try {
        return await buscarUmaVez(url, prazo);
      } catch (erro) {
        if (tentativa >= 2 || prazo.aborted || !(erro instanceof FalhaTransitoria)) {
          // Não repassa corpo, headers ou mensagens da fonte para os logs.
          throw new Error("Não foi possível consultar a Câmara dos Deputados.");
        }
        await new Promise((resolver) => setTimeout(resolver, CAMARA_PAUSA_RETENTATIVA_MS));
      }
    }
  };
}

/**
 * Perfis dos deputados federais autores das emendas. Nunca lança: com a Câmara fora do ar a
 * página mostra as emendas normalmente, sem foto nem perfil.
 */
export async function fetchPerfisDeputadosFederais(
  emendas: ReadonlyArray<EmendaAutor>,
): Promise<ResultadoPerfisCamara> {
  try {
    return await consultarPerfisDeputadosFederais(emendas, {
      buscarJson: criarBuscarJson(AbortSignal.timeout(CAMARA_PRAZO_TOTAL_MS)),
      baseUrl: baseCamara(),
      concorrencia: CAMARA_CONCORRENCIA,
    });
  } catch {
    const autores = new Set(emendas.filter(ehAutorDeputadoFederal).map((emenda) => emenda.parlamentar_nome));
    return resultadoIndisponivel([...autores]);
  }
}
