import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type AtoCamara = {
  id: string;
  numero: string;
  ano: number | null;
  tipo: "MOCAO" | "REQUERIMENTO" | "PARECER" | "PAUTA_SESSAO" | "OUTRO";
  tipo_centi: string | null;
  data_publicacao: string | null;
  ementa: string | null;
  autor: string | null;
  vereador_id: string | null;
};

export const fetchAtosPorTipo = unstable_cache(
  async (tipo: AtoCamara["tipo"], limit = 100): Promise<AtoCamara[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("ato_camara")
      .select("id, numero, ano, tipo, tipo_centi, data_publicacao, ementa, autor, vereador_id")
      .eq("tipo", tipo)
      .order("data_publicacao", { ascending: false, nullsFirst: false })
      .limit(limit);
    return (data ?? []) as AtoCamara[];
  },
  ["atos-por-tipo"],
  { revalidate: 3600, tags: ["atos-camara"] },
);

export const fetchAtosPorVereador = unstable_cache(
  async (vereadorId: string): Promise<AtoCamara[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("ato_camara")
      .select("id, numero, ano, tipo, tipo_centi, data_publicacao, ementa, autor, vereador_id")
      .eq("vereador_id", vereadorId)
      .order("data_publicacao", { ascending: false, nullsFirst: false });
    return (data ?? []) as AtoCamara[];
  },
  ["atos-por-vereador"],
  { revalidate: 3600, tags: ["atos-camara"] },
);

export const fetchAtosStats = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("ato_camara")
      .select("tipo, ano");
    if (!data) return null;
    const porTipo = new Map<string, number>();
    const porAno = new Map<number, number>();
    for (const a of data) {
      porTipo.set(a.tipo, (porTipo.get(a.tipo) ?? 0) + 1);
      if (a.ano) porAno.set(a.ano, (porAno.get(a.ano) ?? 0) + 1);
    }
    return {
      total: data.length,
      por_tipo: Array.from(porTipo.entries()).map(([t, q]) => ({ tipo: t, quantidade: q })),
      por_ano: Array.from(porAno.entries()).map(([a, q]) => ({ ano: a, quantidade: q })).sort((a, b) => b.ano - a.ano),
    };
  },
  ["atos-stats"],
  { revalidate: 3600, tags: ["atos-camara"] },
);
