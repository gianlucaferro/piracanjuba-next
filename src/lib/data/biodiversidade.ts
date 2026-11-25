import "server-only";
import { unstable_cache } from "next/cache";
import {
  BIODIVERSIDADE_REVALIDATE_SECONDS,
  GBIF_API_URL,
  INATURALIST_API_URL,
  carregarGbif,
  carregarInaturalist,
  type Biodiversidade,
} from "@/lib/biodiversidade";

// O iNaturalist pede um User-Agent que identifique a aplicação.
const USER_AGENT = "Piracanjuba.AI/1.0 (https://piracanjuba.ai; contato@piracanjuba.ai)";
const TEMPO_LIMITE_MS = 10_000;
const MAX_BYTES = 1_000_000;

function fontes(): { gbif: string; inaturalist: string } {
  // Só o servidor local de e2e (next dev com PIRACANJUBA_E2E=1) troca as APIs por fixtures,
  // para os testes não dependerem da rede. Em produção, nunca.
  if (process.env.PIRACANJUBA_E2E === "1" && process.env.NODE_ENV !== "production") {
    return {
      gbif: "http://127.0.0.1:4319/__fixtures/gbif/v1",
      inaturalist: "http://127.0.0.1:4319/__fixtures/inaturalist/v1",
    };
  }
  return { gbif: GBIF_API_URL, inaturalist: INATURALIST_API_URL };
}

async function lerJsonLimitado(resposta: Response): Promise<unknown> {
  const declarado = Number(resposta.headers.get("content-length"));
  if (declarado > MAX_BYTES) {
    await resposta.body?.cancel();
    throw new Error("Resposta grande demais.");
  }
  if (!resposta.body) throw new Error("Resposta vazia.");
  const leitor = resposta.body.getReader();
  const decodificador = new TextDecoder();
  let bytes = 0;
  let texto = "";
  try {
    while (true) {
      const parte = await leitor.read();
      if (parte.done) break;
      bytes += parte.value.byteLength;
      if (bytes > MAX_BYTES) {
        await leitor.cancel();
        throw new Error("Resposta grande demais.");
      }
      texto += decodificador.decode(parte.value, { stream: true });
    }
    texto += decodificador.decode();
  } finally {
    leitor.releaseLock();
  }
  return JSON.parse(texto) as unknown;
}

async function buscarJson(url: string): Promise<unknown> {
  const resposta = await fetch(url, {
    // O cache é o do unstable_cache abaixo, com o resultado já validado.
    cache: "no-store",
    redirect: "error",
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
  });
  if (!resposta.ok) {
    await resposta.body?.cancel();
    throw new Error(`Fonte respondeu ${resposta.status}.`);
  }
  return lerJsonLimitado(resposta);
}

// Uma consulta por dia a cada fonte. Só o resultado validado entra no cache; se a revalidação
// falhar, o Next continua servindo o último panorama válido.
const gbifEmCache = unstable_cache(
  () => carregarGbif(buscarJson, { base: fontes().gbif }),
  ["meio-ambiente-biodiversidade-gbif-v1"],
  { revalidate: BIODIVERSIDADE_REVALIDATE_SECONDS, tags: ["biodiversidade"] },
);

const inaturalistEmCache = unstable_cache(
  () => carregarInaturalist(buscarJson, { base: fontes().inaturalist }),
  ["meio-ambiente-biodiversidade-inaturalist-v1"],
  { revalidate: BIODIVERSIDADE_REVALIDATE_SECONDS, tags: ["biodiversidade"] },
);

/** Panorama das duas fontes; a que falhar vem nula e a página mostra só a outra. */
export async function fetchBiodiversidade(): Promise<Biodiversidade> {
  const [gbif, inaturalist] = await Promise.allSettled([gbifEmCache(), inaturalistEmCache()]);
  // Sem repassar corpo nem cabeçalhos das fontes para o log.
  if (gbif.status === "rejected") console.warn("[biodiversidade] GBIF indisponível.");
  if (inaturalist.status === "rejected") console.warn("[biodiversidade] iNaturalist indisponível.");
  return {
    gbif: gbif.status === "fulfilled" ? gbif.value : null,
    inaturalist: inaturalist.status === "fulfilled" ? inaturalist.value : null,
  };
}
