type PersistenceError = { message: string } | null | undefined;

export function assertPersistenceSucceeded(
  operation: string,
  error: PersistenceError,
): void {
  if (error) {
    throw new Error(`${operation}: ${error.message}`);
  }
}

export function mapIdsByOrigin(
  rows: Array<{ id: string; origem_chave: string }>,
  expectedKeys: string[],
): Map<string, string> {
  const result = new Map<string, string>();
  for (const row of rows) {
    const existing = result.get(row.origem_chave);
    if (existing && existing !== row.id) {
      throw new Error(
        `Origem duplicada com IDs distintos: ${row.origem_chave}`,
      );
    }
    result.set(row.origem_chave, row.id);
  }

  const missing = [...new Set(expectedKeys)].filter((key) => !result.has(key));
  if (missing.length > 0) {
    throw new Error(
      `Servidores persistidos incompletos: ${result.size}/${
        new Set(expectedKeys).size
      }; ausentes: ${missing.slice(0, 3).join(", ")}`,
    );
  }

  return result;
}
