"use client";

import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { ArrowLeftRight } from "lucide-react";

type Row = {
  ano: number;
  classe_nome: string;
  area_ha: number;
};

const COR_PASTAGEM = "#d4a017";
const COR_SOJA = "#16a34a";

function fmt(ha: number): string {
  return `${(ha / 1000).toFixed(0)} mil ha`;
}

/**
 * Gráfico focado: a substituição da pastagem pela soja em Piracanjuba (MapBiomas).
 * Recebe as mesmas linhas do MapBiomas já buscadas pela página /meio-ambiente.
 */
export default function SubstituicaoPastagemSoja({ rows }: { rows: Row[] }) {
  const { data, pastIni, pastFim, sojaIni, sojaFim } = useMemo(() => {
    const porAno: Record<number, { ano: number; pastagem: number; soja: number }> = {};
    for (const r of rows) {
      if (r.classe_nome !== "Pastagem" && r.classe_nome !== "Soja") continue;
      porAno[r.ano] = porAno[r.ano] ?? { ano: r.ano, pastagem: 0, soja: 0 };
      if (r.classe_nome === "Pastagem") porAno[r.ano].pastagem += r.area_ha;
      else porAno[r.ano].soja += r.area_ha;
    }
    const arr = Object.values(porAno).sort((a, b) => a.ano - b.ano);
    const peakPast = arr.reduce((a, b) => (b.pastagem > a.pastagem ? b : a), arr[0]);
    return {
      data: arr,
      pastIni: peakPast,
      pastFim: arr[arr.length - 1],
      sojaIni: arr[0],
      sojaFim: arr[arr.length - 1],
    };
  }, [rows]);

  if (data.length === 0) return null;

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-amber-600" />
          A troca de pastagem por soja
        </h2>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          O mesmo território, dois usos que se cruzam: a pastagem recua e a soja avança.
        </p>
      </header>

      <div className="stat-card">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="ano" tick={{ fontSize: 12 }} ticks={[1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024]} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} width={42} />
            <Tooltip
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
              formatter={(v: number, name: string) => [fmt(v), name === "pastagem" ? "Pastagem" : "Soja"]}
              labelFormatter={(l) => `Ano ${l}`}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value: string) => (value === "pastagem" ? "Pastagem" : "Soja")}
            />
            <Line type="monotone" dataKey="pastagem" stroke={COR_PASTAGEM} strokeWidth={2.8} dot={false} />
            <Line type="monotone" dataKey="soja" stroke={COR_SOJA} strokeWidth={2.8} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-sm text-foreground/80 mt-3 leading-relaxed">
          A pastagem mapeada caiu de <strong>{fmt(pastIni.pastagem)}</strong> ({pastIni.ano}) para{" "}
          <strong>{fmt(pastFim.pastagem)}</strong> (2024), enquanto a soja saltou de{" "}
          <strong>{fmt(sojaIni.soja)}</strong> (1985) para <strong>{fmt(sojaFim.soja)}</strong>. As duas curvas
          quase se cruzam: o gado cede espaço para os grãos, a marca da modernização agrícola do Cerrado.
        </p>
        <p className="text-xs text-muted-foreground mt-1">Fonte: MapBiomas Coleção 10.1 (classes Pastagem e Soja).</p>
      </div>
    </section>
  );
}
