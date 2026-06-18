import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();

export type PrestacaoContasFiscal = {
  poder: "executivo" | "legislativo";
  ano: number;
  periodo_rgf: number | null;
  rcl: number | null;
  dtp: number | null;
  dtp_pct: number | null;
  limite_max: number | null;
  limite_max_pct: number | null;
  limite_prudencial: number | null;
  limite_prudencial_pct: number | null;
  limite_alerta: number | null;
  limite_alerta_pct: number | null;
  fonte_rgf_url: string | null;
  periodo_rreo: number | null;
  receita_prevista: number | null;
  receita_realizada: number | null;
  despesa_dotacao: number | null;
  despesa_empenhada: number | null;
  despesa_liquidada: number | null;
  despesa_paga: number | null;
  fonte_rreo_url: string | null;
  updated_at: string;
};

// Indicadores fiscais de prestação de contas (SICONFI / Tesouro Nacional), por poder,
// do mais recente para o mais antigo.
export async function fetchPrestacaoContasFiscal(
  poder: "executivo" | "legislativo",
): Promise<PrestacaoContasFiscal[]> {
  const { data, error } = await supabase
    .from("prestacao_contas_fiscal")
    .select("*")
    .eq("poder", poder)
    .order("ano", { ascending: false });
  if (error) throw error;
  return (data || []) as PrestacaoContasFiscal[];
}
