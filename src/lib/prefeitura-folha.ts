import type { TotaisFolha } from "./camara-folha";

export interface RegistroFolhaPrefeitura {
  servidor_id: string;
  competencia: string;
  tipo_folha: string | null;
  bruto: number | null;
}

export interface RegistroCoberturaPrefeitura {
  ano: number;
  mes: number;
  orgao_id: string | null;
  orgao_nome: string | null;
}

export interface ResumoFolhaPrefeitura {
  competenciaAtual: string;
  ultimaCompetencia: string;
  semRegistrosNaCompetenciaAtual: boolean;
  mensal: (TotaisFolha & { competencia: string }) | null;
  recente: { mensal: TotaisFolha; rescisoes: TotaisFolha; decimoTerceiro: TotaisFolha; outros: TotaisFolha };
  coberturaMensal: {
    competenciaAnterior: string | null;
    orgaosAusentes: { id: string; nome: string }[];
    verificavel: boolean;
  };
  publicacaoParcial: boolean;
}

function tipoFolha(tipo: string | null): keyof ResumoFolhaPrefeitura["recente"] {
  const normalizado = (tipo ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  if (normalizado === "MENSAL") return "mensal";
  if (normalizado === "RESCISAO") return "rescisoes";
  if (/^13(?:[º°O])?(?:\s|$)/.test(normalizado) || /^DECIMO TERCEIRO(?:\s|$)/.test(normalizado)) return "decimoTerceiro";
  return "outros";
}

function totais(registros: RegistroFolhaPrefeitura[]): TotaisFolha {
  return {
    bruto: registros.every((r) => r.bruto !== null && Number.isFinite(r.bruto))
      ? registros.reduce((soma, r) => soma + Math.round(r.bruto! * 100), 0) / 100 : null,
    servidores: new Set(registros.map((r) => r.servidor_id)).size,
    registros: registros.length,
  };
}

function competenciaCobertura(r: RegistroCoberturaPrefeitura): string {
  return `${r.ano}-${String(r.mes).padStart(2, "0")}`;
}

/** Valores vêm de remunerações consolidadas; a tabela de origem fornece apenas órgãos. */
export function resumirFolhaPrefeitura(
  registros: RegistroFolhaPrefeitura[],
  cobertura: RegistroCoberturaPrefeitura[],
  competenciaAnterior: string | null,
  competenciaAtual: string,
): ResumoFolhaPrefeitura | null {
  if (!registros.length) return null;
  const ultimaCompetencia = registros.reduce((ultima, r) => r.competencia > ultima ? r.competencia : ultima, "");
  const mensais = registros.filter((r) => tipoFolha(r.tipo_folha) === "mensal");
  const competenciaMensal = mensais.reduce((ultima, r) => r.competencia > ultima ? r.competencia : ultima, "");
  const recentes = registros.filter((r) => r.competencia === ultimaCompetencia);
  const recente = {
    mensal: totais(recentes.filter((r) => tipoFolha(r.tipo_folha) === "mensal")),
    rescisoes: totais(recentes.filter((r) => tipoFolha(r.tipo_folha) === "rescisoes")),
    decimoTerceiro: totais(recentes.filter((r) => tipoFolha(r.tipo_folha) === "decimoTerceiro")),
    outros: totais(recentes.filter((r) => tipoFolha(r.tipo_folha) === "outros")),
  };
  const atuais = cobertura.filter((r) => competenciaCobertura(r) === competenciaMensal);
  const anteriores = cobertura.filter((r) => competenciaCobertura(r) === competenciaAnterior);
  const orgaoValido = (r: RegistroCoberturaPrefeitura) => /^\d+$/.test(r.orgao_id ?? "") && Number(r.orgao_id) > 0;
  const verificavel = Boolean(competenciaAnterior && atuais.length && anteriores.length &&
    atuais.every(orgaoValido) && anteriores.every(orgaoValido));
  const idsAtuais = new Set(atuais.filter(orgaoValido).map((r) => r.orgao_id!));
  const orgaosAnteriores = new Map(anteriores.filter(orgaoValido).map((r) => [r.orgao_id!, r.orgao_nome?.trim() || `Órgão ${r.orgao_id}`]));
  const orgaosAusentes = verificavel
    ? [...orgaosAnteriores].filter(([id]) => !idsAtuais.has(id)).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    : [];
  return {
    competenciaAtual,
    ultimaCompetencia,
    semRegistrosNaCompetenciaAtual: ultimaCompetencia < competenciaAtual,
    mensal: competenciaMensal ? { competencia: competenciaMensal, ...totais(mensais.filter((r) => r.competencia === competenciaMensal)) } : null,
    recente,
    coberturaMensal: { competenciaAnterior, orgaosAusentes, verificavel },
    // Uma lacuna por órgão é evidência de cobertura parcial em relação à base
    // anterior, não comprovação de falta de pagamento ou de fechamento da folha.
    publicacaoParcial: recente.mensal.registros === 0 || orgaosAusentes.length > 0,
  };
}
