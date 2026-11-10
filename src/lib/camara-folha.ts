export interface RegistroFolhaCamara {
  servidor_id: string;
  competencia: string;
  tipo_folha: string | null;
  bruto: number | null;
}

export interface TotaisFolha {
  bruto: number | null;
  servidores: number;
  registros: number;
}

export interface ResumoFolhaCamara {
  ultimaCompetencia: string;
  mensal: (TotaisFolha & { competencia: string }) | null;
  recente: { mensal: TotaisFolha; rescisoes: TotaisFolha; outros: TotaisFolha };
  publicacaoParcial: boolean;
}

function tipoFolha(tipo: string | null): "mensal" | "rescisoes" | "outros" {
  const normalizado = (tipo ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  if (normalizado === "MENSAL") return "mensal";
  if (normalizado === "RESCISAO") return "rescisoes";
  return "outros";
}

function totais(registros: RegistroFolhaCamara[]): TotaisFolha {
  // Somar centavos evita resíduos decimais; valor ausente não representa zero.
  const valoresConhecidos = registros.every((r) => r.bruto !== null && Number.isFinite(r.bruto));
  return {
    bruto: valoresConhecidos ? registros.reduce((total, r) => total + Math.round(r.bruto! * 100), 0) / 100 : null,
    servidores: new Set(registros.map((r) => r.servidor_id)).size,
    registros: registros.length,
  };
}

/** Recebe somente registros da Câmara, já filtrados pela consulta. */
export function resumirFolhaCamara(registros: RegistroFolhaCamara[]): ResumoFolhaCamara | null {
  if (!registros.length) return null;
  const ultimaCompetencia = registros.reduce((ultima, r) => r.competencia > ultima ? r.competencia : ultima, "");
  const mensais = registros.filter((r) => tipoFolha(r.tipo_folha) === "mensal");
  const competenciaMensal = mensais.reduce((ultima, r) => r.competencia > ultima ? r.competencia : ultima, "");
  const recentes = registros.filter((r) => r.competencia === ultimaCompetencia);
  const recente = {
    mensal: totais(recentes.filter((r) => tipoFolha(r.tipo_folha) === "mensal")),
    rescisoes: totais(recentes.filter((r) => tipoFolha(r.tipo_folha) === "rescisoes")),
    outros: totais(recentes.filter((r) => tipoFolha(r.tipo_folha) === "outros")),
  };
  return {
    ultimaCompetencia,
    mensal: competenciaMensal ? { competencia: competenciaMensal, ...totais(mensais.filter((r) => r.competencia === competenciaMensal)) } : null,
    recente,
    // A presença de MENSAL não comprova fechamento. Este sinal identifica a
    // publicação de outros pagamentos enquanto a mensal ainda está ausente.
    publicacaoParcial: recente.mensal.registros === 0,
  };
}
