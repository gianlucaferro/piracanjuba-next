"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Users, TrendingDown, Info } from "lucide-react";
import { POPULACAO_CENSOS, CENSO_DEMOGRAFIA_META as META } from "@/lib/data/censo-demografia";

const COR_RURAL = "#65a30d";
const COR_URBANA = "#94a3b8";

function nf(v: number): string {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}
function pct(part: number, total: number): string {
  return ((part / total) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const first = META.primeiro;
const last = META.ultimo;
const quedaRuralPct = Math.round((1 - last.rural / first.rural) * 100);

const chartData = POPULACAO_CENSOS.map((c) => ({
  ano: String(c.ano),
  Rural: c.rural,
  Urbana: c.urbana,
}));

export default function ExodoRuralPanel() {
  return (
    <section className="stat-card">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-primary" />
          O êxodo rural em números
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          A modernização da soja mecanizou o campo e esvaziou a zona rural. Os censos do IBGE mostram
          a inversão: de município majoritariamente rural a quase totalmente urbano, com a população
          total quase parada.
        </p>
      </div>

      {/* Estatísticas de topo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg bg-background border p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
            <Users className="w-3 h-3" /> Rural em {first.ano}
          </p>
          <p className="text-2xl font-bold text-lime-700 dark:text-lime-500 mt-0.5">{pct(first.rural, first.total)}%</p>
          <p className="text-xs text-muted-foreground">{nf(first.rural)} de {nf(first.total)} habitantes no campo</p>
        </div>
        <div className="rounded-lg bg-background border p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
            <Users className="w-3 h-3" /> Rural em {last.ano}
          </p>
          <p className="text-2xl font-bold text-foreground mt-0.5">{pct(last.rural, last.total)}%</p>
          <p className="text-xs text-muted-foreground">só {nf(last.rural)} habitantes no campo</p>
        </div>
        <div className="rounded-lg bg-primary/5 border border-primary/30 p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Queda da população rural</p>
          <p className="text-2xl font-bold text-primary mt-0.5">−{quedaRuralPct}%</p>
          <p className="text-xs text-muted-foreground">{nf(first.rural)} → {nf(last.rural)} pessoas ({first.ano}–{last.ano})</p>
        </div>
      </div>

      {/* Gráfico empilhado urbana × rural por censo */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 16, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
            <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={44} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number, n: string) => [`${nf(v)} hab.`, n]}
              labelFormatter={(a) => `Censo ${a}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Urbana" stackId="pop" fill={COR_URBANA} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Rural" stackId="pop" fill={COR_RURAL} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-1 text-center">
        Cada barra é a população total do censo (urbana + rural). A faixa verde é quem vivia no campo, encolhendo censo a censo. Passe o mouse para ver os números.
      </p>

      {/* Amarração com a soja */}
      <p className="text-sm text-foreground/80 mt-3 leading-relaxed inline-flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
        <span>
          Em {first.ano}, quase <strong>3 em cada 4</strong> piracanjubenses viviam no campo. Em {last.ano},
          menos de <strong>1 em cada 5</strong>. A população total mal se moveu ({nf(first.total)} → {nf(last.total)}),
          mas o campo se esvaziou para a cidade, no mesmo período em que a soja mecanizada avançou sobre as
          antigas pastagens (ver &quot;Como a soja chegou ao Sul Goiano&quot;, acima).
        </span>
      </p>

      <p className="text-xs text-muted-foreground mt-2">
        Fonte:{" "}
        <a href={META.fonteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          {META.fonteLabel}
        </a>
        . População residente por situação do domicílio (perímetro urbano legal).
      </p>
    </section>
  );
}
