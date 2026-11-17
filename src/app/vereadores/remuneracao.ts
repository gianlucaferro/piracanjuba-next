// Regras de exibição da remuneração dos vereadores (folha da Câmara).
// Sem imports de alias: os testes em tests/ importam este arquivo direto no Node.

export type LinhaRemuneracao = {
  competencia: string;
  bruto: number | string | null;
  liquido: number | string | null;
  subsidio_referencia: number | string | null;
};

const num = (v: number | string | null | undefined) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Competência com bruto e líquido zerados (ou vazios) não tem pagamento
 * publicado na folha: não é dado de remuneração e não deve ser exibida.
 */
export function temPagamento(linha: LinhaRemuneracao): boolean {
  return num(linha.bruto) > 0 || num(linha.liquido) > 0;
}

/** Linhas com pagamento, da competência mais recente para a mais antiga. */
export function remuneracoesComPagamento<T extends LinhaRemuneracao>(linhas: T[]): T[] {
  return linhas
    .filter(temPagamento)
    .sort((a, b) => b.competencia.localeCompare(a.competencia));
}

export type ResumoSubsidio = {
  /** Competência (AAAA-MM) mais recente com pagamento publicado. */
  competencia: string;
  /** Valores distintos de subsídio nessa competência, em ordem crescente. */
  valores: number[];
};

/**
 * Subsídio mensal na competência mais recente com pagamento publicado.
 * O subsídio vem de subsidio_referencia, não do bruto: o bruto pode somar
 * outras verbas pagas no mês.
 */
export function resumirSubsidio(linhas: LinhaRemuneracao[]): ResumoSubsidio | null {
  const validas = remuneracoesComPagamento(linhas).filter((l) => num(l.subsidio_referencia) > 0);
  if (validas.length === 0) return null;
  const competencia = validas[0].competencia;
  const valores = Array.from(
    new Set(
      validas
        .filter((l) => l.competencia === competencia)
        .map((l) => Math.round(num(l.subsidio_referencia) * 100) / 100),
    ),
  ).sort((a, b) => a - b);
  return { competencia, valores };
}

export function formatarReais(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "é R$ 9.721,92" ou, se houver valores diferentes, "varia de R$ X a R$ Y". */
export function descreverSubsidio(resumo: ResumoSubsidio): string {
  const [menor] = resumo.valores;
  const maior = resumo.valores[resumo.valores.length - 1];
  if (menor === maior) return `é ${formatarReais(menor)}`;
  return `varia de ${formatarReais(menor)} a ${formatarReais(maior)}`;
}
