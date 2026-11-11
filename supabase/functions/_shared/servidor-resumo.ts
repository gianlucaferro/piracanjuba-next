export interface LancamentoIndividual {
  id: string;
  competencia: string;
  tipo_folha: string | null;
  bruto: number | null;
  liquido: number | null;
  fonte_url: string | null;
}

export interface GrupoFolhaIndividual {
  competencia: string;
  bruto: number | null;
  liquido: number | null;
  registros: number;
  tipos: string[];
  lancamentos: LancamentoIndividual[];
}

export interface ResumoFolhaIndividual {
  competenciaAtual: string;
  ultimaCompetencia: string | null;
  mensal: GrupoFolhaIndividual | null;
  rescisoes: GrupoFolhaIndividual | null;
  decimoTerceiro: GrupoFolhaIndividual | null;
  outros: GrupoFolhaIndividual | null;
  semRegistroAtual: boolean;
  semMensalNaUltimaCompetencia: boolean;
  totalRegistros: number;
}

export interface ServidorIndividual {
  id: string;
  nome: string;
  cargo: string | null;
  orgao_tipo: string | null;
  fonte_url: string | null;
}

export interface RespostaResumoServidor {
  servidor: ServidorIndividual;
  remuneracoes: LancamentoIndividual[];
  resumo_folha: ResumoFolhaIndividual;
  resumo: string;
  modo: "dados_oficiais";
  cached: false;
}

type Categoria = "mensal" | "rescisoes" | "decimoTerceiro" | "outros";

export function categoriaFolhaIndividual(tipo: string | null): Categoria {
  const normalizado = (tipo ?? "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  if (normalizado === "MENSAL") return "mensal";
  if (normalizado === "RESCISAO") return "rescisoes";
  if (
    /^13(?:[º°O])?(?:\s|$)/.test(normalizado) ||
    /^DECIMO TERCEIRO(?:\s|$)/.test(normalizado)
  ) return "decimoTerceiro";
  return "outros";
}

export function competenciaBrasilia(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  return `${parts.find((part) => part.type === "year")!.value}-${
    parts.find((part) => part.type === "month")!.value
  }`;
}

function validarLancamento(row: LancamentoIndividual): void {
  if (
    typeof row.id !== "string" || !row.id ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.competencia) ||
    (row.tipo_folha !== null && typeof row.tipo_folha !== "string") ||
    [row.bruto, row.liquido].some((value) =>
      value !== null && (typeof value !== "number" || !Number.isFinite(value))
    )
  ) throw new Error("Registro de remuneracao invalido");
}

function somar(
  rows: LancamentoIndividual[],
  field: "bruto" | "liquido",
): number | null {
  if (rows.some((row) => row[field] === null)) return null;
  const cents = rows.reduce(
    (sum, row) => sum + Math.round(row[field]! * 100),
    0,
  );
  if (!Number.isSafeInteger(cents)) {
    throw new Error("Total fora do limite seguro");
  }
  return cents / 100;
}

function ultimoGrupo(
  rows: LancamentoIndividual[],
  categoria: Categoria,
): GrupoFolhaIndividual | null {
  const candidates = rows.filter((row) =>
    categoriaFolhaIndividual(row.tipo_folha) === categoria
  );
  if (!candidates.length) return null;
  const competencia = candidates.reduce(
    (latest, row) => row.competencia > latest ? row.competencia : latest,
    "",
  );
  const lancamentos = candidates.filter((row) =>
    row.competencia === competencia
  )
    .sort((a, b) =>
      (a.tipo_folha ?? "").localeCompare(b.tipo_folha ?? "", "pt-BR") ||
      a.id.localeCompare(b.id)
    );
  return {
    competencia,
    bruto: somar(lancamentos, "bruto"),
    liquido: somar(lancamentos, "liquido"),
    registros: lancamentos.length,
    tipos: [
      ...new Set(
        lancamentos.map((row) =>
          row.tipo_folha?.trim() || "Tipo não informado"
        ),
      ),
    ],
    lancamentos,
  };
}

/** Cada grupo representa sua ultima competencia, nunca a soma de meses. */
export function resumirFolhaIndividual(
  rows: LancamentoIndividual[],
  competenciaAtual: string,
): ResumoFolhaIndividual {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competenciaAtual)) {
    throw new Error("Competencia atual invalida");
  }
  const ids = new Set<string>();
  for (const row of rows) {
    validarLancamento(row);
    if (ids.has(row.id)) throw new Error("Remuneracao repetida na consulta");
    ids.add(row.id);
  }
  const ultimaCompetencia = rows.reduce(
    (latest, row) => row.competencia > latest ? row.competencia : latest,
    "",
  ) || null;
  const mensal = ultimoGrupo(rows, "mensal");
  return {
    competenciaAtual,
    ultimaCompetencia,
    mensal,
    rescisoes: ultimoGrupo(rows, "rescisoes"),
    decimoTerceiro: ultimoGrupo(rows, "decimoTerceiro"),
    outros: ultimoGrupo(rows, "outros"),
    semRegistroAtual: !rows.some((row) => row.competencia === competenciaAtual),
    semMensalNaUltimaCompetencia: ultimaCompetencia !== null &&
      mensal?.competencia !== ultimaCompetencia,
    totalRegistros: rows.length,
  };
}

function valor(value: number | null): string {
  return value === null
    ? "não informado"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
      .format(value);
}

export function textoResumoIndividual(
  servidor: ServidorIndividual,
  folha: ResumoFolhaIndividual,
): string {
  const lines = [
    `${servidor.nome}${
      servidor.cargo
        ? ` consta no cadastro com o cargo de ${servidor.cargo}`
        : " consta no cadastro de servidores"
    }.`,
  ];
  const groups: [string, GrupoFolhaIndividual | null][] = [
    ["Último salário mensal disponível", folha.mensal],
    ["Última rescisão disponível", folha.rescisoes],
    [
      "Último 13º salário disponível, incluindo adiantamentos",
      folha.decimoTerceiro,
    ],
    ["Outros pagamentos na última competência dessa categoria", folha.outros],
  ];
  for (const [label, group] of groups) {
    if (group) {
      lines.push(
        `${label} (${group.competencia}): bruto ${
          valor(group.bruto)
        }; líquido ${valor(group.liquido)}.`,
      );
    }
  }
  if (!folha.totalRegistros) {
    lines.push(
      "Não há registros de remuneração disponíveis para este vínculo.",
    );
  } else {
    if (!folha.mensal) {
      lines.push("Não há folha mensal disponível para este vínculo.");
    } else if (folha.semMensalNaUltimaCompetencia) {
      lines.push(
        `Há outros pagamentos em ${folha.ultimaCompetencia}, sem registro mensal dessa competência para este vínculo.`,
      );
    }
    if (folha.semRegistroAtual) {
      lines.push(
        `Não há registro para este vínculo na competência ${folha.competenciaAtual}.`,
      );
    }
    lines.push(
      "Os valores refletem os registros disponíveis, separados por tipo e competência, e podem receber complementações.",
    );
  }
  return lines.join("\n");
}

export function montarRespostaResumoServidor(
  servidor: ServidorIndividual,
  rows: LancamentoIndividual[],
  now = new Date(),
): RespostaResumoServidor {
  const resumo_folha = resumirFolhaIndividual(rows, competenciaBrasilia(now));
  const remuneracoes = [
    resumo_folha.mensal,
    resumo_folha.rescisoes,
    resumo_folha.decimoTerceiro,
    resumo_folha.outros,
  ].flatMap((group) => group?.lancamentos ?? []);
  return {
    servidor,
    remuneracoes,
    resumo_folha,
    resumo: textoResumoIndividual(servidor, resumo_folha),
    modo: "dados_oficiais",
    cached: false,
  };
}
