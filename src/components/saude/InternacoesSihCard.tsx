"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { HeartPulse, Ambulance, CalendarClock, Activity, ExternalLink, Info } from "lucide-react";
import { SIH_INTERNACOES, SIH_META as META } from "@/lib/data/sih-internacoes";

const COR_URGENCIA = "#dc2626";
const COR_ELETIVA = "#60a5fa";

function nf(v: number): string {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

const chartData = SIH_INTERNACOES.map((a) => ({
  ano: String(a.ano),
  Urgência: a.urgencia,
  Eletiva: a.eletiva,
}));

const u = META.ultimo;

export default function InternacoesSihCard() {
  return (
    <section className="stat-card border-l-4 border-l-rose-500">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
            <HeartPulse className="w-4 h-4 text-rose-600" />
          </div>
          Internações hospitalares (SUS)
        </h2>
        <p className="text-sm text-muted-foreground mt-1 ml-10">
          Quantas vezes moradores de Piracanjuba foram internados pelo SUS a cada ano, e o
          perfil dessas internações. Fonte: Ministério da Saúde (SIH), {SIH_INTERNACOES[0].ano}–{META.anoUltimo}.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="rounded-lg bg-rose-500/5 border border-rose-500/30 p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Internações {META.anoUltimo}</p>
          <p className="text-2xl font-bold text-rose-600 mt-0.5">{nf(u.internacoes)}</p>
          <p className="text-xs text-muted-foreground">o maior número da série</p>
        </div>
        <div className="rounded-lg bg-background border p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
            <Ambulance className="w-3 h-3" /> Urgência
          </p>
          <p className="text-2xl font-bold text-foreground mt-0.5">{META.pctUrgenciaUltimo}%</p>
          <p className="text-xs text-muted-foreground">das internações em {META.anoUltimo}</p>
        </div>
        <div className="rounded-lg bg-background border p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
            <CalendarClock className="w-3 h-3" /> Permanência
          </p>
          <p className="text-2xl font-bold text-foreground mt-0.5">
            {u.permanenciaDias.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </p>
          <p className="text-xs text-muted-foreground">dias em média, por internação</p>
        </div>
        <div className="rounded-lg bg-background border p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
            <Activity className="w-3 h-3" /> Óbitos hospitalares
          </p>
          <p className="text-2xl font-bold text-foreground mt-0.5">{u.obitos}</p>
          <p className="text-xs text-muted-foreground">{META.taxaObitoUltimo.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% das internações em {META.anoUltimo}</p>
        </div>
      </div>

      {/* Série empilhada urgência × eletiva */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
            <XAxis dataKey="ano" tick={{ fontSize: 11 }} interval={1} />
            <YAxis tick={{ fontSize: 11 }} width={38} tickFormatter={(v: number) => `${(v / 1000).toFixed(1).replace(".", ",")}k`} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number, n: string) => [`${nf(v)}`, n]}
              labelFormatter={(a) => `Ano ${a}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Urgência" stackId="i" fill={COR_URGENCIA} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Eletiva" stackId="i" fill={COR_ELETIVA} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-sm text-foreground/80 mt-3 leading-relaxed inline-flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" />
        <span>
          A grande maioria das internações é de <strong>urgência</strong> ({META.pctUrgenciaUltimo}% em {META.anoUltimo}),
          não de procedimentos agendados, o que reflete a porta de entrada hospitalar de emergência. As internações
          eletivas (azul) vêm crescendo, sinal de mais procedimentos programados.
        </span>
      </p>

      <p className="text-xs text-muted-foreground mt-2">
        Fonte:{" "}
        <a href={META.fonteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
          {META.fonteLabel} <ExternalLink className="w-2.5 h-2.5" />
        </a>
        . Internações de residentes de Piracanjuba pelo SUS (AIH). Não inclui atendimentos particulares/convênio.
      </p>
    </section>
  );
}
