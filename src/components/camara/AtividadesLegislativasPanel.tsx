import Link from "next/link";
import {
  FileText,
  Calendar,
  Gavel,
  Building2,
  ScrollText,
  Users,
} from "lucide-react";
import type { AtividadeLegislativa } from "@/lib/data/atividades-legislativas";

function fmtDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

const TIPO_COR: Record<string, { bg: string; text: string; icon: typeof Gavel }> = {
  "Projeto de Lei do Legislativo": { bg: "bg-emerald-500/15", text: "text-emerald-700", icon: Gavel },
  "Projeto de Lei do Executivo": { bg: "bg-blue-500/15", text: "text-blue-700", icon: Building2 },
  "Projeto de Decreto": { bg: "bg-amber-500/15", text: "text-amber-700", icon: ScrollText },
  "Projeto de Resolução": { bg: "bg-purple-500/15", text: "text-purple-700", icon: FileText },
  "Projeto de Emenda à Lei Orgânica": { bg: "bg-pink-500/15", text: "text-pink-700", icon: FileText },
};

const SITUACAO_COR: Record<string, string> = {
  PROTOCOLADO: "bg-slate-500/15 text-slate-700",
  "EM TRAMITAÇÃO": "bg-amber-500/15 text-amber-700",
  APROVADO: "bg-emerald-500/15 text-emerald-700",
  REJEITADO: "bg-red-500/15 text-red-700",
  ARQUIVADO: "bg-slate-500/15 text-slate-700",
};

type Props = {
  atividades: AtividadeLegislativa[];
  totalGeral?: number;
  variant?: "compact" | "full";
};

export default function AtividadesLegislativasPanel({
  atividades,
  totalGeral,
  variant = "compact",
}: Props) {
  if (atividades.length === 0 && variant === "compact") return null;

  return (
    <section className="stat-card border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
          <Gavel className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground">
            Atividades Legislativas
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
            Projetos de Lei (Legislativo + Executivo), Decretos, Resoluções e
            Emendas com autoria e situação.{" "}
            {totalGeral && (
              <strong>{atividades.length} de {totalGeral} exibidas.</strong>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {atividades.map((a) => {
          const tipoConfig = TIPO_COR[a.ato_tipo] ?? { bg: "bg-slate-500/15", text: "text-slate-700", icon: FileText };
          const Icon = tipoConfig.icon;
          const situacaoCor = a.situacao ? SITUACAO_COR[a.situacao] ?? "bg-slate-500/15 text-slate-700" : "";

          return (
            <article
              key={a.id}
              className="p-3 rounded-lg border border-border bg-background/40 hover:border-emerald-500/30 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${tipoConfig.bg} ${tipoConfig.text}`}>
                    <Icon className="w-3 h-3" />
                    {a.modulo_nome ?? a.ato_tipo}
                  </span>
                  <p className="font-semibold text-foreground text-sm">
                    {a.ato_completo ?? `${a.ato_tipo} ${a.numero}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {a.situacao && (
                    <span className={`text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${situacaoCor}`}>
                      {a.situacao}
                    </span>
                  )}
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {fmtDate(a.data_publicacao)}
                  </p>
                </div>
              </div>
              {a.descricao_texto && (
                <p className="text-sm text-foreground/85 leading-relaxed mt-2">
                  {a.descricao_texto.length > 220
                    ? a.descricao_texto.slice(0, 220) + "..."
                    : a.descricao_texto}
                </p>
              )}
              {(a.autores?.length ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground mt-1 inline-flex items-start gap-1">
                  <Users className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>
                    <strong>Autor{a.autores.length > 1 ? "es" : ""}:</strong>{" "}
                    {a.autoria_executivo
                      ? "Poder Executivo"
                      : a.autores.slice(0, 4).join(", ") + (a.autores.length > 4 ? ` e mais ${a.autores.length - 4}` : "")}
                  </span>
                </p>
              )}
            </article>
          );
        })}
      </div>

      {variant === "compact" && totalGeral && atividades.length < totalGeral && (
        <Link
          href="/transparencia/atividades-legislativas"
          className="block text-center text-sm text-emerald-700 hover:underline pt-2 border-t border-border"
        >
          Ver todas as {totalGeral} atividades →
        </Link>
      )}
    </section>
  );
}
