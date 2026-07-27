import { supabase } from "@/integrations/supabase/client";

export type EsferaReceita = "federal" | "estadual" | "municipal";

export type ReceitaMensal = {
  id: string;
  competencia: string;
  esfera: EsferaReceita;
  categoria: string;
  categoria_ordem: number;
  valor_bruto: number;
  deducoes: number;
  valor_liquido: number;
  fonte_nome: string;
  fonte_url: string;
  metodologia: string;
  registros_fonte: number;
  data_coleta: string;
  updated_at: string;
};

export async function fetchReceitasMensais(): Promise<ReceitaMensal[]> {
  const { data, error } = await supabase
    .from("receitas_mensais")
    .select(
      "id, competencia, esfera, categoria, categoria_ordem, valor_bruto, deducoes, valor_liquido, fonte_nome, fonte_url, metodologia, registros_fonte, data_coleta, updated_at",
    )
    .order("competencia", { ascending: false })
    .order("categoria_ordem", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ReceitaMensal[];
}
