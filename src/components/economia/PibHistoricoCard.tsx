"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ReferenceDot,
} from "recharts";
import { LineChart as LineIcon, Wheat, ExternalLink, Info } from "lucide-react";
import {
  PIB_SERIE,
  AGRO_SHARE_SERIE,
  AGRO_SHARE_COMPARACAO_2021,
  PIB_HISTORICO_META as META,
} from "@/lib/data/pib-historico";

function fmtBi(milReais: number): string {
  if (milReais >= 1_000_000)
    return `R$ ${(milReais / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} bi`;
  if (milReais >= 1_000)
    return `R$ ${(milReais / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mi`;
  return `R$ ${milReais.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
}

const agroFirst = AGRO_SHARE_SERIE[0];
const agroLast = AGRO_SHARE_SERIE[AGRO_SHARE_SERIE.length - 1];
const pico = PIB_SERIE.find((p) => p.ano === META.anoPico);

// Rótulo string pré-computado por barra (o LabelList do recharts v3 não aplica
// `formatter` de forma confiável; um dataKey de string é o padrão que renderiza).
const comparacaoData = AGRO_SHARE_COMPARACAO_2021.map((r) => ({
  ...r,
  rotulo: `${r.pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
}));

export default function PibHistoricoCard() {
  return (
    <section className="stat-card border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
          <LineIcon className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground">
            PIB de Piracanjuba · 2002 a 2023
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
            Como o tamanho da economia do município evoluiu em duas décadas e o quanto
            ela depende do agro. Fonte primária: IBGE, PIB dos Municípios.
          </p>
        </div>
      </div>

      {/* Stats de topo */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <div className="stat-card border-emerald-500/30 bg-emerald-500/5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            PIB {META.anoPibMaisRecente}
          </p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-0.5">
            {fmtBi(META.pibMaisRecenteMil)}
          </p>
          <p className="text-xs text-muted-foreground">a preços correntes</p>
        </div>
        <div className="stat-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Pico em {META.anoPico}
          </p>
          <p className="text-2xl font-extrabold text-foreground mt-0.5">
            {fmtBi(META.pibPicoMil)}
          </p>
          <p className="text-xs text-muted-foreground">
            recuo em 2023 acompanha a queda das commodities
          </p>
        </div>
        <div className="stat-card border-amber-500/30 bg-amber-500/5 col-span-2 md:col-span-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
            <Wheat className="w-3 h-3" /> Peso do agro {agroLast.ano}
          </p>
          <p className="text-2xl font-extrabold text-amber-600 mt-0.5">
            {agroLast.pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
          </p>
          <p className="text-xs text-muted-foreground">do valor adicionado do município</p>
        </div>
      </div>

      {/* Série do PIB 2002-2023 */}
      <p className="text-sm font-medium text-foreground mb-1">
        Evolução do PIB (R$ correntes)
      </p>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={PIB_SERIE} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="pibFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
            <XAxis
              dataKey="ano"
              tick={{ fontSize: 11 }}
              interval={2}
              tickFormatter={(a: number) => `'${String(a).slice(2)}`}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              width={46}
              tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1).replace(".", ",")} bi`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => [fmtBi(v), "PIB"]}
              labelFormatter={(a) => `Ano ${a}`}
            />
            <Area
              type="monotone"
              dataKey="pibMil"
              stroke="#16a34a"
              strokeWidth={2.5}
              fill="url(#pibFill)"
            />
            {pico && (
              <ReferenceDot
                x={pico.ano}
                y={pico.pibMil}
                r={4}
                fill="#16a34a"
                stroke="hsl(var(--card))"
                strokeWidth={2}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Comparação: peso do agro no VAB, 2021 */}
      <div className="mt-6 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-br from-amber-50 to-transparent dark:from-amber-950/20 p-4">
        <p className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
          <Wheat className="w-4 h-4 text-amber-600" />
          Poucos lugares dependem tanto do agro (2021)
        </p>
        <p className="text-sm text-muted-foreground mt-1 mb-3 leading-relaxed">
          Participação da agropecuária no valor adicionado. Em Piracanjuba o agro pesa{" "}
          <strong className="text-foreground">
            {(AGRO_SHARE_COMPARACAO_2021[2].pct / AGRO_SHARE_COMPARACAO_2021[0].pct).toFixed(0)}x
          </strong>{" "}
          mais que na média do Brasil e{" "}
          <strong className="text-foreground">
            {(AGRO_SHARE_COMPARACAO_2021[2].pct / AGRO_SHARE_COMPARACAO_2021[1].pct).toFixed(1)}x
          </strong>{" "}
          mais que na média de Goiás.
        </p>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={comparacaoData}
              layout="vertical"
              margin={{ top: 2, right: 48, bottom: 2, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 60]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="nivel" tick={{ fontSize: 12 }} width={92} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`, "Agro no VAB"]}
              />
              <Bar dataKey="pct" radius={[0, 5, 5, 0]}>
                {comparacaoData.map((r) => (
                  <Cell key={r.nivel} fill={r.destaque ? "#d97706" : "#94a3b8"} />
                ))}
                <LabelList
                  dataKey="rotulo"
                  position="right"
                  style={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tendência: agro aprofundou */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={AGRO_SHARE_SERIE} margin={{ top: 6, right: 8, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
              <XAxis
                dataKey="ano"
                tick={{ fontSize: 11 }}
                interval={3}
                tickFormatter={(a: number) => `'${String(a).slice(2)}`}
              />
              <YAxis tick={{ fontSize: 11 }} width={34} domain={[20, 60]} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`, "Agro no VAB"]}
                labelFormatter={(a) => `Ano ${a}`}
              />
              <Line type="monotone" dataKey="pct" stroke="#d97706" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed inline-flex items-start gap-1.5 md:max-w-[15rem]">
          <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
          <span>
            A dependência do agro <strong>cresceu</strong>: de{" "}
            {agroFirst.pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% do valor
            adicionado em {agroFirst.ano} para{" "}
            {agroLast.pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% em {agroLast.ano}.
          </span>
        </p>
      </div>

      <p className="text-xs text-muted-foreground italic mt-4">
        Fonte:{" "}
        <a
          href={META.fonteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          {META.fonteLabel} <ExternalLink className="w-2.5 h-2.5" />
        </a>
        . PIB a preços correntes (nominais, sem correção pela inflação); série do agro no VAB vai até {agroLast.ano}
        {" "}(abertura setorial mais recente do IBGE).
      </p>
    </section>
  );
}
