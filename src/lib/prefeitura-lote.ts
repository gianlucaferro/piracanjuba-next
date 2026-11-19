// Primeiro lote que o servidor coloca no react-query das abas da Prefeitura.
// Sem imports para rodar direto no node --test (tests/prefeitura-respostas.test.ts).
//
// Contratos (6.610 linhas) e despesas (mais de 200 mil) não cabem no HTML. O servidor entrega
// só os primeiros registros, na mesma ordem e com as mesmas colunas da busca do navegador, e
// grava o lote com dataUpdatedAt = MARCA_LOTE_INICIAL. Esse carimbo antigo deixa o dado vencido
// para o react-query, que busca a lista completa assim que a aba monta, e permite à aba saber
// que ainda está no lote (para não mostrar o total do lote como se fosse o total geral).

/** Contratos no HTML do servidor: os mesmos 50 que a aba mostra antes do "Carregar mais". */
export const LOTE_CONTRATOS = 50;

/** Despesas no HTML do servidor: as 50 mais recentes; o navegador busca o resto. */
export const LOTE_DESPESAS = 50;

/** Servidores por página na aba (a chave ["servidores", busca, página] depende disso). */
export const SERVIDORES_POR_PAGINA = 30;

/** dataUpdatedAt do lote do servidor. Qualquer busca real do navegador grava um valor maior. */
export const MARCA_LOTE_INICIAL = 1;

export function ehLoteInicial(dataUpdatedAt: number): boolean {
  return dataUpdatedAt === MARCA_LOTE_INICIAL;
}
