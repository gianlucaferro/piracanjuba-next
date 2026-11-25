"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatChartNumber, numericTooltip } from "@/lib/chart-formatters";

type Linha = { nome: string; especies: number };

const COR_SERIE = "hsl(var(--chart-2))";
const COR_GRADE = "hsl(var(--border))";
const COR_TEXTO = "hsl(var(--muted-foreground))";
const numero = new Intl.NumberFormat("pt-BR");

/**
 * Espécies por grande grupo, em barras horizontais. Uma série só, sem legenda. A tabela ao
 * lado traz os mesmos números para teclado e leitor de tela, por isso o gráfico fica oculto
 * para tecnologias assistivas.
 */
export default function BiodiversidadeGruposChart({ grupos }: { grupos: Linha[] }) {
  const altura = Math.max(160, grupos.length * 34 + 24);
  return (
    <div data-testid="grafico-biodiversidade-grupos" aria-hidden="true" className="w-full" style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={grupos} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 4 }}>
          <CartesianGrid horizontal={false} stroke={COR_GRADE} strokeDasharray="3 3" />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 12, fill: COR_TEXTO }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(valor: number) => numero.format(valor)}
          />
          <YAxis
            type="category"
            dataKey="nome"
            width={98}
            interval={0}
            tick={{ fontSize: 12, fill: COR_TEXTO }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={numericTooltip((valor) => [numero.format(valor), "Espécies"])}
            isAnimationActive={false}
          />
          <Bar dataKey="especies" name="Espécies" fill={COR_SERIE} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList
              dataKey="especies"
              position="right"
              style={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
              formatter={(valor) => formatChartNumber(valor, (n) => numero.format(n), "")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
