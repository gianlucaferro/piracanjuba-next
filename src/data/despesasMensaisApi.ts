import { supabase } from "@/integrations/supabase/client";

export type DespesaMensal = {
  id: string;
  competencia: string;
  valor_empenhado: number;
  valor_liquidado: number;
  valor_pago: number;
  fonte_nome: string;
  fonte_url: string;
  metodologia: string;
  escopo: string;
  data_coleta: string;
  updated_at: string;
};

export async function fetchDespesasMensais(): Promise<DespesaMensal[]> {
  const { data, error } = await supabase
    .from("despesas_mensais")
    .select(
      "id, competencia, valor_empenhado, valor_liquidado, valor_pago, fonte_nome, fonte_url, metodologia, escopo, data_coleta, updated_at",
    )
    .order("competencia", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DespesaMensal[];
}
