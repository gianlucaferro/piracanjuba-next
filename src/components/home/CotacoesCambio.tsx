"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, ChartLine as LineChartIcon, Clock3, DollarSign, Euro, Minus } from "lucide-react";
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

  return (
    <article aria-label={name} className="min-w-0 rounded-xl border border-border bg-background p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CurrencyIcon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-tight text-foreground">{quote.currency === "USD" ? "Dólar" : "Euro"}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{quote.currency}/BRL</p>
        </div>
      </div>

      <dl className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Compra</dt>
          <dd className="mt-0.5 break-words text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-2xl">
            {priceFormatter.format(quote.buy)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Venda</dt>
          <dd className="mt-0.5 break-words text-sm font-medium tabular-nums text-muted-foreground">
            {priceFormatter.format(quote.sell)}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
        <span className="text-muted-foreground">Variação da compra</span>
        {change === null ? (
          <span className="text-muted-foreground">Não informada</span>
        ) : (
          <span className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${changeColor}`}>
            <ChangeIcon className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">{change > 0 ? "Alta de " : change < 0 ? "Queda de " : "Sem variação: "}</span>
            {changeFormatter.format(change)}%
          </span>
        )}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Cotação de <time dateTime={quote.quotedAt} className="tabular-nums">{quotationTime(quote.quotedAt)}</time>
        <span className="block">Horário de Brasília</span>
      </p>
      {delayed && (
        <p className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
          Cotação sem atualização recente.
        </p>
      )}
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
    <section aria-labelledby="heading-cambio" aria-busy={query.isLoading} className="rounded-2xl border border-border bg-secondary/30 p-3 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="heading-cambio" className="text-base font-bold text-foreground">Cotações de câmbio</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Câmbio comercial. Valores de referência.</p>
        </div>
        <a
          href="https://docs.awesomeapi.com.br/api-de-moedas"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Fonte: AwesomeAPI
        </a>
      </div>

      {snapshot ? (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {snapshot.quotes.map((quote) => (
            <CurrencyCard
              key={quote.currency}
              quote={quote}
              delayed={isExchangeQuoteDelayed(quote, snapshot.fetchedAt, observedAt)}
            />
          ))}
        </div>
      ) : (
        <p role="status" className="rounded-xl border border-border bg-background px-4 py-6 text-sm text-muted-foreground">
          {paused ? "Sem conexão para consultar as cotações." : query.isPending ? "Carregando cotações..." : "Cotações indisponíveis no momento."}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p className="inline-flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Atualização automática a cada minuto
        </p>
        <Link
          href="/economia#dolar-30-dias"
          className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4 hover:text-foreground"
        >
          <LineChartIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Dólar nos últimos 30 dias
        </Link>
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
      </div>
      {snapshot && (query.isError || paused) && (
        <p role="status" className="mt-2 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
          {paused ? "Sem conexão. Exibindo as últimas cotações disponíveis." : "Não foi possível atualizar. Exibindo as últimas cotações disponíveis."}
        </p>
      )}
    </section>
  );
}
