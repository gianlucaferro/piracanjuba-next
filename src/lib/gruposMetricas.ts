export interface RegistroContratoGrupo {
  id: string;
  orgao: "prefeitura" | "camara";
  tipo: "original" | "aditivo";
  cnpj: string;
  numero: string | null;
  data: string | null;
  valor: number | null;
  fonteUrl: string | null;
}

export interface PeriodoGrupo {
  ano: string;
  originais: number;
  aditivos: number;
  contratos: number;
  termos: number;
}

export function resumoContratosGrupo(registros: RegistroContratoGrupo[]) {
  const periodos = new Map<string, PeriodoGrupo>();
  const fornecedores = new Map<string, { cnpj: string; originais: number; aditivos: number }>();
  const vistos = new Set<string>();
  let semValor = 0;
  for (const registro of registros) {
    const chave = `${registro.orgao}:${registro.tipo}:${registro.id}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const valor = typeof registro.valor === "number" && Number.isFinite(registro.valor) ? registro.valor : 0;
    if (registro.valor === null || !Number.isFinite(registro.valor)) semValor++;
    const ano = registro.data?.match(/^(\d{4})-\d{2}-\d{2}$/)?.[1] ?? "Sem data";
    const periodo = periodos.get(ano) ?? { ano, originais: 0, aditivos: 0, contratos: 0, termos: 0 };
    const cnpj = registro.cnpj.replace(/\D/g, "");
    const fornecedor = fornecedores.get(cnpj) ?? { cnpj, originais: 0, aditivos: 0 };
    if (registro.tipo === "original") {
      periodo.originais += valor;
      periodo.contratos++;
      fornecedor.originais += valor;
    } else {
      periodo.aditivos += valor;
      periodo.termos++;
      fornecedor.aditivos += valor;
    }
    periodos.set(ano, periodo);
    fornecedores.set(cnpj, fornecedor);
  }
  const lista = [...periodos.values()].sort((a, b) => b.ano.localeCompare(a.ano));
  const originais = lista.reduce((s, p) => s + p.originais, 0);
  const aditivos = lista.reduce((s, p) => s + p.aditivos, 0);
  const total = originais + aditivos;
  return {
    periodos: lista,
    originais,
    aditivos,
    total,
    semValor,
    fornecedores: [...fornecedores.values()].map((f) => ({
      ...f,
      total: f.originais + f.aditivos,
      participacao: total > 0 ? ((f.originais + f.aditivos) / total) * 100 : null,
    })).sort((a, b) => b.total - a.total),
  };
}

export function dataBaseGrupo(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(data);
}

export function fonteContratoSegura(valor: string | null): string | null {
  if (!valor) return null;
  try {
    const url = new URL(valor);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
