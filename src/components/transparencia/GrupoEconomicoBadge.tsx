import Link from "next/link";
import { Network } from "lucide-react";
import type { GrupoResumo } from "@/data/gruposApi";

type Props = {
  grupo?: GrupoResumo | null;
  size?: "sm" | "md";
};

/**
 * Selo indicando que a empresa do contrato pertence a um grupo econômico
 * (compartilha sócios com outras fornecedoras). Retorna null silenciosamente
 * quando a empresa não está em nenhum grupo, para não poluir a UI.
 */
export default function GrupoEconomicoBadge({ grupo, size = "sm" }: Props) {
  if (!grupo) return null;
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
  const padding = size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-0.5 text-sm";
  return (
    <Link
      href="/grupos-economicos"
      className={`inline-flex items-center gap-1 rounded-full border font-semibold bg-violet-500/15 text-violet-700 border-violet-500/30 hover:bg-violet-500/25 transition-colors ${padding}`}
      title={`Faz parte de um grupo econômico com ${grupo.n_empresas} empresas que dividem sócios. Ver rede de fornecedores.`}
    >
      <Network className={`${iconSize} text-violet-600`} />
      Grupo econômico
    </Link>
  );
}
