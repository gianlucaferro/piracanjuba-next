import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type ClimaDia = {
  data: string;
  temperatura_max: number | null;
  temperatura_min: number | null;
  temperatura_media: number | null;
  precipitacao_mm: number | null;
  umidade_media: number | null;
  vento_velocidade_max: number | null;
};

export type ResumoMes = {
  acumulado_mm: number;
  dias_com_chuva: number;
  temperatura_media: number;
  temperatura_max_absoluta: number;
  temperatura_min_absoluta: number;
};

export const fetchClimaUltimoDia = unstable_cache(
  async (): Promise<ClimaDia | null> => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("inmet_clima_diario")
      .select("data,temperatura_max,temperatura_min,temperatura_media,precipitacao_mm,umidade_media,vento_velocidade_max")
      .order("data", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data as ClimaDia;
  },
  ["clima-ultimo-dia"],
  { revalidate: 900, tags: ["clima"] },
);

export const fetchClimaSerieDias = unstable_cache(
  async (dias = 30): Promise<ClimaDia[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("inmet_clima_diario")
      .select("data,temperatura_max,temperatura_min,temperatura_media,precipitacao_mm,umidade_media,vento_velocidade_max")
      .order("data", { ascending: false })
      .limit(dias);
    return ((data ?? []) as ClimaDia[]).reverse();
  },
  ["clima-serie-dias"],
  { revalidate: 1800, tags: ["clima"] },
);

export const fetchClimaResumoMes = unstable_cache(
  async (): Promise<ResumoMes | null> => {
    const supabase = createPublicSupabaseClient();
    const inicio = new Date();
    inicio.setUTCDate(1);
    const inicioStr = inicio.toISOString().slice(0, 10);

    const { data } = await supabase
      .from("inmet_clima_diario")
      .select("temperatura_max,temperatura_min,temperatura_media,precipitacao_mm")
      .gte("data", inicioStr);

    if (!data?.length) return null;
    const chuvas = data.map((d) => Number(d.precipitacao_mm ?? 0));
    const tempMax = data.map((d) => Number(d.temperatura_max)).filter((n) => !isNaN(n));
    const tempMin = data.map((d) => Number(d.temperatura_min)).filter((n) => !isNaN(n));
    const tempMed = data.map((d) => Number(d.temperatura_media)).filter((n) => !isNaN(n));

    return {
      acumulado_mm: Math.round(chuvas.reduce((a, b) => a + b, 0) * 10) / 10,
      dias_com_chuva: chuvas.filter((c) => c > 0.1).length,
      temperatura_media: tempMed.length ? Math.round((tempMed.reduce((a, b) => a + b, 0) / tempMed.length) * 10) / 10 : 0,
      temperatura_max_absoluta: tempMax.length ? Math.max(...tempMax) : 0,
      temperatura_min_absoluta: tempMin.length ? Math.min(...tempMin) : 0,
    };
  },
  ["clima-resumo-mes"],
  { revalidate: 1800, tags: ["clima"] },
);
