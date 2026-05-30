import "server-only";
import { unstable_cache } from "next/cache";

// Coordenadas de Piracanjuba-GO
const LAT = -17.3;
const LON = -49.0;

export type RiscoFogoData = {
  // Últimos 30 dias de dados diários
  historico: Array<{
    data: string;
    chuva_mm: number;
    temp_max: number;
    vento_max: number;
    evap: number;
    risco: "baixo" | "moderado" | "alto" | "critico";
  }>;
  // Hoje
  hoje: {
    data: string;
    chuva_mm: number;
    temp_max: number;
    vento_max: number;
    evap: number;
    risco: "baixo" | "moderado" | "alto" | "critico";
    score: number;
  };
  // Días consecutivos sem chuva significativa (>1mm)
  dias_sem_chuva: number;
  // Média de chuva nos últimos 30 dias
  media_chuva_30d: number;
  fonte: string;
};

/**
 * Calcula índice de risco de fogo local com base em variáveis meteorológicas.
 * Metodologia simplificada inspirada no FWI (Fire Weather Index) canadense:
 * - Ausência de chuva recente (principal fator)
 * - Temperatura máxima alta
 * - Vento forte
 * - Alta evapotranspiração (secura do ar)
 *
 * Score 0-100:
 *   < 25 → baixo
 *   25-50 → moderado
 *   50-75 → alto
 *   > 75 → crítico
 */
function calcularRisco(
  chuva_mm: number,
  temp_max: number,
  vento_max: number,
  evap: number,
  dias_sem_chuva: number,
): { risco: "baixo" | "moderado" | "alto" | "critico"; score: number } {
  let score = 0;

  // Componente principal: seca (0-40 pontos)
  // Cada dia sem chuva adiciona pontos, chuva hoje zera parcialmente
  const secaBase = Math.min(dias_sem_chuva * 2.5, 35);
  const reducaoChuva = chuva_mm > 10 ? -20 : chuva_mm > 5 ? -10 : chuva_mm > 1 ? -5 : 0;
  score += Math.max(0, secaBase + reducaoChuva);

  // Temperatura (0-25 pontos)
  if (temp_max >= 38) score += 25;
  else if (temp_max >= 35) score += 18;
  else if (temp_max >= 32) score += 12;
  else if (temp_max >= 28) score += 6;
  else score += 0;

  // Vento (0-20 pontos)
  if (vento_max >= 40) score += 20;
  else if (vento_max >= 25) score += 14;
  else if (vento_max >= 15) score += 8;
  else score += 3;

  // Evapotranspiração (0-15 pontos) — medida de secura do ar
  if (evap >= 7) score += 15;
  else if (evap >= 5) score += 10;
  else if (evap >= 3) score += 5;
  else score += 0;

  score = Math.min(100, Math.max(0, score));

  const risco =
    score >= 75 ? "critico" :
    score >= 50 ? "alto" :
    score >= 25 ? "moderado" : "baixo";

  return { risco, score };
}

async function fetchRiscoFogoUncached(): Promise<RiscoFogoData | null> {
  try {
    const resp = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&daily=precipitation_sum,temperature_2m_max,wind_speed_10m_max,et0_fao_evapotranspiration` +
      `&past_days=30&forecast_days=1&timezone=America%2FSao_Paulo`,
      { next: { revalidate: 3600 } },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const d = data.daily ?? {};

    const times: string[] = d.time ?? [];
    const chuvas: number[] = d.precipitation_sum ?? [];
    const temps: number[] = d.temperature_2m_max ?? [];
    const ventos: number[] = d.wind_speed_10m_max ?? [];
    const evaps: number[] = d.et0_fao_evapotranspiration ?? [];

    if (times.length === 0) return null;

    // Calcular dias consecutivos sem chuva (contando do dia mais recente)
    let dias_sem_chuva = 0;
    for (let i = times.length - 1; i >= 0; i--) {
      if ((chuvas[i] ?? 0) < 1) {
        dias_sem_chuva++;
      } else {
        break;
      }
    }

    const media_chuva_30d =
      chuvas.slice(0, -1).reduce((s, v) => s + (v ?? 0), 0) /
      Math.max(1, chuvas.slice(0, -1).length);

    // Montar histórico
    const historico = times.slice(0, -1).map((data, i) => {
      const { risco } = calcularRisco(
        chuvas[i] ?? 0,
        temps[i] ?? 25,
        ventos[i] ?? 10,
        evaps[i] ?? 3,
        0, // simplificado pra histórico
      );
      return {
        data,
        chuva_mm: chuvas[i] ?? 0,
        temp_max: temps[i] ?? 25,
        vento_max: ventos[i] ?? 10,
        evap: evaps[i] ?? 3,
        risco,
      };
    });

    // Hoje (último elemento)
    const idxHoje = times.length - 1;
    const { risco, score } = calcularRisco(
      chuvas[idxHoje] ?? 0,
      temps[idxHoje] ?? 25,
      ventos[idxHoje] ?? 10,
      evaps[idxHoje] ?? 3,
      dias_sem_chuva,
    );

    return {
      historico,
      hoje: {
        data: times[idxHoje],
        chuva_mm: chuvas[idxHoje] ?? 0,
        temp_max: temps[idxHoje] ?? 25,
        vento_max: ventos[idxHoje] ?? 10,
        evap: evaps[idxHoje] ?? 3,
        risco,
        score,
      },
      dias_sem_chuva,
      media_chuva_30d,
      fonte: "Open-Meteo (ERA5/GFS) + metodologia FWI",
    };
  } catch {
    return null;
  }
}

export const fetchRiscoFogo = unstable_cache(
  fetchRiscoFogoUncached,
  ["risco-fogo-piracanjuba"],
  { revalidate: 3600, tags: ["risco-fogo"] },
);
