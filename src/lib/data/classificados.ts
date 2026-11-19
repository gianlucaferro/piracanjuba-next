import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { buscarAnuncios } from "@/components/classificados/buscar-anuncios";
import {
  COLUNAS_ANUNCIO_PUBLICO,
  type AnuncioPublico,
} from "@/components/classificados/anuncio-publico";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Lista do Compra e Venda lida no servidor (anúncios ativos e vendidos), com as
 * mesmas colunas e o mesmo filtro do useQuery(["classificados"]) do cliente.
 * Sem Supabase (falha ou variáveis ausentes), devolve null e a página cai no
 * carregamento pelo cliente.
 */
export const fetchAnunciosLista = unstable_cache(
  async (): Promise<AnuncioPublico[] | null> => {
    try {
      return await buscarAnuncios<AnuncioPublico>(createPublicSupabaseClient());
    } catch (error) {
      console.error("fetchAnunciosLista error:", error);
      return null;
    }
  },
  ["classificados-lista-publica"],
  { revalidate: 60, tags: ["classificados"] },
);

/**
 * Anúncio pelo id, só com as colunas públicas (sem codigo_gestao). null quando o
 * id não é UUID, o anúncio não existe ou a consulta falha.
 */
export const fetchAnuncioPublicoPorId = unstable_cache(
  async (id: string): Promise<AnuncioPublico | null> => {
    if (!UUID.test(id)) return null;
    try {
      const supabase = createPublicSupabaseClient();
      const { data, error } = await supabase
        .from("classificados")
        .select(COLUNAS_ANUNCIO_PUBLICO)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as AnuncioPublico | null) ?? null;
    } catch (error) {
      console.error("fetchAnuncioPublicoPorId error:", error);
      return null;
    }
  },
  ["classificado-publico-por-id"],
  { revalidate: 60, tags: ["classificados"] },
);
