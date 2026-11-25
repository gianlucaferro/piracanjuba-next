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

/**
 * subsidio_referencia acima de zero. A sincronização grava 0 quando a folha vem
 * sem salário base legível (coluna NOT NULL): esse 0 não é subsídio e nunca deve
 * aparecer como "R$ 0,00".
 */
export function temSubsidio(linha: Pick<LinhaRemuneracao, "subsidio_referencia">): boolean {
  return num(linha.subsidio_referencia) > 0;
}

/** Texto para quando a folha não traz o subsídio (nenhuma competência com subsídio > 0). */
export const SUBSIDIO_NAO_INFORMADO = "Subsídio não informado na folha";

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
  const validas = remuneracoesComPagamento(linhas).filter(temSubsidio);
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

export type SubsidioCompetencia = {
  /** Competência (AAAA-MM) de onde o subsídio foi lido. */
  competencia: string;
  valor: number;
};

/**
 * Subsídio de um vereador: a competência mais recente com pagamento publicado e
 * subsidio_referencia acima de zero (a mesma regra de resumirSubsidio). Usado no
 * card de /camara e no perfil. Sem nenhuma linha assim, null: a tela mostra
 * SUBSIDIO_NAO_INFORMADO, nunca o bruto com o rótulo de subsídio.
 */
export function subsidioMaisRecente(linhas: LinhaRemuneracao[]): SubsidioCompetencia | null {
  const linha = remuneracoesComPagamento(linhas).find(temSubsidio);
  if (!linha) return null;
  return {
    competencia: linha.competencia,
    valor: Math.round(num(linha.subsidio_referencia) * 100) / 100,
  };
}

/**
 * Quanto o bruto passou do subsídio na competência: outras verbas pagas no mês
 * (em 2026-07, por exemplo, R$ 3.240,64 sobre R$ 9.721,92, um terço do subsídio).
 * Null quando a folha não traz o subsídio ou o bruto não passou dele.
 */
export function valorAlemDoSubsidio(linha: LinhaRemuneracao): number | null {
  if (!temSubsidio(linha)) return null;
  const diferenca = Math.round((num(linha.bruto) - num(linha.subsidio_referencia)) * 100) / 100;
  return diferenca > 0 ? diferenca : null;
}

/** Primeira e última competência com pagamento publicado ("2026-02" e "2026-11"). */
export function periodoComPagamento(
  linhas: LinhaRemuneracao[],
): { inicio: string; fim: string } | null {
  const validas = remuneracoesComPagamento(linhas);
  if (validas.length === 0) return null;
  return { inicio: validas[validas.length - 1].competencia, fim: validas[0].competencia };
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

/**
 * Início da frase-resposta do perfil, no mesmo formato da frase de /vereadores:
 * "O subsídio mensal da vereadora X é R$ 9.721,92 (competência 2026-07)". A página
 * completa com a fonte (folha de pagamento da Câmara, com link).
 */
export function fraseSubsidioParlamentar(referencia: string, subsidio: SubsidioCompetencia): string {
  return `O subsídio mensal ${referencia} é ${formatarReais(subsidio.valor)} (competência ${subsidio.competencia})`;
}
