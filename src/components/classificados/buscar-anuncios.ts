import type { SupabaseClient } from "@supabase/supabase-js";
import { COLUNAS_ANUNCIO_PUBLICO, STATUS_PUBLICOS } from "./anuncio-publico.ts";

/** Query key da lista do Compra e Venda, a mesma no cliente e no prefetch do servidor. */
export const CHAVE_LISTA_ANUNCIOS = ["classificados"] as const;

/**
 * Busca da lista do Compra e Venda. A mesma função alimenta o useQuery do cliente
 * (com o cliente Supabase do browser) e o prefetch do servidor (com o cliente
 * público), para a hidratação do react-query receber exatamente o mesmo dado.
 */
export async function buscarAnuncios<T>(supabase: SupabaseClient): Promise<T[]> {
  const { data, error } = await supabase
    .from("classificados")
    .select(COLUNAS_ANUNCIO_PUBLICO)
    .in("status", [...STATUS_PUBLICOS])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as T[];
}
