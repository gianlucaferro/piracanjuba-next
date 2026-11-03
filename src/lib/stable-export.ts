export interface ExportRevision {
  count: number;
  latestUpdatedAt: string | null;
  latestId: string | null;
}

export class ExportChangedError extends Error {
  constructor() {
    super("Os dados mudaram durante a exportação. Aguarde a sincronização terminar e tente novamente.");
    this.name = "ExportChangedError";
  }
}

interface StableExportSource<T extends { id: string }> {
  readRevision(): Promise<ExportRevision>;
  readPage(afterId: string | null, limit: number): Promise<T[]>;
  rowVersion(row: T): string;
}

function sameRevision(left: ExportRevision, right: ExportRevision): boolean {
  return left.count === right.count && left.latestUpdatedAt === right.latestUpdatedAt && left.latestId === right.latestId;
}

/**
 * REST não oferece uma transação entre páginas. Duas leituras por cursor,
 * delimitadas por revisões, detectam mudanças sem depender apenas de updated_at.
 */
export async function readStableExport<T extends { id: string }>(
  source: StableExportSource<T>,
  options: { pageSize?: number; maxAttempts?: number; maxRows?: number } = {},
): Promise<T[]> {
  const pageSize = options.pageSize ?? 500;
  const maxAttempts = options.maxAttempts ?? 3;
  const maxRows = options.maxRows ?? 100_000;
  if (![pageSize, maxAttempts, maxRows].every((value) => Number.isSafeInteger(value) && value > 0)) {
    throw new Error("Configuração de exportação inválida.");
  }

  const revision = async () => {
    const value = await source.readRevision();
    if (!Number.isSafeInteger(value.count) || value.count < 0 || value.count > maxRows) {
      throw new Error("Não foi possível confirmar o tamanho da exportação.");
    }
    if (value.count > 0 && (!value.latestId || !value.latestUpdatedAt)) throw new ExportChangedError();
    return value;
  };

  const read = async (expectedCount: number) => {
    const rows: T[] = [];
    const ids = new Set<string>();
    let afterId: string | null = null;
    while (rows.length < expectedCount) {
      const page = await source.readPage(afterId, pageSize);
      if (!page.length || page.length > pageSize) throw new ExportChangedError();
      for (const row of page) {
        if (!row.id || ids.has(row.id) || (afterId !== null && row.id <= afterId)) throw new ExportChangedError();
        ids.add(row.id);
        rows.push(row);
        afterId = row.id;
      }
      if (rows.length > expectedCount || (page.length < pageSize && rows.length < expectedCount)) {
        throw new ExportChangedError();
      }
    }
    if (rows.length !== expectedCount) throw new ExportChangedError();
    return rows;
  };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const before = await revision();
      const first = await read(before.count);
      const middle = await revision();
      if (!sameRevision(before, middle)) throw new ExportChangedError();
      const second = await read(middle.count);
      const after = await revision();
      if (!sameRevision(middle, after) || first.length !== second.length ||
          first.some((row, index) => row.id !== second[index].id || source.rowVersion(row) !== source.rowVersion(second[index]))) {
        throw new ExportChangedError();
      }
      return first;
    } catch (error) {
      if (!(error instanceof ExportChangedError) || attempt === maxAttempts - 1) throw error;
    }
  }
  throw new ExportChangedError();
}
