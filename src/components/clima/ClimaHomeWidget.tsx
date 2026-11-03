import Link from "next/link";
import { Cloud, CloudRain, Droplets, Sun, ArrowRight } from "lucide-react";
import { fetchClimaUltimoDia } from "@/lib/data/clima";
import { formatChartNumber } from "@/lib/chart-formatters";
import { climateNumber } from "@/lib/climate-measurements";

function ChuvaIcon({ precip, className }: { precip: number | null; className: string }) {
  if (precip === null) return <Cloud className={className} aria-hidden />;
  if ((precip ?? 0) > 1) return <CloudRain className={className} aria-hidden />;
  if ((precip ?? 0) > 0.1) return <Cloud className={className} aria-hidden />;
  return <Sun className={className} aria-hidden />;
}

function colorForTemp(t: number | null) {
  if (t == null) return "text-muted-foreground";
  if (t >= 32) return "text-orange-500";
  if (t >= 26) return "text-amber-500";
  if (t >= 18) return "text-emerald-500";
  return "text-sky-500";
}

export default async function ClimaHomeWidget() {
  const dia = await fetchClimaUltimoDia();
  if (!dia) return null;

  const tempColor = colorForTemp(climateNumber(dia.temperatura_media));
  const temperatura = (value: unknown) => formatChartNumber(value, (n) => `${Math.round(n)}°C`);

  return (
    <Link
      href="/clima"
      className="stat-card card-hover flex items-center gap-3 group border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent"
      aria-label="Clima atual em Piracanjuba"
    >
      <div className="w-12 h-12 rounded-full bg-sky-500/10 flex items-center justify-center shrink-0">
        <ChuvaIcon precip={dia.precipitacao_mm} className={`w-6 h-6 ${tempColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Clima em Piracanjuba</p>
        <p className="text-base font-semibold text-foreground inline-flex flex-wrap items-baseline gap-2">
          <span className={tempColor}>{temperatura(dia.temperatura_media)}</span>
          <span className="text-sm text-muted-foreground font-normal">
            Mín {temperatura(dia.temperatura_min)} · Máx {temperatura(dia.temperatura_max)}
          </span>
        </p>
        <p className="text-sm text-muted-foreground inline-flex flex-wrap items-center gap-2 mt-0.5">
          <span className="inline-flex items-center gap-1">
            <CloudRain className="w-3 h-3" /> {formatChartNumber(dia.precipitacao_mm, (n) => `${n.toFixed(1)} mm`)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Droplets className="w-3 h-3" /> {formatChartNumber(dia.umidade_media, (n) => `${Math.round(n)}%`)}
          </span>
          <span className="text-xs">· {dia.data}</span>
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-sky-500 transition-colors" />
    </Link>
  );
}
