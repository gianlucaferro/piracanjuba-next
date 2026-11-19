// Chaves do react-query das abas da Câmara que o servidor pré-carrega em src/app/camara/[aba].
// Cliente e servidor usam as mesmas constantes: chave diferente faz o cliente refazer a
// consulta e mostrar o carregamento por cima do HTML que já veio pronto.

export const CHAVE_CONTRATOS_CAMARA = ["camara-contratos"] as const;
export const CHAVE_RESUMO_FOLHA_CAMARA = ["camara-resumo-folha"] as const;

/** Lista de servidores da aba Servidores: a busca vazia e a página 0 são o primeiro lote. */
export function chaveServidoresCamara(busca: string, pagina: number) {
  return ["servidores-camara", busca, pagina] as const;
}

/** Tamanho da página da lista de servidores (o mesmo do cliente e do primeiro lote no servidor). */
export const PAGINA_SERVIDORES_CAMARA = 30;
