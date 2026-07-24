"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  Building2,
  CalendarRange,
  CheckCircle2,
  CircleDollarSign,
  Database,
  ExternalLink,
  FileWarning,
  Landmark,
  Loader2,
  RefreshCw,
  Scale,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchFunprepiDashboard } from "@/data/funprepiApi";
import {
  calcularVariacaoPercentual,
  FUNPREPI_PORTAL_HISTORICO_URL,
  FUNPREPI_PORTAL_URL,
  FUNPREPI_TCM_URL,
  type FunprepiCoberturaStatus,
} from "@/lib/funprepi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const CATEGORIAS: Record<string, { label: string; cor: string }> = {
  aposentadorias: { label: "Aposentadorias", cor: "#2563eb" },
  pensoes: { label: "Pensões", cor: "#7c3aed" },
  tarifas: { label: "Tarifas bancárias", cor: "#f59e0b" },
  fornecedores_externos: { label: "Fornecedores externos", cor: "#e11d48" },
  fornecedor_externo: { label: "Fornecedores externos", cor: "#e11d48" },
  outros: { label: "Outros lançamentos", cor: "#64748b" },
};

const COBERTURA: Record<
  FunprepiCoberturaStatus,
  { label: string; classe: string; descricao: string }
> = {
  reconciliado: {
    label: "Reconciliado",
    classe: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
    descricao: "Quantidade e valor pago conferem entre as duas fontes.",
  },
  parcial: {
    label: "Carga parcial",
    classe: "border-amber-500/30 bg-amber-500/10 text-amber-700",
    descricao: "O portal novo ainda tem menos registros do que a referência histórica.",
  },
  divergente: {
    label: "Divergente",
    classe: "border-red-500/30 bg-red-500/10 text-red-700",
    descricao: "As fontes têm a mesma cobertura aparente, mas os totais não conferem.",
  },
  ausente: {
    label: "Ausente",
    classe: "border-slate-500/30 bg-slate-500/10 text-slate-600",
    descricao: "O exercício ainda não foi carregado na base nova.",
  },
  sem_referencia: {
    label: "Sem referência",
    classe: "border-blue-500/30 bg-blue-500/10 text-blue-700",
    descricao: "Há dados novos, mas ainda não existe fotografia histórica para comparar.",
  },
};

function moeda(valor: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number(valor) || 0);
}

function moedaCompacta(valor: number | null | undefined) {
  const numero = Number(valor) || 0;
  if (Math.abs(numero) >= 1_000_000_000) {
    return `R$ ${(numero / 1_000_000_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })} bi`;
  }
  if (Math.abs(numero) >= 1_000_000) {
    return `R$ ${(numero / 1_000_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })} mi`;
  }
  if (Math.abs(numero) >= 1_000) {
    return `R$ ${(numero / 1_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 0,
    })} mil`;
  }
  return moeda(numero);
}

function dataBr(data: string | null | undefined) {
  if (!data) return "não informada";
  return new Date(`${data.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

function documentoBr(documento: string | null) {
  if (!documento) return "Documento não informado";
  const digitos = documento.replace(/\D/g, "");
  if (digitos.length === 14) {
    return digitos.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5",
    );
  }
  return "Pessoa física";
}

function tituloCategoria(categoria: string) {
  return CATEGORIAS[categoria]?.label ?? categoria;
}

function Kpi({
  titulo,
  valor,
  detalhe,
  icon: Icon,
  destaque,
}: {
  titulo: string;
  valor: string;
  detalhe: string;
  icon: React.ElementType;
  destaque?: "blue" | "amber" | "emerald" | "slate";
}) {
  const cores = {
    blue: "bg-blue-500/10 text-blue-700",
    amber: "bg-amber-500/10 text-amber-700",
    emerald: "bg-emerald-500/10 text-emerald-700",
    slate: "bg-slate-500/10 text-slate-700",
  };
  return (
    <article className="stat-card min-w-0">
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${
          cores[destaque ?? "blue"]
        }`}
      >
        <Icon className="h-4.5 w-4.5" aria-hidden />
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {titulo}
      </p>
      <p className="mt-1 break-words text-xl font-bold text-foreground">{valor}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detalhe}</p>
    </article>
  );
}

function GraficoVazio({ texto }: { texto: string }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-border">
      <p className="max-w-sm px-6 text-center text-sm text-muted-foreground">
        {texto}
      </p>
    </div>
  );
}

function FonteLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
    >
      {children}
      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
    </a>
  );
}

export default function FunprepiTab() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["funprepi-dashboard"],
    queryFn: fetchFunprepiDashboard,
    staleTime: 10 * 60 * 1000,
  });

  const metricas = useMemo(() => {
    if (!data) return null;
    const totalReferencia = data.serie_anual.reduce(
      (soma, item) => soma + Number(item.pago_referencia || 0),
      0,
    );
    const reconciliados = data.serie_anual.filter(
      (item) => item.status === "reconciliado",
    ).length;
    const variacao = calcularVariacaoPercentual(
      data.resumo.pago_periodo_atual,
      data.resumo.pago_periodo_anterior,
    );
    return { totalReferencia, reconciliados, variacao };
  }, [data]);

  const serieAnual = useMemo(
    () =>
      (data?.serie_anual ?? []).map((item) => ({
        ...item,
        anoLabel:
          item.ano === data?.ano_atual
            ? `${item.ano}*`
            : String(item.ano),
        pago_novo_grafico: item.empenhos_novo > 0 ? item.pago_novo : null,
      })),
    [data],
  );

  const serieMensal = useMemo(
    () =>
      (data?.serie_mensal ?? []).map((item) => ({
        ...item,
        mesLabel: MESES[item.mes - 1] ?? String(item.mes),
      })),
    [data],
  );

  const composicao = useMemo(
    () =>
      (data?.composicao ?? [])
        .filter((item) => Number(item.valor) > 0)
        .map((item) => ({
          ...item,
          nome: tituloCategoria(item.categoria),
          cor: CATEGORIAS[item.categoria]?.cor ?? "#64748b",
        })),
    [data],
  );

  const fornecedoresGrafico = useMemo(
    () =>
      (data?.fornecedores_externos ?? []).slice(0, 8).map((item) => ({
        ...item,
        nomeCurto:
          item.nome.length > 31 ? `${item.nome.slice(0, 29)}…` : item.nome,
      })),
    [data],
  );

  if (isLoading) {
    return (
      <div className="space-y-5" aria-label="Carregando painel do FUNPREPI">
        <div className="stat-card h-44 animate-pulse" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="stat-card h-36 animate-pulse" />
          ))}
        </div>
        <div className="stat-card h-80 animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="stat-card flex flex-col items-center py-12 text-center">
        <AlertCircle className="mb-3 h-9 w-9 text-destructive" aria-hidden />
        <h2 className="font-semibold text-foreground">
          Não foi possível carregar o painel do FUNPREPI
        </h2>
        <p className="mt-1 max-w-lg text-sm text-muted-foreground">
          A consulta agregada falhou. Os dados oficiais permanecem disponíveis nos
          portais de origem.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!data || !metricas) {
    return (
      <div className="stat-card py-12 text-center">
        <Database className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
        <h2 className="font-semibold text-foreground">Painel sem dados</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A função de leitura respondeu sem registros utilizáveis.
        </p>
      </div>
    );
  }

  const variacaoPositiva =
    metricas.variacao !== null && metricas.variacao >= 0;
  const VariacaoIcon = variacaoPositiva ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="text-xl font-bold text-foreground">
              FUNPREPI, previdência dos servidores municipais
            </h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Painel do Fundo de Previdência Social de Piracanjuba. Separa benefícios
            pagos, despesas administrativas, déficit atuarial e a dívida da Prefeitura,
            porque esses valores possuem significados diferentes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">Órgão 44</Badge>
          <Badge variant="outline">
            Atualizado em {dataBr(data.atualizado_em)}
          </Badge>
          {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-background">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.3fr_0.7fr] lg:p-6">
          <div>
            <div className="flex items-center gap-2 text-amber-700">
              <ShieldAlert className="h-5 w-5" aria-hidden />
              <p className="text-sm font-semibold uppercase tracking-wide">
                Dívida da Prefeitura com o FUNPREPI
              </p>
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">
              Saldo atual não publicado em fonte oficial
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              O TCM-GO confirmou que o Município discutia aportes periódicos,
              contribuição suplementar e plano de amortização para cobrir déficit
              atuarial. O acórdão não informa o saldo atual da dívida, por isso este
              painel não estima nem reproduz valores sem documento e data-base.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <FonteLink href={FUNPREPI_TCM_URL}>
                Ler o Acórdão Consulta 15/2019
              </FonteLink>
              <FonteLink href={FUNPREPI_PORTAL_URL}>
                Consultar o portal atual
              </FonteLink>
            </div>
          </div>
          <aside className="rounded-xl border border-amber-500/20 bg-background/70 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              O que já é possível afirmar
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                Existe confirmação documental de déficit atuarial.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                O Município consultou o TCM-GO sobre formas de amortização.
              </li>
              <li className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                Falta avaliação recente com saldo, data-base e cronograma.
              </li>
            </ul>
          </aside>
        </div>
      </section>

      <section
        aria-label="Indicadores principais do FUNPREPI"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Kpi
          titulo="Série histórica oficial"
          valor={moedaCompacta(metricas.totalReferencia)}
          detalhe="Valores pagos publicados no portal histórico, de 2011 a jun/2026."
          icon={CircleDollarSign}
          destaque="blue"
        />
        <Kpi
          titulo="Carga nova sincronizada"
          valor={moedaCompacta(data.resumo.pago)}
          detalhe={`${data.resumo.empenhos.toLocaleString("pt-BR")} empenhos do órgão 44 já carregados.`}
          icon={Database}
          destaque="slate"
        />
        <Kpi
          titulo={`Pago em ${data.ano_atual ?? "ano atual"}`}
          valor={moedaCompacta(data.resumo.pago_periodo_atual)}
          detalhe={
            metricas.variacao === null
              ? "Sem base suficiente para comparar o mesmo período."
              : `${metricas.variacao >= 0 ? "+" : ""}${metricas.variacao.toLocaleString(
                  "pt-BR",
                  { maximumFractionDigits: 2 },
                )}% contra o mesmo intervalo da carga anterior.`
          }
          icon={VariacaoIcon}
          destaque={variacaoPositiva ? "amber" : "emerald"}
        />
        <Kpi
          titulo="Exercícios reconciliados"
          valor={`${metricas.reconciliados} de ${data.serie_anual.length}`}
          detalhe="Quantidade de empenhos e valor pago conferem entre as duas fontes."
          icon={BookOpenCheck}
          destaque="emerald"
        />
      </section>

      <section className="stat-card">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
              Pagamentos anuais e situação da sincronização
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Barras mostram o portal histórico. A linha mostra o que já chegou à
              base nova. O asterisco identifica exercício parcial.
            </p>
          </div>
          <Badge variant="outline">
            {dataBr(data.periodo_inicio)} a {dataBr(data.periodo_fim)}
          </Badge>
        </div>
        {serieAnual.length > 0 ? (
          <>
            <div className="h-80 min-w-0" role="img" aria-label="Gráfico de pagamentos anuais do FUNPREPI">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <ComposedChart
                  data={serieAnual}
                  margin={{ top: 8, right: 12, bottom: 4, left: 2 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="anoLabel" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(valor) => moedaCompacta(Number(valor)).replace("R$ ", "")}
                    width={54}
                  />
                  <Tooltip
                    formatter={(valor, nome) => [
                      moeda(Number(valor)),
                      nome === "pago_referencia"
                        ? "Portal histórico"
                        : "Portal novo",
                    ]}
                    labelFormatter={(label) => `Exercício ${label}`}
                  />
                  <Legend
                    formatter={(valor) =>
                      valor === "pago_referencia"
                        ? "Portal histórico"
                        : "Portal novo sincronizado"
                    }
                  />
                  <Bar
                    dataKey="pago_referencia"
                    fill="#93c5fd"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                  <Line
                    type="monotone"
                    dataKey="pago_novo_grafico"
                    stroke="#1d4ed8"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">
                  Reconciliação anual entre o portal histórico e o portal novo
                </caption>
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Ano</th>
                    <th className="px-2 py-2 font-medium">Situação</th>
                    <th className="px-2 py-2 text-right font-medium">Empenhos antigos</th>
                    <th className="px-2 py-2 text-right font-medium">Empenhos novos</th>
                    <th className="px-2 py-2 text-right font-medium">Pago histórico</th>
                    <th className="px-2 py-2 text-right font-medium">Pago novo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.serie_anual.map((item) => {
                    const status = COBERTURA[item.status];
                    return (
                      <tr key={item.ano} className="border-b border-border/60">
                        <td className="px-2 py-2.5 font-semibold text-foreground">
                          {item.ano}
                          {item.ano === data.ano_atual ? "*" : ""}
                        </td>
                        <td className="px-2 py-2.5">
                          <span
                            title={status.descricao}
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${status.classe}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-right text-muted-foreground">
                          {item.empenhos_referencia.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-2 py-2.5 text-right text-muted-foreground">
                          {item.empenhos_novo.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-2 py-2.5 text-right font-medium text-foreground">
                          {moeda(item.pago_referencia)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-medium text-foreground">
                          {item.empenhos_novo > 0 ? moeda(item.pago_novo) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <GraficoVazio texto="Não há série anual disponível." />
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-5">
        <article className="stat-card xl:col-span-3">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <CalendarRange className="h-4 w-4 text-primary" aria-hidden />
            Pagamentos mensais em {data.ano_atual ?? "ano atual"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Composição dos registros já sincronizados no exercício corrente.
          </p>
          {serieMensal.length > 0 ? (
            <>
              <div className="mt-4 h-72 min-w-0" role="img" aria-label="Pagamentos mensais por categoria">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={serieMensal} margin={{ top: 8, right: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      width={52}
                      tickFormatter={(valor) =>
                        moedaCompacta(Number(valor)).replace("R$ ", "")
                      }
                    />
                    <Tooltip formatter={(valor, nome) => [moeda(Number(valor)), tituloCategoria(String(nome))]} />
                    <Legend formatter={(valor) => tituloCategoria(valor)} />
                    {[
                      "aposentadorias",
                      "pensoes",
                      "tarifas",
                      "fornecedores_externos",
                      "outros",
                    ].map((categoria) => (
                      <Bar
                        key={categoria}
                        dataKey={categoria}
                        stackId="pagamentos"
                        fill={CATEGORIAS[categoria].cor}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {serieMensal.map((item) => (
                  <div key={item.mes} className="rounded-lg bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">
                      {MESES[item.mes - 1]}
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {moedaCompacta(
                        item.aposentadorias +
                          item.pensoes +
                          item.tarifas +
                          item.fornecedores_externos +
                          item.outros,
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-4">
              <GraficoVazio texto="Sem pagamentos mensais no exercício mais recente." />
            </div>
          )}
        </article>

        <article className="stat-card xl:col-span-2">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <WalletCards className="h-4 w-4 text-primary" aria-hidden />
            Composição da carga canônica
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            O próprio fundo representa folhas agregadas, não fornecedor concentrado.
          </p>
          {composicao.length > 0 ? (
            <>
              <div className="mt-4 h-60 min-w-0" role="img" aria-label="Composição dos pagamentos do FUNPREPI">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={composicao}
                      dataKey="valor"
                      nameKey="nome"
                      innerRadius={48}
                      outerRadius={82}
                      paddingAngle={2}
                    >
                      {composicao.map((item) => (
                        <Cell key={item.categoria} fill={item.cor} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(valor) => moeda(Number(valor))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {composicao.map((item) => (
                  <li
                    key={item.categoria}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.cor }}
                      />
                      <span className="truncate">{item.nome}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-foreground">
                      {moedaCompacta(item.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="mt-4">
              <GraficoVazio texto="Sem composição disponível." />
            </div>
          )}
        </article>
      </section>

      <section className="stat-card">
        <div className="mb-4">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <Building2 className="h-4 w-4 text-primary" aria-hidden />
            Fornecedores externos
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranking exclui o próprio FUNPREPI e consolida nomes pelo documento quando
            disponível.
          </p>
        </div>
        {fornecedoresGrafico.length > 0 ? (
          <>
            <div
              className="min-w-0"
              style={{ height: Math.max(260, fornecedoresGrafico.length * 45) }}
              role="img"
              aria-label="Ranking de fornecedores externos do FUNPREPI"
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={fornecedoresGrafico}
                  layout="vertical"
                  margin={{ top: 4, right: 28, bottom: 4, left: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(valor) =>
                      moedaCompacta(Number(valor)).replace("R$ ", "")
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="nomeCurto"
                    width={210}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(valor) => moeda(Number(valor))}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.nome ?? "Fornecedor"
                    }
                  />
                  <Bar
                    dataKey="valor_pago"
                    name="Valor pago"
                    fill="#e11d48"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {data.fornecedores_externos.slice(0, 10).map((fornecedor, index) => (
                <article
                  key={fornecedor.chave}
                  className="rounded-xl border border-border bg-muted/20 p-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug text-foreground">
                        {fornecedor.nome}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {documentoBr(fornecedor.documento)} · {fornecedor.empenhos} empenho
                        {fornecedor.empenhos === 1 ? "" : "s"} · {fornecedor.primeiro_ano} a{" "}
                        {fornecedor.ultimo_ano}
                      </p>
                      <p className="mt-1 text-sm font-bold text-rose-700">
                        {moeda(fornecedor.valor_pago)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <GraficoVazio texto="Nenhum fornecedor externo identificado na carga disponível." />
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="stat-card">
          <div className="mb-4">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <FileWarning className="h-4 w-4 text-amber-600" aria-hidden />
              Trilhas que merecem verificação
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Regras automáticas priorizam documentos para leitura humana.
            </p>
          </div>
          {data.indicios.length > 0 ? (
            <div className="space-y-3">
              {data.indicios.map((indicio) => (
                <article
                  key={indicio.chave}
                  className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      {indicio.titulo}
                    </h4>
                    <Badge
                      variant="outline"
                      className={
                        indicio.severidade === "alta"
                          ? "border-red-500/30 bg-red-500/10 text-red-700"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700"
                      }
                    >
                      {indicio.severidade} · score {indicio.score}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {indicio.descricao}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    {indicio.contrato_id && (
                      <span className="text-muted-foreground">
                        Contrato ID {indicio.contrato_id}
                      </span>
                    )}
                    {indicio.fonte_urls.map((url) => (
                      <FonteLink key={url} href={url}>
                        Fonte oficial
                      </FonteLink>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <GraficoVazio texto="Nenhum indício específico do órgão 44 está ativo na base." />
          )}
          <div className="mt-4 flex gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <Scale className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              Indício não é prova. Uma regra pode refletir erro de preenchimento,
              agregação do portal ou documento ainda não vinculado.
            </p>
          </div>
        </article>

        <article className="stat-card">
          <div className="mb-4">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <BookOpenCheck className="h-4 w-4 text-primary" aria-hidden />
              Evidências documentais
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              O que está documentado e o que permanece como lacuna pública.
            </p>
          </div>
          <div className="space-y-3">
            {data.evidencias.map((evidencia) => (
              <article
                key={evidencia.chave}
                className="rounded-xl border border-border bg-muted/20 p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      evidencia.situacao === "nao_publicado"
                        ? "bg-amber-500/10 text-amber-700"
                        : "bg-emerald-500/10 text-emerald-700"
                    }`}
                  >
                    {evidencia.situacao === "nao_publicado" ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      {evidencia.titulo}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {evidencia.orgao_emissor} · referência{" "}
                      {dataBr(evidencia.data_referencia)}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {evidencia.descricao}
                    </p>
                    <p className="mt-3 text-xs">
                      <FonteLink href={evidencia.fonte_url}>
                        Abrir documento ou fonte
                      </FonteLink>
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="stat-card">
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          <Building2 className="h-4 w-4 text-primary" aria-hidden />
          Contratos associados ao FUNPREPI
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Registros do portal novo, ordenados pelos exercícios mais recentes disponíveis.
        </p>
        {data.contratos.length > 0 ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {data.contratos.map((contrato) => (
              <article
                key={contrato.id}
                className="rounded-xl border border-border bg-muted/20 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {contrato.fornecedor_nome ?? "Fornecedor não informado"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Contrato {contrato.numero ?? "sem número"}/{contrato.ano ?? "s/ano"} ·{" "}
                      {documentoBr(contrato.documento)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {contrato.valor === null ? "Valor não informado" : moeda(contrato.valor)}
                  </span>
                </div>
                {contrato.objeto && (
                  <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                    {contrato.objeto}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {contrato.situacao && <Badge variant="outline">{contrato.situacao}</Badge>}
                  {contrato.situacao_cadastral && (
                    <Badge variant="outline">CNPJ {contrato.situacao_cadastral}</Badge>
                  )}
                  {contrato.fiscal_contrato && (
                    <span>Fiscal: {contrato.fiscal_contrato}</span>
                  )}
                  <FonteLink href={contrato.fonte_url}>Ver no portal</FonteLink>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <GraficoVazio texto="Não há contratos do órgão 44 na carga atual." />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden />
          <div>
            <h3 className="font-semibold text-foreground">
              Dados necessários para medir a saúde previdenciária
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Despesas não bastam para calcular solvência. Ainda são necessários número
              mensal de beneficiários, contribuições patronais e dos servidores,
              parcelamentos, aportes, compensação previdenciária, carteira de
              investimentos, rentabilidade e avaliação atuarial atualizada.
            </p>
          </div>
        </div>
      </section>

      <footer className="flex flex-col gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-3xl">
          Metodologia: o portal histórico funciona como fotografia de referência. A base
          nova é atualizada pelo pipeline NucleoGov. Diferenças são mostradas, não
          preenchidas artificialmente.
        </p>
        <div className="flex shrink-0 flex-wrap gap-3">
          <FonteLink href={FUNPREPI_PORTAL_HISTORICO_URL}>Portal histórico</FonteLink>
          <FonteLink href={FUNPREPI_PORTAL_URL}>Portal atual</FonteLink>
        </div>
      </footer>
    </div>
  );
}
