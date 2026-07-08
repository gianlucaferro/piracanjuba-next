"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Droplets, Recycle, TrendingDown, ExternalLink, Info } from "lucide-react";
import { SNIS_SANEAMENTO, SNIS_META as META } from "@/lib/data/snis-saneamento";

const COR_AGUA = "#0ea5e9";
const COR_ESGOTO = "#16a34a";
const COR_PERDAS = "#f59e0b";

function pctFmt(v: number | null): string {
  return v === null ? "—" : `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

const chartData = SNIS_SANEAMENTO.map((a) => ({
  ano: String(a.ano),
  "Coleta de esgoto": a.coletaEsgoto,
  "Água (urbana)": a.aguaUrbana,
  Perdas: a.perdas,
}));

const ult = META.ultimoComColeta;
// último ano com água reportada
const ultAgua = [...SNIS_SANEAMENTO].reverse().find((a) => a.aguaUrbana !== null)!;

export default function SaneamentoSnisCard() {
  return (
    <section className="stat-card border-l-4 border-l-sky-500">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
            <Droplets className="w-4 h-4 text-sky-600" />
          </div>
          Saneamento: água e esgoto (SNIS)
        </h2>
        <p className="text-sm text-muted-foreground mt-1 ml-10">
          Cobertura de água e esgoto de Piracanjuba pela ótica do prestador de serviço, ano a ano.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="rounded-lg bg-sky-500/5 border border-sky-500/30 p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
            <Droplets className="w-3 h-3" /> Água urbana
          </p>
          <p className="text-2xl font-bold text-sky-600 mt-0.5">{pctFmt(ultAgua.aguaUrbana)}</p>
          <p className="text-xs text-muted-foreground">atendimento em {ultAgua.ano}</p>
        </div>
        <div className="rounded-lg bg-green-500/5 border border-green-500/30 p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
            <Recycle className="w-3 h-3" /> Coleta de esgoto
          </p>
          <p className="text-2xl font-bold text-green-600 mt-0.5">{pctFmt(ult.coletaEsgoto)}</p>
          <p className="text-xs text-muted-foreground">em {ult.ano} (era {pctFmt(META.coletaInicial)} em {META.primeiro.ano})</p>
        </div>
        <div className="rounded-lg bg-background border p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Tratamento do esgoto</p>
          <p className="text-2xl font-bold text-foreground mt-0.5">{pctFmt(ult.tratamentoEsgoto)}</p>
          <p className="text-xs text-muted-foreground">do esgoto coletado é tratado</p>
        </div>
        <div className="rounded-lg bg-background border p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
            <TrendingDown className="w-3 h-3" /> Perdas
          </p>
          <p className="text-2xl font-bold text-foreground mt-0.5">{pctFmt(ult.perdas)}</p>
          <p className="text-xs text-muted-foreground">de água perdida no faturamento</p>
        </div>
      </div>

      {/* Série temporal */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
            <XAxis dataKey="ano" tick={{ fontSize: 11 }} interval={1} />
            <YAxis tick={{ fontSize: 11 }} width={38} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number, n: string) => [`${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`, n]}
              labelFormatter={(a) => `Ano ${a}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="Água (urbana)" stroke={COR_AGUA} strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="Coleta de esgoto" stroke={COR_ESGOTO} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="Perdas" stroke={COR_PERDAS} strokeWidth={2} strokeDasharray="4 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-sm text-foreground/80 mt-3 leading-relaxed inline-flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 text-sky-600 mt-0.5 shrink-0" />
        <span>
          A água já era praticamente universal, mas o <strong>esgoto deu um salto</strong>: a coleta subiu de{" "}
          {pctFmt(META.coletaInicial)} ({META.primeiro.ano}) para {pctFmt(ult.coletaEsgoto)} ({ult.ano}), e{" "}
          <strong>100% do esgoto coletado é tratado</strong>, bem acima da média brasileira. As perdas de água
          recuaram para a faixa de 15-17% nos anos recentes.
        </span>
      </p>

      <p className="text-xs text-muted-foreground mt-2">
        Fonte:{" "}
        <a href={META.fonteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
          {META.fonteLabel} <ExternalLink className="w-2.5 h-2.5" />
        </a>
        . O SNIS mede o atendimento pelo prestador, base diferente do Censo IBGE de domicílios usado acima, por isso
        os percentuais não são diretamente comparáveis.
      </p>
    </section>
  );
}
