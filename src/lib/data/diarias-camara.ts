import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type DiariaCamara = {
  id: string;
  favorecido: string;
  cargo: string | null;
  destino: string | null;
  cidade: string | null;
  valor: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  quantidade: number | null;
  descricao: string | null;
  vereador_id: string | null;
};

export type DiariaStats = {
  total_diarias: number;
  total_valor: number;
  total_vereadores_distintos: number;
  ultima_data: string | null;
};

export const fetchDiariasPorVereador = unstable_cache(
  async (vereadorId: string): Promise<DiariaCamara[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("diaria_camara")
      .select("id, favorecido, cargo, destino, cidade, valor, data_inicio, data_fim, quantidade, descricao, vereador_id")
      .eq("vereador_id", vereadorId)
      .order("data_inicio", { ascending: false, nullsFirst: false });
    return (data ?? []) as DiariaCamara[];
  },
  ["diarias-por-vereador"],
  { revalidate: 3600, tags: ["diarias-camara"] },
);

export const fetchDiariasRanking = unstable_cache(
  async (): Promise<Array<{ vereador_id: string; nome: string; total_diarias: number; total_valor: number }>> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("diaria_camara")
      .select("vereador_id, valor, vereadores!inner(nome, slug)")
      .not("vereador_id", "is", null);
    if (!data) return [];

    const grouped = new Map<string, { nome: string; total_diarias: number; total_valor: number }>();
    for (const d of data as unknown as Array<{
      vereador_id: string;
      valor: number | null;
      vereadores: { nome: string };
    }>) {
      const cur = grouped.get(d.vereador_id) ?? { nome: d.vereadores.nome, total_diarias: 0, total_valor: 0 };
      cur.total_diarias++;
      cur.total_valor += Number(d.valor) || 0;
      grouped.set(d.vereador_id, cur);
    }
    return Array.from(grouped.entries())
      .map(([vereador_id, stats]) => ({ vereador_id, ...stats }))
      .sort((a, b) => b.total_valor - a.total_valor);
  },
  ["diarias-ranking"],
  { revalidate: 3600, tags: ["diarias-camara"] },
);

export const fetchDiariasStats = unstable_cache(
  async (): Promise<DiariaStats> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("diaria_camara")
      .select("valor, vereador_id, data_inicio");
    if (!data) return { total_diarias: 0, total_valor: 0, total_vereadores_distintos: 0, ultima_data: null };
    const totalValor = data.reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
    const vereadores = new Set(data.map((d) => d.vereador_id).filter(Boolean));
    const datas = data.map((d) => d.data_inicio).filter(Boolean).sort();
    return {
      total_diarias: data.length,
      total_valor: totalValor,
      total_vereadores_distintos: vereadores.size,
      ultima_data: datas.length ? datas[datas.length - 1] : null,
    };
  },
  ["diarias-stats"],
  { revalidate: 3600, tags: ["diarias-camara"] },
);
