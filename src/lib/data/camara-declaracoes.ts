import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type CamaraDeclaracao = {
  id: string;
  tipo:
    | "inexistencia_cotas"
    | "inexistencia_concursos"
    | "inexistencia_terceirizados"
    | "inexistencia_estagiarios"
    | "outros";
  titulo: string;
  texto: string;
  data_inicio_vigencia: string | null;
  data_fim_vigencia: string | null;
  data_assinatura: string | null;
  fonte_url: string;
  source: string;
  created_at: string;
};

export const fetchCamaraDeclaracoes = unstable_cache(
  async (): Promise<CamaraDeclaracao[]> => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("camara_declaracao")
      .select("*")
      .order("data_assinatura", { ascending: false, nullsFirst: false });
    if (error) {
      console.error("fetchCamaraDeclaracoes error:", error);
      return [];
    }
    return (data ?? []) as CamaraDeclaracao[];
  },
  ["camara-declaracoes"],
  { revalidate: 86400, tags: ["camara-declaracoes"] },
);

export async function fetchCamaraDeclaracaoByTipo(
  tipo: CamaraDeclaracao["tipo"],
): Promise<CamaraDeclaracao | null> {
  const all = await fetchCamaraDeclaracoes();
  return all.find((d) => d.tipo === tipo) ?? null;
}
