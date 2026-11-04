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
