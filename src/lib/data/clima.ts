import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { summarizeClimateMonth, type ResumoMes } from "@/lib/climate-measurements";
import {
  MAX_DIAS_PREVISAO,
  hojeEmBrasilia,
  janelaDiasEncerrados,
  montarPainelClima,
  periodoMesEncerrado,
  somarDias,
  ultimoDiaEncerrado,
  type ClimaPainel,
} from "@/lib/clima-painel";
export type { ResumoMes } from "@/lib/climate-measurements";
export type { ClimaAgora, ClimaPainel, ClimaPrevisaoDia } from "@/lib/clima-painel";

export type ClimaDia = {
  data: string;
  temperatura_max: number | null;
  temperatura_min: number | null;
  temperatura_media: number | null;
  precipitacao_mm: number | null;
  umidade_media: number | null;
  vento_velocidade_max: number | null;
};

export type ChuvaMensal = Record<number, number>; // {1: 252.5, 2: 190.7, ...}

/**
 * Chuva mensal acumulada de UM ano especifico, lida da tabela
 * clima_historico_mensal (populada por sync-clima-historico semanal).
 * Dados imediatos pra qualquer ano de 2018-presente sem chamar API externa.
 */
export const fetchChuvaHistoricaMensal = unstable_cache(
  async (ano: number): Promise<ChuvaMensal> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("clima_historico_mensal")
      .select("mes, precipitacao_acumulada_mm")
      .eq("ano", ano);
    const out: ChuvaMensal = {};
    for (const row of data ?? []) {
      out[Number(row.mes)] = Number(row.precipitacao_acumulada_mm) || 0;
    }
    return out;
  },
  ["clima-historico-mensal"],
  { revalidate: 86400, tags: ["clima"] },
);

/**
 * Media historica de chuva por mes calculada sobre uma janela de anos
 * (ex: 2018-2025). Util pra benchmark "ano corrente vs media historica".
 */
export const fetchChuvaMediaHistorica = unstable_cache(
  async (anoInicio: number, anoFim: number): Promise<ChuvaMensal> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("clima_historico_mensal")
      .select("ano, mes, precipitacao_acumulada_mm")
      .gte("ano", anoInicio)
      .lte("ano", anoFim);

    const valoresPorMes: Record<number, number[]> = {};
    for (const row of data ?? []) {
      const m = Number(row.mes);
      valoresPorMes[m] = valoresPorMes[m] ?? [];
      valoresPorMes[m].push(Number(row.precipitacao_acumulada_mm) || 0);
    }
    const out: ChuvaMensal = {};
    for (let m = 1; m <= 12; m++) {
      const vals = valoresPorMes[m] ?? [];
      out[m] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    }
    return out;
  },
  ["clima-media-historica"],
  { revalidate: 86400, tags: ["clima"] },
);

/**
 * Soma de precipitacao nos ultimos N dias encerrados (de hoje - N a ontem) calculada do
 * diario da Open-Meteo (sync a cada 15 min). A tabela tambem guarda a previsao dos proximos
 * dias, e a linha de hoje soma a chuva ja calculada com a prevista para o resto do dia, entao
 * a janela para em ontem (data de Brasilia).
 */
const chuvaUltimosDiasCache = unstable_cache(
  async (dias: number, hoje: string): Promise<{ total: number; dias_com_chuva: number }> => {
    const supabase = createPublicSupabaseClient();
    const { inicio, fim } = janelaDiasEncerrados(hoje, dias);

    const { data } = await supabase
      .from("inmet_clima_diario")
      .select("precipitacao_mm")
      .gte("data", inicio)
      .lte("data", fim);

    const valores = (data ?? []).map((r) => Number(r.precipitacao_mm ?? 0));
    return {
      total: Math.round(valores.reduce((s, v) => s + v, 0) * 10) / 10,
      dias_com_chuva: valores.filter((v) => v > 0.1).length,
    };
  },
  ["clima-ultimos-dias-encerrados"],
  { revalidate: 1800, tags: ["clima"] },
);

export function fetchChuvaUltimosDias(dias: number) {
  return chuvaUltimosDiasCache(dias, hojeEmBrasilia());
}

const COLUNAS_DIA = "data,temperatura_max,temperatura_min,temperatura_media,precipitacao_mm,umidade_media,vento_velocidade_max";

/** Linha mais recente ate hoje (nunca um dia de previsao). */
const climaUltimoDiaCache = unstable_cache(
  async (hoje: string): Promise<ClimaDia | null> => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("inmet_clima_diario")
      .select(COLUNAS_DIA)
      .lte("data", hoje)
      .order("data", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data as ClimaDia;
  },
  ["clima-ultimo-dia-ate-hoje"],
  { revalidate: 900, tags: ["clima"] },
);

export function fetchClimaUltimoDia() {
  return climaUltimoDiaCache(hojeEmBrasilia());
}

/**
 * Ultimos N dias encerrados (ate ontem), em ordem crescente. A linha de hoje fica de fora:
 * a chuva dela inclui a previsao do resto do dia e a media e a temperatura do momento.
 */
const climaSerieDiasCache = unstable_cache(
  async (dias: number, hoje: string): Promise<ClimaDia[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("inmet_clima_diario")
      .select(COLUNAS_DIA)
      .lte("data", ultimoDiaEncerrado(hoje))
      .order("data", { ascending: false })
      .limit(dias);
    return ((data ?? []) as ClimaDia[]).reverse();
  },
  ["clima-serie-dias-encerrados"],
  { revalidate: 1800, tags: ["clima"] },
);

export function fetchClimaSerieDias(dias = 30) {
  return climaSerieDiasCache(dias, hojeEmBrasilia());
}

/**
 * Resumo do mes corrente de Brasilia, so com dias encerrados (do dia 1 ate ontem). No dia 1
 * ainda nao ha dia encerrado no mes e o resumo fica sem dado.
 */
const climaResumoMesCache = unstable_cache(
  async (hoje: string): Promise<ResumoMes | null> => {
    const periodo = periodoMesEncerrado(hoje);
    if (!periodo) return null;
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("inmet_clima_diario")
      .select("temperatura_max,temperatura_min,temperatura_media,precipitacao_mm")
      .gte("data", periodo.inicio)
      .lte("data", periodo.fim);

    return summarizeClimateMonth(data ?? []);
  },
  ["clima-resumo-mes-encerrado"],
  { revalidate: 1800, tags: ["clima"] },
);

export function fetchClimaResumoMes() {
  return climaResumoMesCache(hojeEmBrasilia());
}

/**
 * Painel de /clima e do selo da home: leitura atual (com horario), dia de hoje e
 * previsao dos dias seguintes. Le de ontem em diante porque a leitura atual pode
 * estar gravada na linha de ontem ou de amanha (ver montarPainelClima).
 * Revalida a cada 15 min, o mesmo intervalo do cron sync-inmet-clima-15min.
 */
const climaPainelCache = unstable_cache(
  async (hoje: string): Promise<ClimaPainel> => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("inmet_clima_diario")
      .select(`${COLUNAS_DIA},atual:raw_json->current_at_sync`)
      .gte("data", somarDias(hoje, -1))
      .order("data", { ascending: true })
      .limit(MAX_DIAS_PREVISAO + 3);
    if (error) throw new Error("Falha ao ler o painel de clima");
    return montarPainelClima((data ?? []) as unknown as Parameters<typeof montarPainelClima>[0], hoje);
  },
  ["clima-painel"],
  { revalidate: 900, tags: ["clima"] },
);

export function fetchClimaPainel() {
  return climaPainelCache(hojeEmBrasilia());
}
