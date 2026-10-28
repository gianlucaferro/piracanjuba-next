export type ServidorRemuneracao = {
  nome?: string;
  cargo?: string | null;
  orgao_tipo?: string | null;
};

export type RelacaoServidor = ServidorRemuneracao | ServidorRemuneracao[] | null;

export type RemuneracaoFolha = {
  bruto: number | null;
  servidores: RelacaoServidor;
};

export function normalizarServidorRemuneracao(relacao: RelacaoServidor): ServidorRemuneracao | null {
  // O vínculo servidor_id identifica um servidor. Relações ambíguas não
  // devem atribuir a remuneração a um órgão arbitrário.
  return Array.isArray(relacao) ? relacao.length === 1 ? relacao[0] : null : relacao;
}

export function somarFolhaPorOrgao(remuneracoes: RemuneracaoFolha[]) {
  const prefeitura = { total: 0, count: 0 };
  const camara = { total: 0, count: 0 };

  for (const remuneracao of remuneracoes) {
    const orgao = normalizarServidorRemuneracao(remuneracao.servidores)?.orgao_tipo;
    const destino = orgao === "prefeitura" ? prefeitura : orgao === "camara" ? camara : null;
    if (!destino) continue;
    destino.total += remuneracao.bruto ?? 0;
    destino.count++;
  }

  return { prefeitura, camara };
}
