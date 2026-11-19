import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { buscarAnuncioPorId, buscarAnuncios } from "@/components/classificados/buscar-anuncios";
import type { AnuncioPublico } from "@/components/classificados/anuncio-publico";

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
 * id não é UUID ou o anúncio não existe. Falha da consulta sobe em vez de virar null:
 * o unstable_cache não guarda promessa rejeitada (e, com entrada vencida, devolve a
 * anterior), então uma falha passageira não fica 60 segundos em cache como 404 com
 * noindex. Sem entrada em cache, a página responde erro 500, que o buscador trata
 * como passageiro.
 */
export const fetchAnuncioPublicoPorId = unstable_cache(
  async (id: string): Promise<AnuncioPublico | null> => {
    try {
      return await buscarAnuncioPorId<AnuncioPublico>(createPublicSupabaseClient(), id);
    } catch (error) {
      console.error("fetchAnuncioPublicoPorId error:", error);
      throw error;
    }
  },
  ["classificado-publico-por-id"],
  { revalidate: 60, tags: ["classificados"] },
);
