import Link from "next/link";
import { CloudRain, Droplets } from "lucide-react";
import { fetchClimaPainel, type ClimaPainel } from "@/lib/data/clima";
import { formatarTemperatura, rotuloChuvaHoje, rotuloSeloClima } from "@/lib/clima-painel";
import ClimaHeroIcon from "./ClimaHeroIcon";

/**
 * Selo de clima da home. Mostra a leitura atual com data e hora (horário de Brasília);
 * sem leitura recente, mostra a previsão do dia rotulada como previsão. Nunca mostra um
 * dia futuro como se fosse o tempo atual (antes lia a última linha da tabela, que é previsão).
 */
export default async function ClimaHeroBadge() {
  let painel: ClimaPainel;
  try {
    painel = await fetchClimaPainel();
  } catch {
    return null;
  }

  const rotulo = rotuloSeloClima(painel);
  const { agora, diaHoje } = painel;
  if (!rotulo || (!agora && !diaHoje)) return null;

  // Temperatura principal: a leitura atual; sem ela, a máxima prevista para hoje.
  const temperaturaPrincipal = agora ? agora.temperatura : diaHoje?.temperatura_max ?? null;
  if (temperaturaPrincipal === null) return null;
  const umidade = agora ? agora.umidade : diaHoje?.umidade_media ?? null;
  const chuvaHoje = diaHoje?.precipitacao_mm ?? null;
  // A chuva de hoje soma as horas já passadas e a previsão para o resto do dia: vai como previsão.
  const chuvaHojeTexto = rotuloChuvaHoje(chuvaHoje);
  const ariaLabel = agora
    ? `Tempo agora em Piracanjuba: ${formatarTemperatura(agora.temperatura)} às ${agora.hora} de ${agora.data}. Ver previsão do tempo`
    : `Previsão do tempo em Piracanjuba para ${diaHoje?.data}. Ver previsão completa`;

  return (
    <Link
      href="/clima"
      aria-label={ariaLabel}
      // Mobile: canto superior esquerdo, layout compacto horizontal (acima/ao lado do logo).
      // Desktop (sm+): canto superior direito como antes.
      className="absolute top-2 left-3 right-auto sm:top-4 sm:right-4 sm:left-auto md:top-6 md:right-6 z-20 inline-flex items-center gap-2 sm:gap-3 px-2.5 py-1.5 sm:px-4 sm:py-3 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 transition-colors text-white shadow-lg"
    >
      <ClimaHeroIcon
        precipitacao={agora ? agora.precipitacao : chuvaHoje}
        className="w-5 h-5 sm:w-8 sm:h-8 md:w-10 md:h-10"
      />
      <div className="text-left flex items-baseline gap-1.5 sm:block">
        <p className="text-xs sm:text-xs uppercase tracking-widest text-white/70 leading-none sm:mb-1 hidden sm:block">
          Piracanjuba · {rotulo}
        </p>
        <p className="text-base sm:text-2xl md:text-3xl font-extrabold leading-none">
          {formatarTemperatura(temperaturaPrincipal)}
          {/* No celular o rótulo "Previsão para ..." fica oculto: o qualificador aparece aqui. */}
          {!agora && <span className="text-xs font-semibold text-white/80 sm:sr-only"> máx. prevista</span>}
        </p>
        <p className="text-xs sm:text-xs text-white/80 sm:mt-1 inline-flex items-center gap-1 sm:gap-2 flex-wrap leading-none sm:leading-normal">
          {diaHoje && diaHoje.temperatura_min !== null && diaHoje.temperatura_max !== null && (
            <span className="hidden sm:inline">
              Hoje: mín {formatarTemperatura(diaHoje.temperatura_min)} · máx {formatarTemperatura(diaHoje.temperatura_max)}
            </span>
          )}
          {umidade !== null && (
            <span className="hidden sm:inline-flex items-center gap-1">
              <Droplets className="w-3 h-3" /> {Math.round(umidade)}%
            </span>
          )}
          {chuvaHojeTexto && (
            <span className="hidden sm:inline-flex items-center gap-1">
              <CloudRain className="w-3 h-3" /> {chuvaHojeTexto}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
