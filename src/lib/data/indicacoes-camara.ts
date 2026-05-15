import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type IndicacaoCamara = {
  id: string;
  numero: string;
  numero_ano: number | null;
  ano: number | null;
  tipo: string;
  data_publicacao: string | null;
  ementa: string | null;
  autor: string | null;
  destinatario: string | null;
  vereador_id: string | null;
};

export const fetchIndicacoesRecentes = unstable_cache(
  async (limit = 50): Promise<IndicacaoCamara[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("indicacao_camara")
      .select("*")
      .order("data_publicacao", { ascending: false, nullsFirst: false })
      .limit(limit);
    return (data ?? []) as IndicacaoCamara[];
  },
  ["indicacoes-recentes"],
  { revalidate: 3600, tags: ["indicacoes-camara"] },
);

export const fetchIndicacoesPorVereador = unstable_cache(
  async (vereadorId: string): Promise<IndicacaoCamara[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("indicacao_camara")
      .select("*")
      .eq("vereador_id", vereadorId)
      .order("data_publicacao", { ascending: false, nullsFirst: false });
    return (data ?? []) as IndicacaoCamara[];
  },
  ["indicacoes-por-vereador"],
  { revalidate: 3600, tags: ["indicacoes-camara"] },
);

export const fetchIndicacoesStats = unstable_cache(
  async (): Promise<{ total: number; ano_2026: number; ano_2025: number; ultima_data: string | null }> => {
    const supabase = createPublicSupabaseClient();
    const { count: total } = await supabase
      .from("indicacao_camara")
      .select("*", { count: "exact", head: true });
    const { count: ano2026 } = await supabase
      .from("indicacao_camara")
      .select("*", { count: "exact", head: true })
      .eq("ano", 2026);
    const { count: ano2025 } = await supabase
      .from("indicacao_camara")
      .select("*", { count: "exact", head: true })
      .eq("ano", 2025);
    const { data: ultima } = await supabase
      .from("indicacao_camara")
      .select("data_publicacao")
      .order("data_publicacao", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    return {
      total: total ?? 0,
      ano_2026: ano2026 ?? 0,
      ano_2025: ano2025 ?? 0,
      ultima_data: ultima?.data_publicacao ?? null,
    };
  },
  ["indicacoes-stats"],
  { revalidate: 3600, tags: ["indicacoes-camara"] },
);
