"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { respostaDaLista, type AnuncioPublico } from "./anuncio-publico";
import { listaEmCache, observarListaAnuncios } from "./buscar-anuncios";

/**
 * Parágrafo-resposta do topo de /compra-e-venda. O HTML inicial leva a frase calculada no
 * servidor (`inicial`). Depois que a lista do cliente carrega, e a cada atualização dela
 * (anúncio publicado, vendido, apagado ou com preço novo), a frase sai da lista atual, para
 * não contradizer os anúncios que estão na tela.
 */
export default function RespostaAnuncios({ inicial }: { inicial: string | null }) {
  const queryClient = useQueryClient();
  const assinar = useCallback(
    (avisar: () => void) => observarListaAnuncios(queryClient, avisar),
    [queryClient],
  );
  const texto = useSyncExternalStore(
    assinar,
    () => {
      const lista = listaEmCache<AnuncioPublico>(queryClient);
      return lista ? respostaDaLista(lista.anuncios, lista.lidaEm) : inicial;
    },
    () => inicial,
  );
  if (!texto) return null;
  return <p className="text-sm text-foreground mt-2 max-w-3xl">{texto}</p>;
}
