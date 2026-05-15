import Link from "next/link";
import {
  Scale,
  ExternalLink,
  AlertTriangle,
  FileText,
  Briefcase,
  Vote,
  Building2,
  Shield,
  Calendar,
  CircleAlert,
} from "lucide-react";
import type { ProcessoPublico } from "@/lib/data/processos-publicos";
import { agregarPorTipo } from "@/lib/data/processos-publicos";

type Props = {
  processos: ProcessoPublico[];
  nomePessoa: string;
  ultimaAtualizacao: string | null;
};

const TIPO_LABEL: Record<string, string> = {
  civel: "Cível",
  criminal: "Criminal",
  trabalhista: "Trabalhista",
  eleitoral: "Eleitoral",
  tributario: "Tributário",
  administrativo: "Administrativo",
  outro: "Outro",
};

const TIPO_ICON: Record<string, typeof Scale> = {
  civel: Scale,
  criminal: Shield,
  trabalhista: Briefcase,
  eleitoral: Vote,
  tributario: Building2,
  administrativo: FileText,
  outro: FileText,
};

const TIPO_COR: Record<string, string> = {
  civel: "text-blue-600",
  criminal: "text-red-600",
  trabalhista: "text-amber-600",
  eleitoral: "text-purple-600",
  tributario: "text-emerald-600",
  administrativo: "text-slate-600",
  outro: "text-slate-500",
};

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  arquivado: "Arquivado",
  baixado: "Baixado",
  suspenso: "Suspenso",
  julgado: "Julgado",
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

function fmtDateTime(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

export default function ProcessosPanel({
  processos,
  nomePessoa,
  ultimaAtualizacao,
}: Props) {
  const totalAtivos = processos.filter((p) => p.status === "ativo").length;
  const totalCriminais = processos.filter((p) => p.tipo_categoria === "criminal").length;
  const stats = agregarPorTipo(processos);

  if (processos.length === 0) {
    return (
      <section className="stat-card border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">
              Processos Judiciais
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
              Nenhum processo público encontrado para {nomePessoa} via BigData
              Corp.
              {ultimaAtualizacao && (
                <span className="block mt-1">
                  Última consulta: {fmtDateTime(ultimaAtualizacao)}
                </span>
              )}
            </p>
          </div>
        </div>
        <Disclaimer />
      </section>
    );
  }

  return (
    <section className="stat-card border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <Scale className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground">
            Processos Judiciais
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            {processos.length} processo{processos.length > 1 ? "s" : ""} público
            {processos.length > 1 ? "s" : ""} de {nomePessoa}
            {totalAtivos > 0 && (
              <>
                {" "}
                · <strong className="text-amber-700">{totalAtivos} ativo{totalAtivos > 1 ? "s" : ""}</strong>
              </>
            )}
            {totalCriminais > 0 && (
              <>
                {" "}
                · <strong className="text-red-600">{totalCriminais} criminal{totalCriminais > 1 ? "is" : ""}</strong>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Stats por tipo */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {stats.map((s) => {
            const Icon = TIPO_ICON[s.tipo] || FileText;
            return (
              <div key={s.tipo} className="stat-card p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${TIPO_COR[s.tipo] || "text-slate-500"}`} />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {TIPO_LABEL[s.tipo] || s.tipo}
                  </p>
                </div>
                <p className="text-xl font-extrabold text-foreground">{s.total}</p>
                {s.ativos > 0 && (
                  <p className="text-[10px] text-amber-700 font-semibold">
                    {s.ativos} ativo{s.ativos > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lista de processos */}
      <div className="space-y-2">
        {processos.map((p) => {
          const Icon = p.tipo_categoria ? TIPO_ICON[p.tipo_categoria] || FileText : FileText;
          const cor = p.tipo_categoria ? TIPO_COR[p.tipo_categoria] || "text-slate-500" : "text-slate-500";
          const isAtivo = p.status === "ativo";
          return (
            <div
              key={p.id}
              className={`p-3 rounded-lg border ${
                isAtivo ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-background/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-4 h-4 ${cor} shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${cor}`}>
                      {p.tipo_categoria ? TIPO_LABEL[p.tipo_categoria] : "—"}
                    </span>
                    {p.polo && (
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                        {p.polo}
                      </span>
                    )}
                    {p.status && (
                      <span
                        className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                          isAtivo
                            ? "bg-amber-500/15 text-amber-700"
                            : "bg-emerald-500/15 text-emerald-700"
                        }`}
                      >
                        {STATUS_LABEL[p.status] || p.status}
                      </span>
                    )}
                  </div>
                  {p.numero_processo && (
                    <p className="text-sm font-mono text-foreground/85 break-all">
                      {p.numero_processo}
                    </p>
                  )}
                  {p.classe && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.classe}
                      {p.assunto && p.assunto !== p.classe && ` · ${p.assunto}`}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
                    {p.tribunal && (
                      <span>
                        🏛️ {p.tribunal}
                        {p.comarca && ` · ${p.comarca}`}
                      </span>
                    )}
                    {p.data_distribuicao && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Distribuído: {fmtDate(p.data_distribuicao)}
                      </span>
                    )}
                    {p.data_ultima_movimentacao && (
                      <span>
                        Última mov.: {fmtDate(p.data_ultima_movimentacao)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Disclaimer ultimaAtualizacao={ultimaAtualizacao} />
    </section>
  );
}

function Disclaimer({ ultimaAtualizacao }: { ultimaAtualizacao?: string | null }) {
  return (
    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-[11px] text-muted-foreground leading-relaxed">
      <p className="font-semibold text-foreground inline-flex items-center gap-1 mb-1">
        <CircleAlert className="w-3.5 h-3.5 text-blue-600" />
        Sobre estes dados
      </p>
      <p>
        Lista consultada via <strong>BigData Corp</strong> em bases públicas de
        tribunais brasileiros. Filtros aplicados automaticamente: processos em
        segredo de justiça, ações de família e quando a pessoa figura como
        vítima ou testemunha <strong>NÃO</strong> são exibidos.
      </p>
      {ultimaAtualizacao && (
        <p className="mt-1">
          Última atualização: <strong>{fmtDateTime(ultimaAtualizacao)}</strong>.
          Atualizações bimestrais automáticas.
        </p>
      )}
      <p className="mt-1">
        Encontrou imprecisão?{" "}
        <Link
          href="/contato?assunto=processos-publicos"
          className="underline hover:text-foreground inline-flex items-center gap-0.5"
        >
          Solicitar revisão <ExternalLink className="w-3 h-3" />
        </Link>
      </p>
    </div>
  );
}
