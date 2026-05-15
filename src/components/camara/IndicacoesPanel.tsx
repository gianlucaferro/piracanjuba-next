import Link from "next/link";
import { Megaphone, Calendar, CircleAlert } from "lucide-react";
import type { IndicacaoCamara } from "@/lib/data/indicacoes-camara";

function fmtDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

type Props = {
  indicacoes: IndicacaoCamara[];
  /** total geral, pra mostrar "X de Y" */
  totalGeral?: number;
  /** variante: 'compact' (perfil vereador) ou 'full' (página dedicada) */
  variant?: "compact" | "full";
};

export default function IndicacoesPanel({
  indicacoes,
  totalGeral,
  variant = "compact",
}: Props) {
  if (indicacoes.length === 0 && variant === "compact") return null;

  return (
    <section className="stat-card border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
          <Megaphone className="w-5 h-5 text-violet-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground">Indicações</h3>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            Pedidos ao Executivo (sem força de lei).{" "}
            {totalGeral && (
              <>
                <strong>{indicacoes.length} de {totalGeral}</strong> exibidas.
              </>
            )}
            {!totalGeral && indicacoes.length > 0 && (
              <strong>{indicacoes.length} indicações.</strong>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {indicacoes.map((i) => (
          <div key={i.id} className="p-3 rounded-lg border border-border bg-background/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-violet-700">{i.numero}</p>
              <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {fmtDate(i.data_publicacao)}
              </p>
            </div>
            {i.ementa && (
              <p className="text-xs text-foreground/85 leading-relaxed mt-1">
                {i.ementa}
              </p>
            )}
          </div>
        ))}
      </div>

      {variant === "compact" && totalGeral && indicacoes.length < totalGeral && (
        <Link
          href="/transparencia/indicacoes"
          className="block text-center text-xs text-violet-700 hover:underline pt-2 border-t border-border"
        >
          Ver todas as {totalGeral} indicações →
        </Link>
      )}

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-2 text-[10px] text-muted-foreground leading-relaxed">
        <p className="inline-flex items-center gap-1">
          <CircleAlert className="w-3 h-3 text-blue-600" />
          Indicação = pedido ao Executivo sem força de lei. Atualização semanal
          via portal LAI Centi.
        </p>
      </div>
    </section>
  );
}
