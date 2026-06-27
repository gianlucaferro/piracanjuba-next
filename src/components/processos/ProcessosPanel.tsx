import { contestacaoMailto } from "@/lib/contestacao";
import {
  Scale,
  ExternalLink,
  FileText,
  Briefcase,
  Vote,
  Building2,
  Shield,
  Calendar,
  CircleAlert,
  Sparkles,
  Gavel,
  Activity,
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

/** Resumo curto do texto bruto da sentença (corta no primeiro parágrafo). */
function trimSentencaResumo(s: string | null): string | null {
  if (!s) return null;
  const cleaned = s
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  // Pega só os primeiros 280 chars; corta na próxima fronteira de frase.
  if (cleaned.length <= 280) return cleaned;
  const slice = cleaned.slice(0, 280);
  const lastPeriod = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("\n"));
  return (lastPeriod > 100 ? slice.slice(0, lastPeriod + 1) : slice) + "…";
}

function statusLabel(p: ProcessoPublico): { texto: string; cor: string } {
  // Prefere status_predito da Escavador. Cai pro nosso status genérico.
  const sp = (p.status_predito ?? "").toUpperCase();
  if (sp === "ATIVO") return { texto: "Ativo", cor: "bg-amber-500/15 text-amber-700" };
  if (sp === "INATIVO") return { texto: "Encerrado", cor: "bg-emerald-500/15 text-emerald-700" };
  if (p.status === "ativo") return { texto: "Ativo", cor: "bg-amber-500/15 text-amber-700" };
  if (p.status) return { texto: STATUS_LABEL[p.status] ?? p.status, cor: "bg-emerald-500/15 text-emerald-700" };
  return { texto: "Sem status", cor: "bg-muted text-muted-foreground" };
}

export default function ProcessosPanel({
  processos,
  nomePessoa,
  ultimaAtualizacao,
}: Props) {
  const totalAtivos = processos.filter(
    (p) => (p.status_predito ?? "").toUpperCase() === "ATIVO" || p.status === "ativo",
  ).length;
  const totalCriminais = processos.filter((p) => p.tipo_categoria === "criminal").length;
  const totalComSentenca = processos.filter((p) => p.tem_sentenca).length;
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
            <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
              Nenhum processo público encontrado para {nomePessoa} via
              Escavador.
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
          <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
            {processos.length} processo{processos.length > 1 ? "s" : ""} público
            {processos.length > 1 ? "s" : ""} de {nomePessoa}
            {totalAtivos > 0 && (
              <>
                {" "}
                · <strong className="text-amber-700">{totalAtivos} ativo{totalAtivos > 1 ? "s" : ""}</strong>
              </>
            )}
            {totalComSentenca > 0 && (
              <>
                {" "}
                · <strong className="text-blue-700">{totalComSentenca} com sentença</strong>
              </>
            )}
            {totalCriminais > 0 && (
              <>
                {" "}
                · <strong className="text-red-600">{totalCriminais} {totalCriminais === 1 ? "criminal" : "criminais"}</strong>
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
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {TIPO_LABEL[s.tipo] || s.tipo}
                  </p>
                </div>
                <p className="text-xl font-extrabold text-foreground">{s.total}</p>
                {s.ativos > 0 && (
                  <p className="text-xs text-amber-700 font-semibold">
                    {s.ativos} ativo{s.ativos > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lista de processos */}
      <div className="space-y-3">
        {processos.map((p) => {
          const Icon = p.tipo_categoria ? TIPO_ICON[p.tipo_categoria] || FileText : FileText;
          const cor = p.tipo_categoria ? TIPO_COR[p.tipo_categoria] || "text-slate-500" : "text-slate-500";
          const { texto: statusTxt, cor: statusCor } = statusLabel(p);
          const isAtivo = statusTxt === "Ativo";
          const sentencaTrim = trimSentencaResumo(p.sentenca_resumo);

          return (
            <article
              key={p.id}
              className={`p-4 rounded-xl border ${
                isAtivo
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-border bg-background/40"
              }`}
            >
              {/* Header: tipo, polo, status, num movs */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={`inline-flex items-center gap-1 text-xs uppercase font-bold tracking-wider ${cor}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {p.tipo_categoria ? TIPO_LABEL[p.tipo_categoria] : "—"}
                </span>
                {p.polo && (
                  <span className="text-xs uppercase font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                    {p.polo}
                  </span>
                )}
                <span
                  className={`text-xs uppercase font-semibold px-1.5 py-0.5 rounded ${statusCor}`}
                >
                  {statusTxt}
                </span>
                {p.tem_sentenca && (
                  <span className="inline-flex items-center gap-1 text-xs uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700">
                    <Gavel className="w-3 h-3" /> Sentença
                  </span>
                )}
                {p.quantidade_movimentacoes !== null && p.quantidade_movimentacoes > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs uppercase font-semibold text-muted-foreground">
                    <Activity className="w-3 h-3" />
                    {p.quantidade_movimentacoes} mov.
                    {p.quantidade_movimentacoes >= 50 ? "+" : ""}
                  </span>
                )}
              </div>

              {/* Numero CNJ */}
              {p.numero_processo && (
                <p className="text-sm font-mono text-foreground/85 break-all mb-1">
                  {p.numero_processo}
                </p>
              )}

              {/* Classe + assunto */}
              {p.classe && (
                <p className="text-sm text-muted-foreground mb-2">
                  {p.classe}
                  {p.assunto && p.assunto !== p.classe && ` · ${p.assunto}`}
                </p>
              )}

              {/* RESUMO IA — destaque principal */}
              {p.resumo_ia && (
                <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="inline-flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-primary mb-1.5">
                    <Sparkles className="w-3 h-3" />
                    Resumo do processo
                  </p>
                  <p className="text-[13px] text-foreground leading-relaxed">
                    {p.resumo_ia}
                  </p>
                </div>
              )}

              {/* SENTENÇA — se houver */}
              {p.tem_sentenca && sentencaTrim && (
                <div className="mt-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                  <p className="inline-flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-blue-700 mb-1.5">
                    <Gavel className="w-3 h-3" />
                    Decisão/Sentença
                  </p>
                  <p className="text-[12px] text-foreground/85 leading-relaxed">
                    {sentencaTrim}
                  </p>
                </div>
              )}

              {/* Movimentação recente */}
              {p.movimentacao_recente && (
                <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  <span className="font-semibold">Última atividade:</span>{" "}
                  {p.movimentacao_recente}
                </p>
              )}

              {/* Meta: tribunal + datas */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
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
            </article>
          );
        })}
      </div>

      <Disclaimer ultimaAtualizacao={ultimaAtualizacao} />
    </section>
  );
}

function Disclaimer({ ultimaAtualizacao }: { ultimaAtualizacao?: string | null }) {
  return (
    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-muted-foreground leading-relaxed">
      <p className="font-semibold text-foreground inline-flex items-center gap-1 mb-1">
        <CircleAlert className="w-3.5 h-3.5 text-blue-600" />
        Sobre estes dados
      </p>
      <p>
        Lista consultada via <strong>Escavador</strong> (API oficial integrada
        ao Datajud/CNJ e bases públicas dos tribunais brasileiros). Os resumos
        são gerados por IA (Gemini 2.5) com base nas movimentações públicas.
        Filtros aplicados automaticamente: processos em segredo de justiça,
        ações de família, e casos onde a pessoa figura como vítima/testemunha
        ou atua <strong>apenas como advogado</strong> de terceiros (não como
        parte) <strong>NÃO</strong> são exibidos.
      </p>
      {ultimaAtualizacao && (
        <p className="mt-1">
          Última atualização: <strong>{fmtDateTime(ultimaAtualizacao)}</strong>.
          Atualizações trimestrais automáticas (janeiro / abril / julho /
          outubro).
        </p>
      )}
      <p className="mt-1">
        Encontrou imprecisão?{" "}
        <a
          href={contestacaoMailto()}
          className="underline hover:text-foreground inline-flex items-center gap-0.5"
        >
          Solicitar revisão <ExternalLink className="w-3 h-3" />
        </a>
      </p>
    </div>
  );
}
