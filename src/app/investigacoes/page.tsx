import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleHelp,
  ExternalLink,
  Network,
  Search,
  ShieldAlert,
} from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import {
  type CoberturaRegra,
  fetchPainelIndicios,
  type IndicioContratacao,
} from "@/lib/data/indicios-contratacao";

export const metadata = pageMetadata({
  title: "Investigações de contratos públicos de Piracanjuba",
  description:
    "Indícios gerados por cruzamentos de licitações, contratos, aditivos, empenhos, pagamentos, CNPJ, QSA, sanções, fiscais e doações eleitorais.",
  path: "/investigacoes",
});

export const revalidate = 3600;

const REGRA_LABEL: Record<string, string> = {
  ADITIVOS_ELEVADOS: "Aditivos relevantes",
  EMPRESA_RECENTE: "Empresa recente",
  CONCENTRACAO_FORNECEDOR_ORGAO: "Concentração por órgão",
  VENCEDOR_RECORRENTE: "Fornecedor recorrente",
  CONCENTRACAO_FISCAL_FORNECEDOR: "Concentração por fiscal",
  FRACIONAMENTO_POTENCIAL: "Fracionamento potencial",
  REDE_SOCIETARIA_COMPARTILHADA: "Rede societária",
  FORNECEDOR_SANCIONADO: "Fornecedor sancionado",
  SOCIO_DOADOR_COM_EMPRESA_CONTRATADA: "Sócio e doação eleitoral",
};

const SEVERIDADE_STYLE: Record<IndicioContratacao["severidade"], string> = {
  critica: "bg-red-600/15 text-red-700 dark:text-red-300",
  alta: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  media: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  baixa: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  informativa: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};

function formatCnpj(cnpj: string | null) {
  if (!cnpj) return null;
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}

function formatDate(date: string | null) {
  if (!date) return null;
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
}

function formatMetric(value: unknown): string {
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? value.toLocaleString("pt-BR")
      : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function CoverageIcon({ status }: Pick<CoberturaRegra, "status">) {
  if (status === "disponivel") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }
  if (status === "parcial") {
    return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  }
  return <CircleHelp className="h-4 w-4 text-slate-500" />;
}

export default async function InvestigacoesPage() {
  const { indicios, cobertura, resumo } = await fetchPainelIndicios();
  const totalIndicios = resumo.reduce(
    (total, item) => total + Number(item.quantidade),
    0,
  );
  const regras = new Set(resumo.map((item) => item.regra)).size;
  const prioritarios = resumo
    .filter((item) =>
      item.severidade === "alta" || item.severidade === "critica"
    )
    .reduce((total, item) => total + Number(item.quantidade), 0);

  return (
    <div className="container max-w-5xl space-y-6 py-6 md:py-10">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-sm font-medium text-red-700 dark:text-red-300">
          <Search className="h-4 w-4" />
          Cruzamento investigativo
        </div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          Indícios em contratações públicas
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Regras reproduzíveis aplicadas ao encadeamento licitação, contrato,
          aditivo, empenho e pagamento, enriquecido com CNPJ, quadro societário,
          sanções, fiscais, servidores e doações eleitorais.
        </p>
      </header>

      <section className="stat-card border-amber-500/30 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">
              Indício não é prova de corrupção
            </p>
            <p>
              Cada resultado é um convite à verificação documental. Contexto
              administrativo, mercado, legislação aplicável e documentos
              originais podem explicar padrões aparentemente incomuns.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="stat-card">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Indícios ativos
          </p>
          <p className="mt-1 text-2xl font-extrabold text-foreground">
            {totalIndicios}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Regras com resultado
          </p>
          <p className="mt-1 text-2xl font-extrabold text-foreground">
            {regras}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Prioridade alta
          </p>
          <p className="mt-1 text-2xl font-extrabold text-orange-700">
            {prioritarios}
          </p>
        </div>
        <Link
          href="/grupos-economicos"
          className="stat-card card-hover flex flex-col justify-between"
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Grafo societário
          </p>
          <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            Explorar redes <Network className="h-4 w-4" />
          </span>
        </Link>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Cobertura das fontes
          </h2>
          <p className="text-sm text-muted-foreground">
            Limitações são publicadas junto com os resultados.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {cobertura.map((item) => (
            <article key={item.regra} className="stat-card space-y-2">
              <div className="flex items-center gap-2">
                <CoverageIcon status={item.status} />
                <h3 className="text-sm font-semibold text-foreground">
                  {REGRA_LABEL[item.regra] ?? item.regra.replaceAll("_", " ")}
                </h3>
                <span className="ml-auto text-xs font-medium uppercase text-muted-foreground">
                  {item.status}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {item.motivo}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(item.metricas).map(([key, value]) => (
                  <span
                    key={key}
                    className="rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground"
                  >
                    {key.replaceAll("_", " ")}: {formatMetric(value)}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Resultados priorizados
          </h2>
          <p className="text-sm text-muted-foreground">
            Até 200 resultados, ordenados por severidade e score.
          </p>
        </div>

        <div className="space-y-3">
          {indicios.map((indicio) => {
            const firstSource = indicio.fonte_urls.find((url) =>
              url?.startsWith("http")
            );
            return (
              <article key={indicio.chave} className="stat-card space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {REGRA_LABEL[indicio.regra] ??
                        indicio.regra.replaceAll("_", " ")}
                    </p>
                    <h3 className="font-semibold text-foreground">
                      {indicio.titulo}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${SEVERIDADE_STYLE[indicio.severidade]}`}
                    >
                      {indicio.severidade}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground">
                      score {indicio.score}
                    </span>
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground">
                  {indicio.descricao}
                </p>

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {indicio.fornecedor_cnpj && (
                    <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 font-mono">
                      <Building2 className="h-3 w-3" />
                      {formatCnpj(indicio.fornecedor_cnpj)}
                    </span>
                  )}
                  {indicio.contrato_id && (
                    <span className="rounded bg-muted px-2 py-1">
                      contrato {indicio.contrato_id}
                    </span>
                  )}
                  {indicio.periodo_inicio && (
                    <span className="rounded bg-muted px-2 py-1">
                      {formatDate(indicio.periodo_inicio)}
                      {indicio.periodo_fim &&
                        indicio.periodo_fim !== indicio.periodo_inicio &&
                        ` a ${formatDate(indicio.periodo_fim)}`}
                    </span>
                  )}
                </div>

                {firstSource && (
                  <a
                    href={firstSource}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Conferir fonte oficial
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
