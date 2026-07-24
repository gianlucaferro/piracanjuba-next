import { supabase } from "@/integrations/supabase/client";

export type BeneficioSocial = {
  id: string;
  municipio: string;
  municipio_ibge: string;
  programa: string;
  competencia: string;
  beneficiarios: number | null;
  valor_pago: number | null;
  unidade_medida: string | null;
  fonte_codigo: string;
  fonte_nome: string;
  fonte_url: string | null;
  natureza_dado: "oficial" | "estimado" | "referencia_regional";
  source_hash: string | null;
  data_coleta: string;
  observacoes: string | null;
  updated_at: string;
};

export async function fetchBeneficiosSociais(): Promise<BeneficioSocial[]> {
  const { data, error } = await supabase
    .from("v_beneficios_sociais_canonicos")
    .select("*")
    .eq("municipio_ibge", "5217104")
    .order("competencia", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as BeneficioSocial[];
}
