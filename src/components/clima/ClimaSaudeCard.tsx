import Link from "next/link";
import { CloudRain, AlertTriangle, ArrowRight } from "lucide-react";
import { fetchClimaSerieDias } from "@/lib/data/clima";
import { climateNumber } from "@/lib/climate-measurements";

export default async function ClimaSaudeCard() {
  const dias = await fetchClimaSerieDias(7);
  const medicoes = dias.map((dia) => climateNumber(dia.precipitacao_mm)).filter((value): value is number => value !== null);
  if (!medicoes.length) return null;
  const parcial = medicoes.length !== dias.length;

  const chuvaSemana = Math.round(
    medicoes.reduce((sum, value) => sum + value, 0) * 10,
  ) / 10;
  const diasComChuva = medicoes.filter((value) => value > 0.1).length;

  // Heuristica: chuva > 10mm na semana = risco aumentado de criadouros
  const risco = chuvaSemana > 30 ? "alto" : chuvaSemana > 10 ? "moderado" : "baixo";
  const corRisco = parcial ? "border-border" : risco === "alto" ? "border-red-500/30 bg-red-500/5" :
                   risco === "moderado" ? "border-amber-500/30 bg-amber-500/5" :
                   "border-emerald-500/30 bg-emerald-500/5";
  const corText = risco === "alto" ? "text-red-600" :
                  risco === "moderado" ? "text-amber-600" :
                  "text-emerald-600";

  return (
    <Link href="/clima" className={`stat-card card-hover ${corRisco} flex items-center gap-3 group`}>
      <div className="w-12 h-12 rounded-full bg-sky-500/10 flex items-center justify-center shrink-0">
        <CloudRain className="w-6 h-6 text-sky-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm uppercase tracking-wider text-muted-foreground">
          Chuva últimos 7 dias
        </p>
        <p className="text-base font-semibold text-foreground">
          {chuvaSemana} mm
          <span className="text-sm font-normal text-muted-foreground ml-2">
            · {diasComChuva} dia{diasComChuva !== 1 ? "s" : ""} com chuva
          </span>
        </p>
        {parcial ? <p className="mt-0.5 text-sm text-muted-foreground">Acumulado parcial: há dias sem medição de chuva.</p> : <p className={`text-sm mt-0.5 inline-flex items-center gap-1 ${corText}`}>
          {risco !== "baixo" && <AlertTriangle className="w-3 h-3" />}
          Risco de criadouros de mosquito: <span className="font-semibold capitalize">{risco}</span>
        </p>}
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-sky-500 transition-colors" />
    </Link>
  );
}
