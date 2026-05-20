import { HandHeart, TrendingUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import { fetchBolsaFamilia } from "@/lib/data/bolsa-familia";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function fmtMoeda(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtNum(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

export default async function BolsaFamiliaCard() {
  const meses = await fetchBolsaFamilia(12);
  if (meses.length === 0) return null;

  const ultimo = meses[meses.length - 1];
  const totalAno = meses.reduce((s, m) => s + m.valor, 0);
  const beneficiadosUltimo = ultimo.beneficiados;
  const valorUltimo = ultimo.valor;

  // Variação: último mês vs média dos 6 anteriores
  const ultimosSeis = meses.slice(-7, -1);
  const mediaAnterior = ultimosSeis.length > 0
    ? ultimosSeis.reduce((s, m) => s + m.valor, 0) / ultimosSeis.length
    : 0;
  const variacao = mediaAnterior > 0 ? ((valorUltimo - mediaAnterior) / mediaAnterior) * 100 : 0;

  // Max pro sparkline
  const valorMax = Math.max(...meses.map((m) => m.valor));

  return (
    <section
      aria-labelledby="bolsa-familia-heading"
      className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent p-5 md:p-6 space-y-4"
    >
      <header className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
          <HandHeart className="w-5 h-5 text-rose-600" />
        </div>
        <div className="flex-1">
          <h3 id="bolsa-familia-heading" className="text-base font-bold text-foreground">
            Bolsa Família em Piracanjuba
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            Pagamentos do programa de transferência de renda no município nos
            últimos 12 meses. Fonte: Portal da Transparência Federal (CGU).
          </p>
        </div>
      </header>

      {/* KPIs do último mês */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-xl bg-background border border-border p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Mês mais recente
          </p>
          <p className="text-base md:text-lg font-extrabold text-foreground leading-tight mt-0.5">
            {MESES[ultimo.mes - 1]}/{ultimo.ano}
          </p>
        </div>
        <div className="rounded-xl bg-background border border-border p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Valor pago
          </p>
          <p className="text-base md:text-lg font-extrabold text-rose-700 leading-tight mt-0.5">
            {fmtMoeda(valorUltimo)}
          </p>
        </div>
        <div className="rounded-xl bg-background border border-border p-3 col-span-2 md:col-span-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Famílias beneficiadas
          </p>
          <p className="text-base md:text-lg font-extrabold text-foreground leading-tight mt-0.5">
            {fmtNum(beneficiadosUltimo)}
          </p>
        </div>
      </div>

      {/* Mini gráfico de barras */}
      <div className="rounded-xl bg-background border border-border p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
          Evolução mensal (R$)
        </p>
        <div className="flex items-end gap-1 h-20" aria-hidden>
          {meses.map((m) => {
            const altura = (m.valor / valorMax) * 100;
            const isUltimo = m === ultimo;
            return (
              <div
                key={m.mes_ano}
                className="flex-1 flex flex-col items-center justify-end h-full"
                title={`${MESES[m.mes - 1]}/${m.ano}: ${fmtMoeda(m.valor)} · ${fmtNum(m.beneficiados)} famílias`}
              >
                <div
                  className={`w-full rounded-t transition-all ${
                    isUltimo ? "bg-rose-500" : "bg-rose-300/60"
                  }`}
                  style={{ height: `${Math.max(altura, 6)}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
          <span>{MESES[meses[0].mes - 1]}/{meses[0].ano}</span>
          <span>{MESES[ultimo.mes - 1]}/{ultimo.ano}</span>
        </div>
      </div>

      {/* Resumo + variação */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Total dos últimos {meses.length} meses:{" "}
          <strong className="text-foreground">{fmtMoeda(totalAno)}</strong>
        </p>
        {Math.abs(variacao) > 1 && (
          <p className={`inline-flex items-center gap-1 text-xs font-semibold ${
            variacao > 0 ? "text-emerald-700" : "text-amber-700"
          }`}>
            <TrendingUp
              className={`w-3.5 h-3.5 ${variacao < 0 ? "rotate-180" : ""}`}
            />
            {variacao > 0 ? "+" : ""}{variacao.toFixed(1)}% vs média dos últimos 6 meses
          </p>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground border-t border-border pt-3">
        Fonte:{" "}
        <Link
          href="https://portaldatransparencia.gov.br/programas-e-acoes/bolsa-familia"
          target="_blank"
          rel="noopener noreferrer"
          className="underline inline-flex items-center gap-0.5"
        >
          Portal da Transparência <ExternalLink className="w-3 h-3" />
        </Link>{" "}
        — CGU. Dados podem ter ~2 meses de defasagem (período de fechamento
        contábil dos pagamentos).
      </p>
    </section>
  );
}
