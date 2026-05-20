import "server-only";
import { unstable_cache } from "next/cache";
import { efetivoBovino, producaoLeite } from "@/lib/apis-externas/sidra";

export type DadosAgro = {
  bovinos: { ano: string; cabecas: number } | null;
  leite: { ano: string; milLitros: number } | null;
};

async function fetchDadosAgroUncached(): Promise<DadosAgro> {
  const [bovinos, leite] = await Promise.allSettled([efetivoBovino(), producaoLeite()]);
  return {
    bovinos: bovinos.status === "fulfilled" ? bovinos.value : null,
    leite: leite.status === "fulfilled" ? leite.value : null,
  };
}

/** Cache 7 dias — IBGE/SIDRA atualiza séries agrícolas anualmente. */
export const fetchDadosAgro = unstable_cache(
  fetchDadosAgroUncached,
  ["agronegocio-piracanjuba"],
  { revalidate: 60 * 60 * 24 * 7, tags: ["agronegocio"] },
);
