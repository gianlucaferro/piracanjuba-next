"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  CircleDollarSign,
  ExternalLink,
  Landmark,
  WalletCards,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchDespesasMensais,
  type DespesaMensal,
} from "@/data/despesasMensaisApi";
import {
  fetchReceitasMensais,
  type EsferaReceita,
  type ReceitaMensal,
} from "@/data/receitasMensaisApi";
import { formatCurrency } from "@/lib/formatters";

const MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const COLORS: Record<EsferaReceita, string[]> = {
  federal: ["#1d4ed8", "#0284c7", "#0f766e", "#7c3aed"],
  estadual: ["#047857", "#65a30d", "#ca8a04", "#c2410c", "#7c3aed"],
  municipal: ["#0f766e", "#2563eb", "#7c3aed", "#c2410c", "#64748b"],
};

type ChartRow = {
  competencia: string;
  label: string;
  total: number;
  bruto: number;
  deducoes: number;
  [category: string]: string | number;
};

type ChartConfig = {
  esfera: EsferaReceita;
  title: string;
  description: string;
  icon: typeof Landmark;
};

const CHARTS: ChartConfig[] = [
  {
    esfera: "federal",
    title: "Repasses federais",
    description:
      "FPM, ITR e demais transferências da União efetivamente registradas no mês.",
    icon: Landmark,
  },
  {
    esfera: "estadual",
    title: "Repasses estaduais",
    description:
      "ICMS, IPVA, IPI Exportação e demais recursos transferidos pelo Estado de Goiás.",
    icon: Building2,
  },
  {
    esfera: "municipal",
    title: "Arrecadação própria",
    description:
      "Impostos, taxas, contribuições, patrimônio, serviços e outras receitas geradas pelo próprio município.",
    icon: WalletCards,
  },
];

function isCurrentMonth(competencia: string): boolean {
  const now = new Date();
  return competencia ===
    `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(competencia: string): string {
  const [year, month] = competencia.split("-");
  return `${MONTHS[Number(month) - 1] ?? month}/${year.slice(2)}${
    isCurrentMonth(competencia) ? "*" : ""
  }`;
}

function formatFullMonth(competencia: string): string {
  const [year, month] = competencia.split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function buildChart(
  allRows: ReceitaMensal[],
  esfera: EsferaReceita,
  monthLimit: number,
) {
  const rows = allRows.filter((row) => row.esfera === esfera);
  const competencias = [...new Set(rows.map((row) => row.competencia))]
    .sort()
    .reverse()
    .slice(0, monthLimit);
  const selected = rows.filter((row) =>
    competencias.includes(row.competencia)
  );
  const categories = [...new Map(
    selected
      .sort((a, b) => a.categoria_ordem - b.categoria_ordem)
      .map((row) => [row.categoria, row.categoria]),
  ).values()];

  const chartRows: ChartRow[] = competencias.map((competencia) => {
    const monthRows = selected.filter((row) =>
      row.competencia === competencia
    );
    const item: ChartRow = {
      competencia,
      label: formatMonth(competencia),
      total: 0,
      bruto: 0,
      deducoes: 0,
    };
    for (const row of monthRows) {
      const value = Number(row.valor_liquido) || 0;
      item[row.categoria] = value;
      item.total += value;
      item.bruto += Number(row.valor_bruto) || 0;
      item.deducoes += Number(row.deducoes) || 0;
    }
    return item;
  });

  return { rows: chartRows, categories, source: selected[0] ?? null };
}

function variation(current: number, previous: number): string | null {
  if (!Number.isFinite(previous) || previous === 0) return null;
  const value = ((current - previous) / previous) * 100;
  return `${value >= 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

function PeriodSelector({
  monthLimit,
  onChange,
  label,
}: {
  monthLimit: number;
  onChange: (months: number) => void;
  label: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-xs font-medium text-muted-foreground">
        {label}
      </legend>
      <div className="inline-flex rounded-lg border border-border bg-background p-1">
        {[12, 24, 60].map((months) => (
          <button
            key={months}
            type="button"
            onClick={() => onChange(months)}
            aria-pressed={monthLimit === months}
            className={`min-h-8 min-w-12 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              monthLimit === months
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {months} meses
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function RevenueChart({
  config,
  allRows,
  monthLimit,
}: {
  config: ChartConfig;
  allRows: ReceitaMensal[];
  monthLimit: number;
}) {
  const chart = useMemo(
    () => buildChart(allRows, config.esfera, monthLimit),
    [allRows, config.esfera, monthLimit],
  );
  const latest = chart.rows[0];
  const previous = chart.rows[1];
  const latestIsPartial = latest ? isCurrentMonth(latest.competencia) : false;
  const change = latest && previous && !latestIsPartial
    ? variation(latest.total, previous.total)
    : null;
  const Icon = config.icon;
  const minWidth = Math.max(720, chart.rows.length * 48);
  const isTransfer = config.esfera !== "municipal";

  if (!latest) {
    return (
      <section className="stat-card" aria-labelledby={`${config.esfera}-title`}>
        <h3
          id={`${config.esfera}-title`}
          className="flex items-center gap-2 font-semibold text-foreground"
        >
          <Icon className="h-4 w-4 text-primary" aria-hidden />
          {config.title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Ainda não há competências mensais publicadas para esta série.
        </p>
      </section>
    );
  }

  return (
    <section className="stat-card" aria-labelledby={`${config.esfera}-title`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3
            id={`${config.esfera}-title`}
            className="flex items-center gap-2 font-semibold text-foreground"
          >
            <Icon className="h-4 w-4 text-primary" aria-hidden />
            {config.title}
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {config.description}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 lg:min-w-64">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Mais recente: {formatFullMonth(latest.competencia)}
            {latestIsPartial ? " (parcial)" : ""}
          </p>
          <p className="mt-1 text-xl font-bold text-foreground">
            {formatCurrency(latest.total)}
          </p>
          {change && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {change} em relação ao mês anterior
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs font-medium text-muted-foreground">
        Ordem do gráfico: mês mais recente à esquerda, meses anteriores à
        direita. {latestIsPartial
          ? "O asterisco identifica o mês atual, ainda parcial."
          : ""}
      </p>
      <div className="mt-2 overflow-x-auto pb-2">
        <div
          className="h-80"
          style={{ minWidth }}
          role="img"
          aria-label={`${config.title}, de ${
            formatFullMonth(latest.competencia)
          } até ${
            formatFullMonth(chart.rows[chart.rows.length - 1].competencia)
          }. O valor mais recente é ${formatCurrency(latest.total)}.`}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            initialDimension={{ width: minWidth, height: 320 }}
          >
            <BarChart
              data={chart.rows}
              margin={{ top: 12, right: 12, bottom: 4, left: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                interval={0}
                padding={{ left: 8, right: 8 }}
              />
              <YAxis
                width={56}
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                tickFormatter={(value) => formatCompact(Number(value))}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatCurrency(Number(value)),
                  String(name),
                ]}
                labelFormatter={(_label, payload) => {
                  const row = payload?.[0]?.payload as ChartRow | undefined;
                  return row
                    ? `${formatFullMonth(row.competencia)}: ${
                      formatCurrency(row.total)
                    }`
                    : "";
                }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 10,
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {chart.categories.map((category, index) => (
                <Bar
                  key={category}
                  dataKey={category}
                  name={category}
                  stackId={config.esfera}
                  fill={COLORS[config.esfera][index % COLORS[config.esfera].length]}
                  radius={index === chart.categories.length - 1
                    ? [4, 4, 0, 0]
                    : 0}
                  maxBarSize={42}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        {isTransfer
          ? "Valores líquidos: o total recebido no mês menos as deduções contábeis registradas pelo Município, inclusive as destinadas ao FUNDEB."
          : "Receita própria não inclui transferências federais ou estaduais, empréstimos nem benefícios pagos diretamente a cidadãos."}
      </div>

      <details className="mt-3">
        <summary className="min-h-6 cursor-pointer text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Ver valores mês a mês
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">
              Valores mensais de {config.title}, do mês mais recente ao mais
              antigo
            </caption>
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2 font-medium">Mês</th>
                <th className="px-2 py-2 text-right font-medium">
                  {isTransfer ? "Bruto" : "Arrecadado"}
                </th>
                {isTransfer && (
                  <th className="px-2 py-2 text-right font-medium">Deduções</th>
                )}
                <th className="px-2 py-2 text-right font-medium">
                  {isTransfer ? "Líquido" : "Total"}
                </th>
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row) => (
                <tr
                  key={row.competencia}
                  className="border-b border-border/60"
                >
                  <td className="px-2 py-2.5 font-medium text-foreground">
                    {formatFullMonth(row.competencia)}
                    {isCurrentMonth(row.competencia) ? " (parcial)" : ""}
                  </td>
                  <td className="px-2 py-2.5 text-right text-foreground">
                    {formatCurrency(row.bruto)}
                  </td>
                  {isTransfer && (
                    <td className="px-2 py-2.5 text-right text-muted-foreground">
                      {formatCurrency(row.deducoes)}
                    </td>
                  )}
                  <td className="px-2 py-2.5 text-right font-semibold text-foreground">
                    {formatCurrency(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {chart.source && (
        <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <a
            href={chart.source.fonte_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-6 items-center gap-1 text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Fonte oficial: Portal da Transparência de Piracanjuba
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
          <span>
            Atualização automática mensal. Coleta mais recente:{" "}
            {new Date(chart.source.data_coleta).toLocaleDateString("pt-BR")}
          </span>
        </div>
      )}
    </section>
  );
}

function ExpenseChart({
  allRows,
  monthLimit,
}: {
  allRows: DespesaMensal[];
  monthLimit: number;
}) {
  const rows = useMemo(
    () => allRows.slice(0, monthLimit).map((row) => ({
      ...row,
      label: formatMonth(row.competencia),
      valor_empenhado: Number(row.valor_empenhado) || 0,
      valor_liquidado: Number(row.valor_liquidado) || 0,
      valor_pago: Number(row.valor_pago) || 0,
    })),
    [allRows, monthLimit],
  );
  const latest = rows[0];
  const latestIsPartial = latest ? isCurrentMonth(latest.competencia) : false;
  const minWidth = Math.max(720, rows.length * 48);

  if (!latest) {
    return (
      <section className="stat-card" aria-labelledby="despesas-mensais-title">
        <h3
          id="despesas-mensais-title"
          className="flex items-center gap-2 font-semibold text-foreground"
        >
          <CircleDollarSign className="h-4 w-4 text-primary" aria-hidden />
          Gastos por mês do empenho
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Ainda não há competências mensais publicadas para esta série.
        </p>
      </section>
    );
  }

  return (
    <section className="stat-card" aria-labelledby="despesas-mensais-title">
      <div>
        <h3
          id="despesas-mensais-title"
          className="flex items-center gap-2 font-semibold text-foreground"
        >
          <CircleDollarSign className="h-4 w-4 text-primary" aria-hidden />
          Gastos por mês do empenho
        </h3>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Compromissos emitidos em cada mês e quanto deles já foi liquidado e
          pago até a coleta.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Empenhado",
            value: latest.valor_empenhado,
            color: "text-amber-700 dark:text-amber-400",
          },
          {
            label: "Liquidado",
            value: latest.valor_liquidado,
            color: "text-blue-700 dark:text-blue-400",
          },
          {
            label: "Pago",
            value: latest.valor_pago,
            color: "text-emerald-700 dark:text-emerald-400",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-border bg-muted/40 px-4 py-3"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {item.label} em {formatFullMonth(latest.competencia)}
              {latestIsPartial ? " (parcial)" : ""}
            </p>
            <p className={`mt-1 text-lg font-bold ${item.color}`}>
              {formatCurrency(item.value)}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs font-medium text-muted-foreground">
        Ordem do gráfico: mês mais recente à esquerda, meses anteriores à
        direita. {latestIsPartial
          ? "O asterisco identifica o mês atual, ainda parcial."
          : ""}
      </p>
      <div className="mt-2 overflow-x-auto pb-2">
        <div
          className="h-80"
          style={{ minWidth }}
          role="img"
          aria-label={`Gastos por mês do empenho, de ${
            formatFullMonth(latest.competencia)
          } até ${formatFullMonth(rows[rows.length - 1].competencia)}. No mês mais recente foram empenhados ${
            formatCurrency(latest.valor_empenhado)
          }, liquidados ${formatCurrency(latest.valor_liquidado)} e pagos ${
            formatCurrency(latest.valor_pago)
          }.`}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            initialDimension={{ width: minWidth, height: 320 }}
          >
            <LineChart
              data={rows}
              margin={{ top: 12, right: 12, bottom: 4, left: 4 }}
              accessibilityLayer
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                interval={0}
                padding={{ left: 8, right: 8 }}
              />
              <YAxis
                width={56}
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                tickFormatter={(value) => formatCompact(Number(value))}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatCurrency(Number(value)),
                  String(name),
                ]}
                labelFormatter={(_label, payload) => {
                  const row = payload?.[0]?.payload as
                    | (DespesaMensal & { label: string })
                    | undefined;
                  return row ? formatFullMonth(row.competencia) : "";
                }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 10,
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="valor_empenhado"
                name="Empenhado"
                stroke="#b45309"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="valor_liquidado"
                name="Liquidado"
                stroke="#2563eb"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="valor_pago"
                name="Pago"
                stroke="#047857"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        As três linhas representam etapas do mesmo gasto e não devem ser
        somadas. O mês identifica a data do empenho, não a data em que o
        dinheiro saiu do caixa.
      </div>

      <details className="mt-3">
        <summary className="min-h-6 cursor-pointer text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Ver valores mês a mês
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <caption className="sr-only">
              Gastos por competência do empenho, do mês mais recente ao mais
              antigo
            </caption>
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2 font-medium">Mês do empenho</th>
                <th className="px-2 py-2 text-right font-medium">Empenhado</th>
                <th className="px-2 py-2 text-right font-medium">Liquidado</th>
                <th className="px-2 py-2 text-right font-medium">Pago</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.competencia}
                  className="border-b border-border/60"
                >
                  <td className="px-2 py-2.5 font-medium text-foreground">
                    {formatFullMonth(row.competencia)}
                    {isCurrentMonth(row.competencia) ? " (parcial)" : ""}
                  </td>
                  <td className="px-2 py-2.5 text-right text-foreground">
                    {formatCurrency(row.valor_empenhado)}
                  </td>
                  <td className="px-2 py-2.5 text-right text-foreground">
                    {formatCurrency(row.valor_liquidado)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-semibold text-foreground">
                    {formatCurrency(row.valor_pago)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <a
          href={latest.fonte_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-6 items-center gap-1 text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Fonte oficial: Portal da Transparência de Piracanjuba
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
        <span>
          Atualização automática mensal. Coleta mais recente:{" "}
          {new Date(latest.data_coleta).toLocaleDateString("pt-BR")}
        </span>
      </div>
    </section>
  );
}

export default function ReceitasMensaisCharts() {
  const [monthLimit, setMonthLimit] = useState(24);
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["receitas-mensais"],
    queryFn: fetchReceitasMensais,
    staleTime: 30 * 60 * 1000,
  });
  const {
    data: expenseRows = [],
    isLoading: expensesLoading,
    isError: expensesError,
  } = useQuery({
    queryKey: ["despesas-mensais"],
    queryFn: fetchDespesasMensais,
    staleTime: 30 * 60 * 1000,
  });

  return (
    <div className="space-y-4">
      <section className="stat-card border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
              De onde vem o dinheiro da Prefeitura?
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Histórico mensal separado por origem, sem misturar repasses
              governamentais com a arrecadação gerada pelo próprio Município.
            </p>
          </div>
          <PeriodSelector
            monthLimit={monthLimit}
            onChange={setMonthLimit}
            label="Período exibido nas receitas"
          />
        </div>
      </section>

      {isLoading && (
        <div aria-live="polite" className="space-y-4">
          <p className="sr-only">Carregando históricos mensais de receitas.</p>
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="stat-card h-96 animate-pulse bg-muted/40"
            />
          ))}
        </div>
      )}

      {isError && (
        <section className="stat-card" role="status">
          <h3 className="font-semibold text-foreground">
            Histórico mensal temporariamente indisponível
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Os demais dados da Visão Geral continuam disponíveis. Tente
            novamente em alguns instantes.
          </p>
        </section>
      )}

      {!isLoading && !isError && CHARTS.map((config) => (
        <RevenueChart
          key={config.esfera}
          config={config}
          allRows={data}
          monthLimit={monthLimit}
        />
      ))}

      <section className="stat-card border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <CircleDollarSign className="h-5 w-5 text-primary" aria-hidden />
              Quanto o Município gasta?
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Histórico mensal das despesas empenhadas e da evolução das fases
              de liquidação e pagamento.
            </p>
          </div>
          <PeriodSelector
            monthLimit={monthLimit}
            onChange={setMonthLimit}
            label="Período exibido nos gastos"
          />
        </div>
      </section>

      {expensesLoading && (
        <div aria-live="polite">
          <p className="sr-only">Carregando histórico mensal de gastos.</p>
          <div className="stat-card h-96 animate-pulse bg-muted/40" />
        </div>
      )}

      {expensesError && (
        <section className="stat-card" role="status">
          <h3 className="font-semibold text-foreground">
            Histórico mensal de gastos temporariamente indisponível
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Os demais dados da Visão Geral continuam disponíveis. Tente
            novamente em alguns instantes.
          </p>
        </section>
      )}

      {!expensesLoading && !expensesError && (
        <ExpenseChart allRows={expenseRows} monthLimit={monthLimit} />
      )}
    </div>
  );
}
