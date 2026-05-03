"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Trophy } from "lucide-react";
import type { EmendaParlamentar } from "@/data/homeApi";

function formatCurrencyShort(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)} mil`;
  return `R$ ${v.toFixed(0)}`;
}

const COLORS_ESTADUAL = "hsl(var(--primary))";
const COLORS_FEDERAL = "hsl(var(--accent))";

interface Props {
  emendas: EmendaParlamentar[];
}

export default function EmendasRanking({ emendas }: Props) {
  const ranking = useMemo(() => {
    const map = new Map<string, { nome: string; esfera: string; total: number; pago: number; qtd: number }>();

    for (const e of emendas) {
      // Exclude government transfers
      if (e.parlamentar_nome.startsWith("Governo")) continue;

      const key = e.parlamentar_nome;
      const existing = map.get(key);
      if (existing) {
        existing.total += e.valor_empenhado || 0;
        existing.pago += e.valor_pago || 0;
        existing.qtd += 1;
      } else {
        map.set(key, {
          nome: e.parlamentar_nome,
          esfera: e.parlamentar_esfera || "federal",
          total: e.valor_empenhado || 0,
          pago: e.valor_pago || 0,
          qtd: 1,
        });
      }
    }

    return [...map.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [emendas]);

  if (ranking.length === 0) return null;

  const maxValue = ranking[0]?.total || 1;

  return (
    <div className="stat-card space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-foreground">Ranking de parlamentares</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Top 10 parlamentares que mais destinaram recursos para Piracanjuba (exceto transferências governamentais)
      </p>

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-muted-foreground">Estadual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-accent" />
          <span className="text-muted-foreground">Federal</span>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full" style={{ height: ranking.length * 48 + 20 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={ranking}
            layout="vertical"
            margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
            barCategoryGap="20%"
          >
            <XAxis
              type="number"
              hide
              domain={[0, maxValue * 1.15]}
            />
            <YAxis
              type="category"
              dataKey="nome"
              width={130}
              tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [
                value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                "Empenhado",
              ]}
              labelFormatter={(label) => label}
            />
            <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={24}>
              {ranking.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.esfera === "estadual" ? COLORS_ESTADUAL : COLORS_FEDERAL}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary list below chart */}
      <div className="space-y-1 pt-2 border-t border-border">
        {ranking.slice(0, 5).map((r, i) => (
          <div key={r.nome} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{i + 1}º</span> {r.nome}
              <span className="text-muted-foreground/70 ml-1">({r.qtd} emendas)</span>
            </span>
            <span className="font-semibold text-foreground">{formatCurrencyShort(r.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
