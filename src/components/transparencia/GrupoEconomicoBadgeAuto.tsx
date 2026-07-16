"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchGrupos, indexarPorCnpj } from "@/data/gruposApi";
import GrupoEconomicoBadge from "./GrupoEconomicoBadge";

/**
 * Versão auto-resolvida do selo, para usar em server components (páginas SSR)
 * onde não há um índice de grupos em escopo. Busca os grupos uma vez (queryKey
 * compartilhada = 1 request) e resolve pelo CNPJ. Some quando não há grupo.
 */
export default function GrupoEconomicoBadgeAuto({ cnpj }: { cnpj: string | null }) {
  const { data: grupos } = useQuery({
    queryKey: ["grupos-economicos"],
    queryFn: fetchGrupos,
    staleTime: 1000 * 60 * 10,
  });
  if (!grupos || !cnpj) return null;
  const grupo = indexarPorCnpj(grupos).get(cnpj.replace(/\D/g, ""));
  return <GrupoEconomicoBadge grupo={grupo} />;
}
