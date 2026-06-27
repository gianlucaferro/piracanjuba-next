import Link from "next/link";
import { CloudRain, Droplets } from "lucide-react";
import { fetchClimaUltimoDia } from "@/lib/data/clima";
import ClimaHeroIcon from "./ClimaHeroIcon";

export default async function ClimaHeroBadge() {
  const dia = await fetchClimaUltimoDia();
  if (!dia) return null;

  const tempMed = Math.round(Number(dia.temperatura_media ?? 0));
  const tempMax = Math.round(Number(dia.temperatura_max ?? 0));
  const tempMin = Math.round(Number(dia.temperatura_min ?? 0));
  const chuva = Number(dia.precipitacao_mm ?? 0);
  const umid = Math.round(Number(dia.umidade_media ?? 0));

  return (
    <Link
      href="/clima"
      aria-label="Ver clima completo de Piracanjuba"
      // Mobile: canto superior esquerdo, layout compacto horizontal (acima/ao lado do logo).
      // Desktop (sm+): canto superior direito como antes.
      className="absolute top-2 left-3 right-auto sm:top-4 sm:right-4 sm:left-auto md:top-6 md:right-6 z-20 inline-flex items-center gap-2 sm:gap-3 px-2.5 py-1.5 sm:px-4 sm:py-3 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 transition-colors text-white shadow-lg"
    >
      <ClimaHeroIcon
        precipitacao={dia.precipitacao_mm}
        className="w-5 h-5 sm:w-8 sm:h-8 md:w-10 md:h-10"
      />
      <div className="text-left flex items-baseline gap-1.5 sm:block">
        <p className="text-xs sm:text-xs uppercase tracking-widest text-white/70 leading-none sm:mb-1 hidden sm:block">
          Piracanjuba agora
        </p>
        <p className="text-base sm:text-2xl md:text-3xl font-extrabold leading-none">
          {tempMed}°C
        </p>
        <p className="text-xs sm:text-xs text-white/80 sm:mt-1 inline-flex items-center gap-1 sm:gap-2 flex-wrap leading-none sm:leading-normal">
          <span>{tempMin}°/{tempMax}°</span>
          <span className="hidden sm:inline-flex items-center gap-1">
            <Droplets className="w-3 h-3" /> {umid}%
          </span>
          {chuva > 0.1 && (
            <span className="hidden sm:inline-flex items-center gap-1">
              <CloudRain className="w-3 h-3" /> {chuva.toFixed(1)}mm
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
