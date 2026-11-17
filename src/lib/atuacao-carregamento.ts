// Estado da lista de /camara/atuacao (e /atuacao-parlamentar) a partir das duas consultas:
// atuação (indicações, requerimentos, moções) e projetos de lei.
// Sem imports para rodar direto no node --test (tests/atuacao-carregamento.test.ts).

export type FiltroAtuacao = "todos" | "projetos" | "atuacao";

/**
 * carregada: a consulta tem dados no cache (data !== undefined). Um refetch que falha mantém
 * os dados antigos com status "error"; a lista na tela não deve sumir por isso.
 * falhou: a consulta está em erro (isError).
 */
export type ConsultaAtuacao = { carregada: boolean; falhou: boolean };

export type EstadoListaAtuacao = {
  /** Há dados para mostrar a lista e a contagem. */
  pronta: boolean;
  /** O filtro ativo não tem dado nenhum e a consulta falhou: mensagem de erro no lugar da lista. */
  erro: boolean;
  /** No filtro "Todos", a parte que falhou; a lista sai com a outra e um aviso discreto. */
  faltando: "atuacao" | "projetos" | null;
};

export function estadoListaAtuacao(
  filtro: FiltroAtuacao,
  atuacao: ConsultaAtuacao,
  projetos: ConsultaAtuacao,
): EstadoListaAtuacao {
  // Falhou de vez: erro sem dado nenhum no cache.
  const atuacaoFalhou = !atuacao.carregada && atuacao.falhou;
  const projetosFalharam = !projetos.carregada && projetos.falhou;

  if (filtro === "projetos") return { pronta: projetos.carregada, erro: projetosFalharam, faltando: null };
  if (filtro === "atuacao") return { pronta: atuacao.carregada, erro: atuacaoFalhou, faltando: null };

  // "Todos": espera as duas consultas terminarem, para a contagem não mudar depois de exibida.
  // A que falhou de vez não segura a outra.
  const atuacaoTerminou = atuacao.carregada || atuacaoFalhou;
  const projetosTerminaram = projetos.carregada || projetosFalharam;
  if (atuacaoTerminou && projetosTerminaram && (atuacao.carregada || projetos.carregada)) {
    return {
      pronta: true,
      erro: false,
      faltando: atuacaoFalhou ? "atuacao" : projetosFalharam ? "projetos" : null,
    };
  }
  return { pronta: false, erro: atuacaoFalhou && projetosFalharam, faltando: null };
}
