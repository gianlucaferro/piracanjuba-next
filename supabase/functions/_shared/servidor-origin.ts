export function normalizeSourceIdentifier(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function servidorOriginKey(
  orgaoTipo: string,
  source: string,
  identifier: unknown,
): string {
  const normalizedIdentifier = normalizeSourceIdentifier(identifier);
  if (!normalizedIdentifier) {
    throw new Error("Identificador de origem do servidor ausente");
  }

  return `${orgaoTipo.trim().toLowerCase()}:${source.trim().toLowerCase()}:${normalizedIdentifier}`;
}

export type SourceIdentity = {
  nome: string;
  origemChave: string;
};

export type StoredIdentity = {
  id: string;
  nome: string;
  origem_chave: string;
};

export type OriginAdoption = {
  id: string;
  previousOrigin: string;
  nextOrigin: string;
};

export function planLegacyOriginAdoptions(
  sourceRows: SourceIdentity[],
  storedRows: StoredIdentity[],
  legacyPrefix: string,
): OriginAdoption[] {
  const sourceByName = new Map<string, SourceIdentity[]>();
  for (const row of sourceRows) {
    const key = normalizeSourceIdentifier(row.nome);
    sourceByName.set(key, [...(sourceByName.get(key) ?? []), row]);
  }

  const legacyByName = new Map<string, StoredIdentity[]>();
  const existingOrigins = new Set(storedRows.map((row) => row.origem_chave));
  for (const row of storedRows) {
    if (!row.origem_chave.startsWith(legacyPrefix)) continue;
    const key = normalizeSourceIdentifier(row.nome);
    legacyByName.set(key, [...(legacyByName.get(key) ?? []), row]);
  }

  const adoptions: OriginAdoption[] = [];
  for (const [name, sourceMatches] of sourceByName) {
    const legacyMatches = legacyByName.get(name) ?? [];
    if (sourceMatches.length !== 1 || legacyMatches.length !== 1) continue;

    const source = sourceMatches[0];
    const legacy = legacyMatches[0];
    if (existingOrigins.has(source.origemChave)) {
      throw new Error(
        `Origem atual e legada coexistem para ${name}: ${source.origemChave}`,
      );
    }

    adoptions.push({
      id: legacy.id,
      previousOrigin: legacy.origem_chave,
      nextOrigin: source.origemChave,
    });
  }

  return adoptions;
}
