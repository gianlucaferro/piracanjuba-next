import { ShieldCheck, ShieldAlert, ShieldOff, AlertTriangle } from "lucide-react";

type Situacao = string | null | undefined;

type Props = {
  situacao: Situacao;
  razaoSocial?: string | null;
  cnae?: string | null;
  showLabel?: boolean;
  size?: "sm" | "md";
};

function getStyle(situacao: Situacao) {
  const s = (situacao ?? "").toUpperCase();
  if (s === "ATIVA") {
    return {
      icon: ShieldCheck,
      label: "ATIVA",
      colorClass: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
      iconColor: "text-emerald-600",
    };
  }
  if (s === "BAIXADA") {
    return {
      icon: ShieldOff,
      label: "BAIXADA",
      colorClass: "bg-red-500/15 text-red-700 border-red-500/30",
      iconColor: "text-red-600",
    };
  }
  if (s === "INAPTA") {
    return {
      icon: AlertTriangle,
      label: "INAPTA",
      colorClass: "bg-orange-500/15 text-orange-700 border-orange-500/30",
      iconColor: "text-orange-600",
    };
  }
  if (s === "SUSPENSA") {
    return {
      icon: ShieldAlert,
      label: "SUSPENSA",
      colorClass: "bg-amber-500/15 text-amber-700 border-amber-500/30",
      iconColor: "text-amber-600",
    };
  }
  return null;
}

/**
 * Badge de situação cadastral da empresa (BrasilAPI + ReceitaWS).
 * Retorna null silenciosamente quando não há dados (não polui UI).
 */
export default function SituacaoCadastralBadge({
  situacao,
  razaoSocial,
  cnae,
  showLabel = true,
  size = "sm",
}: Props) {
  const style = getStyle(situacao);
  if (!style) return null;

  const Icon = style.icon;
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
  const padding = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${style.colorClass} ${padding}`}
      title={[razaoSocial, cnae].filter(Boolean).join(" — ")}
    >
      <Icon className={`${iconSize} ${style.iconColor}`} />
      {showLabel && style.label}
    </span>
  );
}
