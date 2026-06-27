import { Flame, Droplets, Wind, Thermometer, ExternalLink, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { fetchRiscoFogo } from "@/lib/data/risco-fogo";

const RISCO_CONFIG = {
  baixo: {
    label: "Baixo",
    cor: "text-emerald-700",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    barra: "bg-emerald-500",
    desc: "Condições favoráveis — vegetação úmida e ventos moderados.",
  },
  moderado: {
    label: "Moderado",
    cor: "text-amber-700",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    barra: "bg-amber-500",
    desc: "Atenção: período de estiagem em desenvolvimento. Evite queimadas.",
  },
  alto: {
    label: "Alto",
    cor: "text-orange-700",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    barra: "bg-orange-500",
    desc: "Risco elevado de propagação de fogo. Não faça queimadas.",
  },
  critico: {
    label: "Crítico",
    cor: "text-red-700",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    barra: "bg-red-500",
    desc: "Situação crítica: alta temperatura, estiagem prolongada e ventos fortes.",
  },
};

function fmtNum(n: number, dec = 1) {
  return n.toFixed(dec);
}

export default async function QueimadasCard() {
  const dados = await fetchRiscoFogo();
  if (!dados) return null;

  const cfg = RISCO_CONFIG[dados.hoje.risco];
  const isCriticoOuAlto = dados.hoje.risco === "critico" || dados.hoje.risco === "alto";

  // Sparkline: últimos 14 dias de score de risco (0-100) baseado só em chuva para simplicidade
  const ultimos14 = dados.historico.slice(-14);
  const maxChuva = Math.max(...ultimos14.map((d) => d.chuva_mm), 1);

  return (
    <section
      aria-labelledby="queimadas-heading"
      className={`rounded-2xl border ${cfg.border} bg-gradient-to-br ${cfg.bg} to-transparent p-5 md:p-6 space-y-4`}
    >
      <header className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
          <Flame className={`w-5 h-5 ${cfg.cor}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 id="queimadas-heading" className="text-base font-bold text-foreground">
              Risco de Fogo — Piracanjuba
            </h3>
            {isCriticoOuAlto && (
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-orange-700 bg-orange-500/15 px-2 py-0.5 rounded">
                <AlertTriangle className="w-3 h-3" /> Alerta
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Índice local baseado em temperatura, vento, chuva e evaporação.
          </p>
        </div>
      </header>

      {/* Score principal */}
      <div className={`rounded-xl ${cfg.bg} border ${cfg.border} p-4 space-y-3`}>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Nível de risco hoje
            </p>
            <p className={`text-3xl font-extrabold ${cfg.cor} leading-none mt-1`}>
              {cfg.label}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{cfg.desc}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Score
            </p>
            <p className={`text-2xl font-extrabold ${cfg.cor} leading-none`}>
              {dados.hoje.score}
              <span className="text-sm font-normal text-muted-foreground">/100</span>
            </p>
          </div>
        </div>

        {/* Barra de progresso do score */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${cfg.barra}`}
            style={{ width: `${dados.hoje.score}%` }}
          />
        </div>
      </div>

      {/* Indicadores do dia */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-xl bg-background border border-border p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Droplets className="w-3.5 h-3.5 text-blue-600" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Chuva hoje
            </p>
          </div>
          <p className="text-lg font-extrabold text-foreground">{fmtNum(dados.hoje.chuva_mm)} mm</p>
          {dados.dias_sem_chuva > 0 && (
            <p className="text-xs text-amber-700 font-semibold mt-0.5">
              {dados.dias_sem_chuva}d sem chuva
            </p>
          )}
        </div>

        <div className="rounded-xl bg-background border border-border p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Thermometer className="w-3.5 h-3.5 text-orange-600" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Temp. máx.
            </p>
          </div>
          <p className="text-lg font-extrabold text-foreground">{fmtNum(dados.hoje.temp_max, 0)}°C</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evap: {fmtNum(dados.hoje.evap)} mm
          </p>
        </div>

        <div className="rounded-xl bg-background border border-border p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Wind className="w-3.5 h-3.5 text-slate-600" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Vento máx.
            </p>
          </div>
          <p className="text-lg font-extrabold text-foreground">{fmtNum(dados.hoje.vento_max, 0)} km/h</p>
        </div>

        <div className="rounded-xl bg-background border border-border p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Droplets className="w-3.5 h-3.5 text-blue-400" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Média 30d
            </p>
          </div>
          <p className="text-lg font-extrabold text-foreground">{fmtNum(dados.media_chuva_30d)} mm/d</p>
          <p className="text-xs text-muted-foreground mt-0.5">chuva/dia</p>
        </div>
      </div>

      {/* Sparkline de precipitação — 14 dias */}
      <div className="rounded-xl bg-background border border-border p-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
          Precipitação — últimos 14 dias (mm)
        </p>
        <div className="flex items-end gap-0.5 h-12" aria-hidden>
          {ultimos14.map((dia) => {
            const h = (dia.chuva_mm / maxChuva) * 100;
            const isRisco = dia.risco === "alto" || dia.risco === "critico";
            return (
              <div
                key={dia.data}
                className="flex-1 flex flex-col justify-end h-full"
                title={`${dia.data}: ${dia.chuva_mm.toFixed(1)}mm`}
              >
                <div
                  className={`w-full rounded-t ${isRisco ? "bg-orange-400/60" : "bg-blue-400"}`}
                  style={{ height: `${Math.max(h, 4)}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{ultimos14[0]?.data.slice(5)}</span>
          <span>hoje</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground border-t border-border/50 pt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>Fonte: Open-Meteo (ERA5/GFS) · Índice baseado em metodologia FWI (Fire Weather Index).</span>
        <Link
          href="https://terrabrasilis.dpi.inpe.br/queimadas/portal/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 underline hover:text-foreground"
        >
          Focos INPE em Goiás <ExternalLink className="w-3 h-3" />
        </Link>
      </p>
    </section>
  );
}
