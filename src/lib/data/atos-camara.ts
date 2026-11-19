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
    const { data, error } = await supabase
      .from("ato_camara")
      .select("id, numero, ano, tipo, tipo_centi, data_publicacao, ementa, autor, vereador_id")
      .eq("tipo", tipo)
      .order("data_publicacao", { ascending: false, nullsFirst: false })
      .limit(limit);
    // Erro do Supabase lança, para o unstable_cache não guardar uma lista vazia falsa por 1 hora
    // (revisão do CodeRabbit no PR 56, 2026-11-19); quem chama trata a falha.
    if (error) throw error;
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
