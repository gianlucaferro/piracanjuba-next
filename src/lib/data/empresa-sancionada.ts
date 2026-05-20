import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type ContratoComSancao = {
  contrato_id: string;
  numero: string | null;
  ano: number | null;
  fornecedor_cnpj_limpo: string;
  fornecedor_nome: string;
  valor: number | null;
  data_firmatura: string | null;
  inicio_vigencia: string | null;
  fim_vigencia: string | null;
  objeto: string | null;
  situacao: string | null;
  cadastro: "CEIS" | "CNEP";
  tipo_sancao: string | null;
  data_inicio_sancao: string | null;
  data_fim_sancao: string | null;
  orgao_sancionador: string | null;
  severidade: "critico" | "atencao" | "informativo";
};

export const fetchContratosComSancao = unstable_cache(
  async (): Promise<ContratoComSancao[]> => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("contrato_camara_com_sancao")
      .select("*")
      .order("data_inicio_sancao", { ascending: false, nullsFirst: false });
    if (error || !data) return [];
    return data as ContratoComSancao[];
  },
  ["contratos-com-sancao"],
  { revalidate: 60 * 60 * 6, tags: ["empresa-sancionada"] },
);
