import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export interface PostoProduto {
  produto: string | null;
  tancagem: number | null;
  unidade: string | null;
}

export interface Posto {
  codigo_simp: string;
  razao_social: string;
  cnpj: string | null;
  endereco: string | null;
  complemento: string | null;
  bairro: string | null;
  distribuidora: string | null;
  produtos: PostoProduto[];
  latitude: number | null;
  longitude: number | null;
  status_sigaf: string | null;
  inadimplencia_pmqc: unknown[];
  nota: number | null;
  nota_atualizada_em: string | null;
  atualizado_em: string;
}

export async function fetchPostos(): Promise<Posto[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("postos_combustivel")
    .select(
      "codigo_simp, razao_social, cnpj, endereco, complemento, bairro, distribuidora, produtos, latitude, longitude, status_sigaf, inadimplencia_pmqc, nota, nota_atualizada_em, atualizado_em"
    )
    .order("nota", { ascending: false, nullsFirst: false })
    .order("razao_social", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Posto[];
}
