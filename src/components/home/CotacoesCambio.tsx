"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, ChartLine as LineChartIcon, DollarSign, Euro, Minus } from "lucide-react";
import {
  isExchangeQuoteDelayed,
  parseExchangeSnapshot,
  type CurrencyQuote,
} from "@/lib/cambio";

const UPDATE_INTERVAL = 60_000;
const priceFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});
const changeFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function quotationTime(value: string): string {
  const parts = timeFormatter.formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

async function fetchExchangeRates({ signal }: { signal: AbortSignal }) {
  const response = await fetch("/api/cambio", { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Cotações indisponíveis");
  return parseExchangeSnapshot(await response.json());
}

function CurrencyCard({ quote, delayed }: { quote: CurrencyQuote; delayed: boolean }) {
  const name = quote.currency === "USD" ? "Dólar americano" : "Euro";
  const CurrencyIcon = quote.currency === "USD" ? DollarSign : Euro;
  const change = quote.changePercent;
  const ChangeIcon = change !== null && change > 0 ? ArrowUpRight : change !== null && change < 0 ? ArrowDownRight : Minus;
  const changeColor = change !== null && change > 0
    ? "text-emerald-700 dark:text-emerald-400"
    : change !== null && change < 0
      ? "text-red-700 dark:text-red-400"
      : "text-muted-foreground";

  // Faixa compacta: compra e variação em destaque; venda, horário e aviso de atraso numa
  // linha pequena. Os rótulos completos ficam para leitores de tela.
  return (
    <article aria-label={name} className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CurrencyIcon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-1.5 leading-tight">
          <span className="text-xs font-semibold text-foreground">{quote.currency === "USD" ? "Dólar" : "Euro"}</span>
          <span className="sr-only">Compra</span>
          <span className="text-sm font-bold tabular-nums text-foreground sm:text-base">{priceFormatter.format(quote.buy)}</span>
          <span className="sr-only">Variação da compra</span>
          {change === null ? (
            <span className="inline-flex items-center text-xs text-muted-foreground" title="Variação não informada">
              <Minus className="h-3 w-3" aria-hidden />
              <span className="sr-only">Não informada</span>
            </span>
          ) : (
            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${changeColor}`}>
              <ChangeIcon className="h-3 w-3" aria-hidden />
              <span className="sr-only">{change > 0 ? "Alta de " : change < 0 ? "Queda de " : "Sem variação: "}</span>
              {changeFormatter.format(change)}%
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          <span className="whitespace-nowrap tabular-nums">Venda {priceFormatter.format(quote.sell)}</span>
          <span aria-hidden> · </span>
          <time dateTime={quote.quotedAt} className="whitespace-nowrap tabular-nums" title="Horário de Brasília">{quotationTime(quote.quotedAt)}</time>
          <span className="sr-only"> Horário de Brasília</span>
          {delayed && (
            <span className="font-medium text-amber-700 dark:text-amber-400">
              <span aria-hidden> · <span className="whitespace-nowrap">sem atualização recente</span></span>
              <span className="sr-only">Cotação sem atualização recente.</span>
            </span>
          )}
        </p>
      </div>
    </article>
  );
}

export default function CotacoesCambio() {
  const [now, setNow] = useState(() => Date.now());
  const query = useQuery({
    queryKey: ["home-cambio", "v1"],
    queryFn: fetchExchangeRates,
    staleTime: UPDATE_INTERVAL,
    refetchInterval: UPDATE_INTERVAL,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    networkMode: "online",
    retry: false,
  });

  useEffect(() => {
    const updateClock = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    const interval = window.setInterval(updateClock, UPDATE_INTERVAL);
    document.addEventListener("visibilitychange", updateClock);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", updateClock);
    };
  }, []);

  const snapshot = query.data;
  const observedAt = Math.max(now, query.dataUpdatedAt);
  const paused = query.fetchStatus === "paused";

  return (
    <section
      aria-label="Cotações de câmbio"
      aria-busy={query.isLoading}
      className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5 sm:px-4"
    >
      {/* No celular: rótulo e links na primeira linha, moedas embaixo em 2 colunas. No desktop: uma linha só. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-6">
        <h2 className="order-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground" title="Câmbio comercial, valores de referência, atualizados a cada minuto">
          Câmbio
        </h2>

        {snapshot ? (
          <div className="order-3 grid w-full min-w-0 grid-cols-2 gap-3 sm:order-2 sm:flex sm:w-auto sm:flex-1 sm:flex-wrap sm:gap-x-8">
            {snapshot.quotes.map((quote) => (
              <CurrencyCard
                key={quote.currency}
                quote={quote}
                delayed={isExchangeQuoteDelayed(quote, snapshot.fetchedAt, observedAt)}
              />
            ))}
          </div>
        ) : (
          <p role="status" className="order-3 w-full min-w-0 text-sm text-muted-foreground sm:order-2 sm:w-auto sm:flex-1">
            {paused ? "Sem conexão para consultar as cotações." : query.isPending ? "Carregando cotações..." : "Cotações indisponíveis no momento."}
          </p>
        )}

        <div className="order-2 ml-auto flex items-center justify-end gap-x-3 whitespace-nowrap text-[11px] text-muted-foreground sm:order-3">
          {query.isError && (
            <button
              type="button"
              disabled={query.isFetching || paused}
              onClick={() => void query.refetch()}
              className="rounded-sm font-medium text-primary underline underline-offset-4 disabled:opacity-50"
            >
              Tentar novamente
            </button>
          )}
          <Link
            href="/economia#dolar-30-dias"
            className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4 hover:text-foreground"
          >
            <LineChartIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Dólar nos últimos 30 dias
          </Link>
          <a
            href="https://docs.awesomeapi.com.br/api-de-moedas"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center underline underline-offset-4 hover:text-foreground"
          >
            <span className="hidden sm:inline">Fonte:&nbsp;</span>AwesomeAPI
          </a>
        </div>
      </div>
      {snapshot && (query.isError || paused) && (
        <p role="status" className="mt-1.5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
          {paused ? "Sem conexão. Exibindo as últimas cotações disponíveis." : "Não foi possível atualizar. Exibindo as últimas cotações disponíveis."}
        </p>
      )}
    </section>
  );
}
