"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Network, ArrowRight } from "lucide-react";
import { fetchGrupos } from "@/data/gruposApi";

/**
 * Aviso compacto no topo das listas de contratos, linkando para a página de
 * grupos econômicos. Some silenciosamente se não houver grupos detectados.
 * Usa a mesma queryKey da página, então não gera request extra.
 */
export default function GruposContratosAviso({ poder }: { poder?: "prefeitura" | "camara" }) {
  const { data } = useQuery({
    queryKey: ["grupos-economicos"],
    queryFn: fetchGrupos,
    staleTime: 1000 * 60 * 10,
  });
  const grupos = (data ?? []).filter(
    (g) => !poder || g.membros.some((m) => m.poderes.includes(poder))
  );
  if (grupos.length === 0) return null;
  const nEmpresas = grupos.reduce((a, g) => a + g.n_empresas, 0);
  return (
    <Link href="/grupos-economicos" className="stat-card card-hover flex items-center gap-3 group mb-1">
      <div className="w-9 h-9 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
        <Network className="w-5 h-5 text-violet-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          {grupos.length} grupos econômicos entre os fornecedores
        </p>
        <p className="text-xs text-muted-foreground">
          {nEmpresas} empresas dividem os mesmos sócios. Ver a rede de fornecedores.
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-violet-500 transition-colors" />
    </Link>
  );
}
