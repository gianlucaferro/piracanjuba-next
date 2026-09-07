const ORIGEM_OBRAS = "prefeitura:nucleogov:obra:";

// Registros históricos inferidos de contratos permanecem armazenados,
// mas não comprovam a existência nem a situação de uma obra pública.
export function obrasOficiais<T extends { origem_chave?: string | null }>(rows: T[]): T[] {
  return rows.filter((row) => row.origem_chave?.startsWith(ORIGEM_OBRAS));
}
