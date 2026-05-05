import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type SaudeIndicador = {
  ano: number;
  mes: number | null;
  valor: number;
  valor_texto: string | null;
};

export type CovidSerieMes = {
  ano: number;
  mes: number;
  internacoes: number;
  obitos: number;
  internacoes_srag: number;
};

/**
 * Serie historica anual de obitos por categoria
 * (mortalidade_geral, mortalidade_infantil)
 */
export const fetchObitosAnuais = unstable_cache(
  async (categoria: string): Promise<SaudeIndicador[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("saude_indicadores")
      .select("ano, mes, valor, valor_texto")
      .eq("categoria", categoria)
      .eq("indicador", "obitos_anual")
      .order("ano", { ascending: true });
    return ((data ?? []) as SaudeIndicador[]).map((r) => ({
      ...r,
      valor: Number(r.valor),
    }));
  },
  ["obitos-anuais"],
  { revalidate: 86400, tags: ["saude"] },
);

/**
 * COVID-19: serie mensal de internacoes/obitos/SRAG (2020-2026)
 * Junta 3 indicadores em uma struct por mes.
 */
export const fetchCovidSerieMensal = unstable_cache(
  async (): Promise<CovidSerieMes[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("saude_indicadores")
      .select("ano, mes, indicador, valor")
      .eq("categoria", "covid")
      .in("indicador", ["internacoes_covid_mes", "obitos_covid_mes", "internacoes_srag_total_mes"])
      .order("ano", { ascending: true })
      .order("mes", { ascending: true });

    const map = new Map<string, CovidSerieMes>();
    for (const row of (data ?? []) as { ano: number; mes: number | null; indicador: string; valor: number }[]) {
      if (!row.mes) continue;
      const key = `${row.ano}-${row.mes}`;
      const cur = map.get(key) ?? {
        ano: row.ano,
        mes: row.mes,
        internacoes: 0,
        obitos: 0,
        internacoes_srag: 0,
      };
      const v = Number(row.valor) || 0;
      if (row.indicador === "internacoes_covid_mes") cur.internacoes = v;
      else if (row.indicador === "obitos_covid_mes") cur.obitos = v;
      else if (row.indicador === "internacoes_srag_total_mes") cur.internacoes_srag = v;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes,
    );
  },
  ["covid-serie-mensal"],
  { revalidate: 86400, tags: ["saude"] },
);

/**
 * Mortes por capitulo CID-10 (2026 — agregado todos os anos disponiveis no DB).
 * Retorna ordenado por valor desc.
 */
export const fetchMortesPorCausaCid = unstable_cache(
  async (): Promise<Array<{ causa: string; total: number }>> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("saude_indicadores")
      .select("valor, valor_texto")
      .eq("categoria", "mortalidade_geral")
      .eq("indicador", "obitos_causa_capitulo");
    return ((data ?? []) as { valor: number; valor_texto: string }[])
      .filter((r) => r.valor_texto && Number(r.valor) > 0)
      .map((r) => ({ causa: r.valor_texto, total: Number(r.valor) }))
      .sort((a, b) => b.total - a.total);
  },
  ["mortes-causa-cid"],
  { revalidate: 86400, tags: ["saude"] },
);

/**
 * HIV: serie de diagnosticos por ano em Piracanjuba (2010-2026).
 */
export const fetchHIVDiagnosticosAnuais = unstable_cache(
  async (): Promise<SaudeIndicador[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("saude_indicadores")
      .select("ano, mes, valor, valor_texto")
      .eq("categoria", "hiv")
      .eq("indicador", "diagnosticos_ano")
      .order("ano", { ascending: true });
    return ((data ?? []) as SaudeIndicador[]).map((r) => ({
      ...r,
      valor: Number(r.valor),
    }));
  },
  ["hiv-diagnosticos-anuais"],
  { revalidate: 86400, tags: ["saude"] },
);
