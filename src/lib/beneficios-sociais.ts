export interface BeneficioParaTotalOficial {
  competencia: string;
  valor_pago: number | null;
  natureza_dado: string;
  fonte_codigo: string;
}

export interface BeneficioParaCsv {
  programa: string;
  competencia: string;
  beneficiarios: number | null;
  valor_pago: number | null;
  unidade_medida: string | null;
  natureza_dado: string;
  fonte_nome: string;
  fonte_url: string | null;
  observacoes: string | null;
}

export function calcularTotalOficialAnual(
  dados: BeneficioParaTotalOficial[],
  ano: number,
): number {
  const prefixo = `${ano}-`;
  return dados
    .filter((item) =>
      item.competencia.startsWith(prefixo) &&
      item.natureza_dado === "oficial" &&
      item.fonte_codigo === "portal_transparencia"
    )
    .reduce((total, item) => total + (item.valor_pago ?? 0), 0);
}

function campoCsv(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function gerarCsvBeneficios(
  dados: BeneficioParaCsv[],
  rotuloPrograma: (programa: string) => string = (programa) => programa,
): string {
  const header = [
    "Programa",
    "Competência",
    "Beneficiários",
    "Valor Pago (R$)",
    "Unidade",
    "Natureza",
    "Fonte",
    "URL",
    "Observações",
  ].join(";");

  const rows = dados.map((item) =>
    [
      rotuloPrograma(item.programa),
      item.competencia,
      item.beneficiarios,
      item.valor_pago,
      item.unidade_medida,
      item.natureza_dado,
      item.fonte_nome,
      item.fonte_url,
      item.observacoes,
    ].map(campoCsv).join(";")
  );

  return `\uFEFF${[header, ...rows].join("\n")}`;
}
