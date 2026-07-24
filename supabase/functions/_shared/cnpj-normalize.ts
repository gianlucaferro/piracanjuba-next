export type JsonObject = Record<string, unknown>;

export type CnpjEnriquecido = {
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  data_abertura: string | null;
  situacao_cadastral: string | null;
  natureza_juridica: string | null;
  porte: string | null;
  capital_social: number | null;
  cnae_principal: string | null;
  cnae_descricao: string | null;
  logradouro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  socios: JsonObject[];
  consultado_em: string;
};

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const text = asString(value);
  if (!text) return null;
  const parsed = Number(text.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function asDate(value: unknown): string | null {
  const text = asString(value);
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : null;
}

function asObjects(value: unknown): JsonObject[] {
  return Array.isArray(value)
    ? value.filter(
      (item): item is JsonObject =>
        item !== null && typeof item === "object" && !Array.isArray(item),
    )
    : [];
}

function normalizeSocios(value: unknown): JsonObject[] {
  return asObjects(value).map((socio) => ({
    ...socio,
    cnpj_cpf_do_socio: socio.cnpj_cpf_do_socio ?? socio.cnpj_cpf_socio ?? null,
  }));
}

export function normalizeCnpjResponse(
  cnpj: string,
  raw: JsonObject,
): CnpjEnriquecido | null {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return null;
  const company = raw.company && typeof raw.company === "object" &&
      !Array.isArray(raw.company)
    ? raw.company as JsonObject
    : {};

  const razaoSocial = asString(
    raw.razao_social ?? raw.nome ?? company.name,
  );
  if (!razaoSocial) return null;

  const tipoLogradouro = asString(raw.descricao_tipo_de_logradouro);
  const tipoLogradouroAlternativo = asString(raw.tipo_logradouro);
  const logradouroBase = asString(raw.logradouro);
  const numero = asString(raw.numero);
  const complemento = asString(raw.complemento);
  const endereco = [
    tipoLogradouro ?? tipoLogradouroAlternativo,
    logradouroBase,
    numero,
    complemento,
  ]
    .filter(Boolean)
    .join(" ");
  const telefoneAlternativo = asObjects(raw.telefones)
    .map((telefone) =>
      [asString(telefone.ddd), asString(telefone.numero)]
        .filter(Boolean)
        .join("")
    )
    .find(Boolean) ?? null;

  return {
    cnpj: digits,
    razao_social: razaoSocial,
    nome_fantasia: asString(raw.nome_fantasia ?? raw.fantasia),
    data_abertura: asDate(
      raw.data_inicio_atividade ?? raw.data_abertura ?? raw.abertura,
    ),
    situacao_cadastral: asString(
      raw.descricao_situacao_cadastral ?? raw.situacao_cadastral ??
        raw.situacao,
    ),
    natureza_juridica: asString(raw.natureza_juridica),
    porte: asString(raw.porte ?? raw.porte_empresa),
    capital_social: asNumber(raw.capital_social),
    cnae_principal: asString(raw.cnae_fiscal ?? raw.cnae_principal),
    cnae_descricao: asString(
      raw.cnae_fiscal_descricao ?? raw.cnae_descricao,
    ),
    logradouro: endereco || logradouroBase,
    municipio: asString(raw.municipio),
    uf: asString(raw.uf),
    cep: asString(raw.cep)?.replace(/\D/g, "") ?? null,
    telefone: asString(raw.ddd_telefone_1 ?? raw.telefone) ??
      telefoneAlternativo,
    email: asString(raw.email),
    socios: normalizeSocios(raw.qsa ?? raw.QSA ?? raw.socios),
    consultado_em: new Date().toISOString(),
  };
}
