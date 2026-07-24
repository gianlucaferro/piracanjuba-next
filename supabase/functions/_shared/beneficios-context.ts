export interface BeneficioContextRow {
  programa: unknown;
  competencia: unknown;
  beneficiarios: unknown;
  valor_pago: unknown;
  natureza_dado: unknown;
  fonte_nome: unknown;
}

interface BenefitContextOptions {
  maxPerProgram?: number;
  maxRows?: number;
  maxChars?: number;
}

function compact(value: unknown, maxLength: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function currency(value: unknown): string {
  if (
    value == null ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return "N/D";
  }

  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? `R$ ${parsed.toLocaleString("pt-BR")}`
    : "N/D";
}

export function buildBenefitContextRows(
  data: BeneficioContextRow[],
  options: BenefitContextOptions = {},
): string[] {
  const maxPerProgram = options.maxPerProgram ?? 3;
  const maxRows = options.maxRows ?? 18;
  const maxChars = options.maxChars ?? 3_200;
  const perProgram = new Map<string, number>();
  const rows: string[] = [];
  let totalChars = 0;

  for (const item of data) {
    const program = compact(item.programa, 60);
    if (!program) continue;

    const currentCount = perProgram.get(program) ?? 0;
    if (currentCount >= maxPerProgram) continue;

    const row = `- ${program} (${compact(item.competencia, 7)}): ${
      compact(item.beneficiarios, 24) || "N/D"
    } beneficiários, ${currency(item.valor_pago)} [${
      compact(item.natureza_dado, 24)
    }; ${compact(item.fonte_nome, 100)}]`;

    const separatorSize = rows.length === 0 ? 0 : 1;
    if (
      rows.length >= maxRows ||
      totalChars + separatorSize + row.length > maxChars
    ) {
      break;
    }

    rows.push(row);
    totalChars += separatorSize + row.length;
    perProgram.set(program, currentCount + 1);
  }

  return rows;
}
