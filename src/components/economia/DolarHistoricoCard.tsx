"use client";

import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, DollarSign, Minus } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  brasiliaDate,
  dollarAxisTicks,
  parseDollarHistory,
  summarizeDollarHistory,
  type DollarHistoryPoint,
} from "@/lib/cambio-historico";

const HOUR_MS = 3_600_000;
const LINE_COLOR = "hsl(var(--chart-1))";
const SURFACE_COLOR = "hsl(var(--card))";
const GRID_COLOR = "hsl(var(--border))";
const AXIS_TEXT_COLOR = "hsl(var(--muted-foreground))";

const priceFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});
const axisFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const changeFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const hourFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function dayMonth(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

function fullDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function pointLabel(point: DollarHistoryPoint, today: string): string {
  return point.date === today
    ? `Hoje, às ${hourFormatter.format(new Date(point.quotedAt))} (parcial)`
    : fullDate(point.date);
}

async function fetchDollarHistory({ signal }: { signal: AbortSignal }) {
  const response = await fetch("/api/cambio/historico", { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Histórico indisponível");
  return parseDollarHistory(await response.json());
}

type TooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  today: string;
};

function HistoryTooltip({ active, payload, today }: TooltipProps) {
  const point = payload?.[0]?.payload as DollarHistoryPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="flex items-center gap-2 text-sm font-semibold tabular-nums">
        <span className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: LINE_COLOR }} aria-hidden />
        {priceFormatter.format(point.buy)}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{pointLabel(point, today)}</p>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-base font-bold tabular-nums text-foreground sm:text-lg">{value}</dd>
      {detail && <dd className="text-xs text-muted-foreground">{detail}</dd>}
    </div>
  );
}

function HistoryContent({ points, today }: { points: DollarHistoryPoint[]; today: string }) {
  const summary = summarizeDollarHistory(points);
  const ticks = dollarAxisTicks(summary.min.buy, summary.max.buy);
  const change = summary.changePercent;
  const ChangeIcon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
  const changeColor = change > 0
    ? "text-emerald-700 dark:text-emerald-400"
    : change < 0
      ? "text-red-700 dark:text-red-400"
      : "text-muted-foreground";
  const description =
    `Gráfico de linha do dólar comercial, valor de compra, de ${fullDate(summary.first.date)} a ${fullDate(summary.last.date)}. `
    + `Começou em ${priceFormatter.format(summary.first.buy)} e está em ${priceFormatter.format(summary.last.buy)}, `
    + `variação de ${changeFormatter.format(change)}%. Mínima de ${priceFormatter.format(summary.min.buy)} em ${fullDate(summary.min.date)} `
    + `e máxima de ${priceFormatter.format(summary.max.buy)} em ${fullDate(summary.max.date)}.`;

  return (
    <>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Stat label="Último valor" value={priceFormatter.format(summary.last.buy)} detail={pointLabel(summary.last, today)} />
        <Stat
          label="Variação no período"
          value={(
            <span className={`inline-flex items-center gap-0.5 ${changeColor}`}>
              <ChangeIcon className="h-4 w-4" aria-hidden />
              <span className="sr-only">{change > 0 ? "Alta de " : change < 0 ? "Queda de " : "Sem variação: "}</span>
              {changeFormatter.format(change)}%
            </span>
          )}
          detail={`Desde ${fullDate(summary.first.date)}`}
        />
        <Stat label="Mínima" value={priceFormatter.format(summary.min.buy)} detail={fullDate(summary.min.date)} />
        <Stat label="Máxima" value={priceFormatter.format(summary.max.buy)} detail={fullDate(summary.max.date)} />
      </dl>

      <p className="sr-only">{description}</p>
      {/* A tabela abaixo leva os mesmos valores a teclado e leitor de tela. */}
      <div className="h-60 w-full sm:h-72" aria-hidden="true" data-testid="grafico-dolar-30-dias">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} accessibilityLayer={false}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={1} />
            <XAxis
              dataKey="date"
              tickFormatter={dayMonth}
              tick={{ fontSize: 12, fill: AXIS_TEXT_COLOR }}
              tickLine={false}
              axisLine={{ stroke: GRID_COLOR }}
              minTickGap={28}
              tickMargin={8}
            />
            <YAxis
              domain={[ticks[0], ticks[ticks.length - 1]]}
              ticks={ticks}
              tickFormatter={(value: number) => axisFormatter.format(value)}
              tick={{ fontSize: 12, fill: AXIS_TEXT_COLOR }}
              tickLine={false}
              axisLine={false}
              width={68}
            />
            <Tooltip
              content={(props) => <HistoryTooltip active={props.active} payload={props.payload} today={today} />}
              cursor={{ stroke: AXIS_TEXT_COLOR, strokeWidth: 1 }}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="buy"
              name="Compra"
              stroke={LINE_COLOR}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 4, fill: LINE_COLOR, stroke: SURFACE_COLOR, strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <ReferenceDot
              x={summary.last.date}
              y={summary.last.buy}
              r={4}
              fill={LINE_COLOR}
              stroke={SURFACE_COLOR}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <details className="rounded-xl border border-border bg-background">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-foreground">
          Ver os valores em tabela
        </summary>
        <div className="max-h-72 overflow-y-auto border-t border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">Dólar comercial, valor de compra por dia, do mais recente ao mais antigo</caption>
            <thead className="sticky top-0 bg-background">
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">Dia</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Compra</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((point) => (
                <tr key={point.date} className="border-t border-border/60">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal tabular-nums text-foreground">
                    {pointLabel(point, today)}
                  </th>
                  <td className="px-3 py-1.5 text-right tabular-nums text-foreground">{priceFormatter.format(point.buy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

export default function DolarHistoricoCard() {
  // Horário de abertura da página; o dado é horário e não precisa de relógio contínuo.
  const [openedAt] = useState(() => Date.now());
  const query = useQuery({
    queryKey: ["economia-dolar-30d", "v1"],
    queryFn: fetchDollarHistory,
    staleTime: HOUR_MS,
    refetchOnWindowFocus: false,
    networkMode: "online",
    retry: false,
  });
  const paused = query.fetchStatus === "paused";

  return (
    <section
      id="dolar-30-dias"
      aria-labelledby="dolar-30-dias-titulo"
      aria-busy={query.isLoading}
      className="scroll-mt-24 space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <DollarSign className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 id="dolar-30-dias-titulo" className="text-base font-bold text-foreground">
              Dólar comercial nos últimos 30 dias
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Valor de compra no fechamento de cada dia, em reais.
            </p>
          </div>
        </div>
        <a
          href="https://docs.awesomeapi.com.br/api-de-moedas"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Fonte: AwesomeAPI
        </a>
      </header>

      {query.data ? (
        <HistoryContent points={query.data.points} today={brasiliaDate(Math.max(openedAt, query.dataUpdatedAt))} />
      ) : (
        <div role="status" className="rounded-xl border border-border bg-background px-4 py-6 text-sm text-muted-foreground">
          <p>
            {paused
              ? "Sem conexão para consultar o histórico do dólar."
              : query.isPending
                ? "Carregando o histórico do dólar..."
                : "Histórico do dólar indisponível no momento."}
          </p>
          {query.isError && (
            <button
              type="button"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
              className="mt-2 rounded-sm font-medium text-primary underline underline-offset-4 disabled:opacity-50"
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Dias sem negociação não aparecem. O ponto de hoje mostra o último valor disponível, ainda sem fechamento,
        e o gráfico é atualizado a cada hora.
      </p>
    </section>
  );
}
