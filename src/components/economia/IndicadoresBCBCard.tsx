import { TrendingUp, DollarSign, Percent, ExternalLink } from "lucide-react";
import Link from "next/link";
import { fetchIndicadoresBCB } from "@/lib/data/indicadores-bcb";

function fmtPct(n: number | null | undefined, dec = 2) {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(dec)}%`;
}

function fmtBRL(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(n);
}

function fmtData(data: string | undefined) {
  if (!data) return "";
  // DD/MM/YYYY → DD/MM/YYYY (já no formato BR)
  if (data.includes("/")) return data;
  // MM-DD-YYYY (PTAX)
  const m = data.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[2]}/${m[1]}/${m[3]}`;
  return data;
}

export default async function IndicadoresBCBCard() {
  const dados = await fetchIndicadoresBCB();

  if (!dados.selic_acumulada_mes && !dados.ipca_mensal && !dados.usd_brl) return null;

  const maxIPCA = dados.historico_ipca.length > 0
    ? Math.max(...dados.historico_ipca.map((p) => Math.abs(p.valor)), 0.01)
    : 1;

  return (
    <section
      aria-labelledby="bcb-heading"
      className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent p-5 md:p-6 space-y-4"
    >
      <header className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <h3 id="bcb-heading" className="text-base font-bold text-foreground">
            Indicadores Econômicos
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Banco Central do Brasil — dados oficiais atualizados
          </p>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* SELIC mensal */}
        {dados.selic_acumulada_mes && (
          <div className="rounded-xl bg-background border border-border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Percent className="w-3.5 h-3.5 text-blue-600" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                SELIC/mês
              </p>
            </div>
            <p className="text-xl font-extrabold text-foreground leading-none">
              {fmtPct(dados.selic_acumulada_mes.valor)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {fmtData(dados.selic_acumulada_mes.data)}
            </p>
          </div>
        )}

        {/* SELIC diária */}
        {dados.selic_diaria && (
          <div className="rounded-xl bg-background border border-border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Percent className="w-3.5 h-3.5 text-indigo-600" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                SELIC/dia
              </p>
            </div>
            <p className="text-xl font-extrabold text-foreground leading-none">
              {fmtPct(dados.selic_diaria.valor, 4)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {fmtData(dados.selic_diaria.data)}
            </p>
          </div>
        )}

        {/* IPCA */}
        {dados.ipca_mensal && (
          <div className="rounded-xl bg-background border border-border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                IPCA/mês
              </p>
            </div>
            <p className="text-xl font-extrabold text-foreground leading-none">
              {fmtPct(dados.ipca_mensal.valor)}
            </p>
            {dados.ipca_acumulado_12m !== null && (
              <p className="text-[10px] text-amber-700 font-semibold mt-0.5">
                {fmtPct(dados.ipca_acumulado_12m, 2)} em 12m
              </p>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {fmtData(dados.ipca_mensal.data)}
            </p>
          </div>
        )}

        {/* USD/BRL */}
        {dados.usd_brl && (
          <div className="rounded-xl bg-background border border-border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                USD/BRL
              </p>
            </div>
            <p className="text-xl font-extrabold text-foreground leading-none">
              {fmtBRL(dados.usd_brl.cotacao_venda)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              PTAX {fmtData(dados.usd_brl.data)}
            </p>
          </div>
        )}
      </div>

      {/* Sparkline IPCA */}
      {dados.historico_ipca.length > 0 && (
        <div className="rounded-xl bg-background border border-border p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            IPCA — variação mensal (12 meses)
          </p>
          <div className="flex items-end gap-0.5 h-10" aria-hidden>
            {dados.historico_ipca.map((p, i) => {
              const h = (Math.abs(p.valor) / maxIPCA) * 100;
              const isNeg = p.valor < 0;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col justify-end h-full"
                  title={`${p.data}: ${p.valor.toFixed(2)}%`}
                >
                  <div
                    className={`w-full rounded-t ${isNeg ? "bg-red-400" : "bg-amber-400"}`}
                    style={{ height: `${Math.max(h, 4)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
            <span>{dados.historico_ipca[0]?.data.slice(3)}</span>
            <span>atual</span>
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground border-t border-border/50 pt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>Fonte: Banco Central do Brasil (BCB) — séries temporais SGS.</span>
        <Link
          href="https://www.bcb.gov.br/controleinflacao/taxaselic"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 underline hover:text-foreground"
        >
          Saiba mais sobre SELIC <ExternalLink className="w-3 h-3" />
        </Link>
      </p>
    </section>
  );
}
