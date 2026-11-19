"use client";

import { formatChartNumber, numericTooltip } from "@/lib/chart-formatters";
import { climateNumber } from "@/lib/climate-measurements";

import { useMemo } from "react";
import { CloudRain, Thermometer } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { ClimaDia, ResumoMes } from "@/lib/data/clima";

function shortDate(s: string) {
  const [, m, d] = s.split("-");
  return `${d}/${m}`;
}

export default function ClimaClient({
  dias,
  resumo,
  periodoMes,
}: {
  /** Dias encerrados (até ontem), em ordem crescente; nunca hoje nem dias de previsão. */
  dias: ClimaDia[];
  resumo: ResumoMes | null;
  /** Período do resumo do mês: do dia 1 até ontem (null no dia 1, sem dia encerrado). */
  periodoMes: { inicio: string; fim: string } | null;
}) {
  const dataChart = useMemo(
    () =>
      dias.map((d) => ({
        data: shortDate(d.data),
        chuva: d.precipitacao_mm,
        tmax: d.temperatura_max,
        tmin: d.temperatura_min,
        tmed: d.temperatura_media,
        umid: climateNumber(d.umidade_media),
      })),
    [dias],
  );

  const temperatura = (value: unknown) => formatChartNumber(value, (n) => `${Math.round(n)}°C`);
  // Data do último dia da série, tirada do próprio dado (com falha de sincronização pode ser antes de ontem).
  const ultimoDia = dias.length ? dias[dias.length - 1].data : null;
  const periodoGrafico = ultimoDia ? `últimos ${dias.length} dias encerrados, até ${ultimoDia}` : `últimos ${dias.length} dias encerrados`;

  return (
    <div className="space-y-8">
      {/* Resumo do mês, do dia 1 até ontem (só dias encerrados) */}
      {resumo && periodoMes && (
        <section aria-labelledby="resumo-mes" className="space-y-3">
          <h2 id="resumo-mes" className="text-lg font-semibold text-foreground">
            Resumo do mês ({periodoMes.inicio} a {periodoMes.fim}, dias já encerrados)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="stat-card text-center">
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Chuva no mês</p>
              <p className="text-2xl font-extrabold text-sky-500 mt-1">{formatChartNumber(resumo.acumulado_mm, (n) => `${n} mm`)}</p>
              <p className="text-xs text-muted-foreground">{formatChartNumber(resumo.dias_com_chuva, (n) => `${n} dias com chuva`)}</p>
            </div>
            <div className="stat-card text-center">
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Temp. média</p>
              <p className="text-2xl font-extrabold text-emerald-500 mt-1">{formatChartNumber(resumo.temperatura_media, (n) => `${n}°C`)}</p>
              <p className="text-xs text-muted-foreground">média dos dias com dado</p>
            </div>
            <div className="stat-card text-center">
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Máxima</p>
              <p className="text-2xl font-extrabold text-orange-500 mt-1">
                {temperatura(resumo.temperatura_max_absoluta)}
              </p>
              <p className="text-xs text-muted-foreground">no mês</p>
            </div>
            <div className="stat-card text-center">
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Mínima</p>
              <p className="text-2xl font-extrabold text-sky-600 mt-1">
                {temperatura(resumo.temperatura_min_absoluta)}
              </p>
              <p className="text-xs text-muted-foreground">no mês</p>
            </div>
          </div>
        </section>
      )}

      {/* Gráfico chuva */}
      <section>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
          <CloudRain className="w-5 h-5 text-sky-500" /> Chuva diária ({periodoGrafico})
        </h2>
        <div className="stat-card h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataChart} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="data" fontSize={11} />
              <YAxis fontSize={11} unit=" mm" />
              <Tooltip
                filterNull={false}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={numericTooltip((v) => [`${v.toFixed(1)} mm`, "Chuva"])}
              />
              <Bar dataKey="chuva" name="Chuva" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Gráfico temperatura */}
      <section>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
          <Thermometer className="w-5 h-5 text-orange-500" /> Temperatura diária ({periodoGrafico})
        </h2>
        <div className="stat-card h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataChart} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="data" fontSize={11} />
              <YAxis fontSize={11} unit="°C" domain={["dataMin - 2", "dataMax + 2"]} />
              <Tooltip
                filterNull={false}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={numericTooltip((v, name) => [`${v.toFixed(1)}°C`, name])}
              />
              <ReferenceLine y={28} stroke="hsl(20, 90%, 50%)" strokeDasharray="3 3" opacity={0.4} />
              <Line type="monotone" dataKey="tmax" name="Máxima" stroke="hsl(20, 90%, 55%)" strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
              <Line type="monotone" dataKey="tmed" name="Média" stroke="hsl(160, 60%, 45%)" strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
              <Line type="monotone" dataKey="tmin" name="Mínima" stroke="hsl(199, 89%, 48%)" strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          🟧 Máxima · 🟢 Média · 🟦 Mínima. Os gráficos só mostram dias já encerrados; o dia de hoje está
          na previsão do tempo, no alto da página.
        </p>
      </section>
    </div>
  );
}
