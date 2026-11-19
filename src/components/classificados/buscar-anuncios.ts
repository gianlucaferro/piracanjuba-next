import type { SupabaseClient } from "@supabase/supabase-js";
import type { QueryClient } from "@tanstack/react-query";
import {
  anuncioPublico,
  COLUNAS_ANUNCIO_PUBLICO,
  STATUS_PUBLICOS,
  type AnuncioPublico,
} from "./anuncio-publico.ts";

/** Query key da lista do Compra e Venda, a mesma no cliente e no prefetch do servidor. */
export const CHAVE_LISTA_ANUNCIOS = ["classificados"] as const;

/** Linhas por página: o limite de 1.000 linhas por resposta do PostgREST (db-max-rows). */
export const TAMANHO_PAGINA_ANUNCIOS = 1000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Busca da lista do Compra e Venda. A mesma função alimenta o useQuery do cliente
 * (com o cliente Supabase do browser) e o prefetch do servidor (com o cliente
 * público), para a hidratação do react-query receber exatamente o mesmo dado.
 *
 * Lê em páginas até vir uma página incompleta (uma resposta só pararia em 1.000 linhas
 * e o total, a faixa de preço e a frase-resposta sairiam de um recorte), com id como
 * segunda ordem para empate de created_at não repetir nem pular linha entre páginas.
 * Devolve só os anúncios públicos (anuncioPublico): o vencido some da lista do servidor,
 * da hidratação e de todo refetch do cliente, como já some do detalhe.
 */
export async function buscarAnuncios<T extends Pick<AnuncioPublico, "id" | "status" | "expira_em">>(
  supabase: SupabaseClient,
  agora: Date = new Date(),
): Promise<T[]> {
  const anuncios: T[] = [];
  const vistos = new Set<string>();
  for (let inicio = 0; ; inicio += TAMANHO_PAGINA_ANUNCIOS) {
    const { data, error } = await supabase
      .from("classificados")
      .select(COLUNAS_ANUNCIO_PUBLICO)
      .in("status", [...STATUS_PUBLICOS])
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(inicio, inicio + TAMANHO_PAGINA_ANUNCIOS - 1);
    if (error) throw error;
    const pagina = (data || []) as T[];
    for (const anuncio of pagina) {
      // Anúncio novo publicado entre duas páginas empurra a lista e repete uma linha.
      if (vistos.has(anuncio.id)) continue;
      vistos.add(anuncio.id);
      anuncios.push(anuncio);
    }
    if (pagina.length < TAMANHO_PAGINA_ANUNCIOS) break;
  }
  return anuncios.filter((a) => anuncioPublico(a, agora));
}

/**
 * Anúncio pelo id, só com as colunas públicas. null só quando o id não é UUID ou a
 * linha não existe; erro da consulta sobe, para o cache do servidor não guardar uma
 * falha passageira como anúncio inexistente (404 e noindex por 60 segundos).
 */
export async function buscarAnuncioPorId<T>(supabase: SupabaseClient, id: string): Promise<T | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await supabase
    .from("classificados")
    .select(COLUNAS_ANUNCIO_PUBLICO)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as T | null) ?? null;
}

function chaveDaLista(chave: readonly unknown[]): boolean {
  return chave.length === CHAVE_LISTA_ANUNCIOS.length && chave.every((parte, i) => parte === CHAVE_LISTA_ANUNCIOS[i]);
}

/**
 * Lista guardada na query do cliente e o momento em que foi lida; null antes de a lista
 * carregar. Depois de um refetch com erro o dado anterior continua na tela, e aqui também.
 */
export function listaEmCache<T>(queryClient: QueryClient): { anuncios: T[]; lidaEm: Date } | null {
  const estado = queryClient.getQueryState<T[]>(CHAVE_LISTA_ANUNCIOS);
  if (!estado || !Array.isArray(estado.data)) return null;
  return { anuncios: estado.data, lidaEm: new Date(estado.dataUpdatedAt) };
}

/**
 * Avisa a cada mudança de estado da query da lista (carga, refetch, setQueryData,
 * hidratação de dado mais novo). Devolve a função que cancela a inscrição. Só eventos
 * "updated": "added" pode disparar durante a renderização de outro componente.
 */
export function observarListaAnuncios(queryClient: QueryClient, avisar: () => void): () => void {
  return queryClient.getQueryCache().subscribe((evento) => {
    if (evento.type === "updated" && chaveDaLista(evento.query.queryKey)) avisar();
  });
}
