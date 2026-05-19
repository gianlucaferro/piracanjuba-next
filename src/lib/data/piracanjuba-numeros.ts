import "server-only";
import { unstable_cache } from "next/cache";
import { populacaoEstimada, pibMunicipal, buscarMunicipio } from "@/lib/apis-externas/ibge";

export type PiracanjubaNumeros = {
  populacao: { ano: string; valor: number } | null;
  pibPerCapita: { ano: string; valor: number } | null;
  pibTotal: { ano: string; valor: number } | null;
  microrregiao: string | null;
  mesorregiao: string | null;
  fonte: string;
};

async function fetchPiracanjubaNumerosUncached(): Promise<PiracanjubaNumeros> {
  const out: PiracanjubaNumeros = {
    populacao: null,
    pibPerCapita: null,
    pibTotal: null,
    microrregiao: null,
    mesorregiao: null,
    fonte: "IBGE — Cidades, Estimativas de População e PIB Municipal",
  };

  const tasks: Promise<unknown>[] = [
    populacaoEstimada()
      .then((mapa) => {
        const ano = Object.keys(mapa).sort().pop();
        if (ano) out.populacao = { ano, valor: mapa[ano] };
      })
      .catch(() => null),
    pibMunicipal()
      .then(({ pibTotal, pibPerCapita }) => {
        const anoTotal = Object.keys(pibTotal).sort().pop();
        if (anoTotal) out.pibTotal = { ano: anoTotal, valor: pibTotal[anoTotal] };
        const anoPc = Object.keys(pibPerCapita).sort().pop();
        if (anoPc) out.pibPerCapita = { ano: anoPc, valor: pibPerCapita[anoPc] };
      })
      .catch(() => null),
    buscarMunicipio()
      .then((m) => {
        out.microrregiao = m.microrregiao?.nome ?? null;
        out.mesorregiao = m.microrregiao?.mesorregiao?.nome ?? null;
      })
      .catch(() => null),
  ];

  await Promise.allSettled(tasks);
  return out;
}

/** Cache 24h — dados anuais mudam pouco. */
export const fetchPiracanjubaNumeros = unstable_cache(
  fetchPiracanjubaNumerosUncached,
  ["piracanjuba-numeros-ibge"],
  { revalidate: 60 * 60 * 24, tags: ["piracanjuba-numeros"] },
);
