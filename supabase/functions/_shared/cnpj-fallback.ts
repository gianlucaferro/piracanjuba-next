import {
  type CnpjEnriquecido,
  type JsonObject,
  normalizeCnpjResponse,
} from "./cnpj-normalize.ts";

export type FonteCnpj = {
  nome: string;
  consultar: () => Promise<JsonObject | null>;
};

export async function consultarCnpjComFallback(
  cnpj: string,
  fontes: FonteCnpj[],
): Promise<{ row: CnpjEnriquecido | null; fonte: string | null }> {
  const erros: string[] = [];

  for (const fonte of fontes) {
    try {
      const resposta = await fonte.consultar();
      if (!resposta) continue;

      const row = normalizeCnpjResponse(cnpj, resposta);
      if (row) return { row, fonte: fonte.nome };
    } catch (error) {
      erros.push(
        `${fonte.nome}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  if (erros.length === fontes.length && fontes.length > 0) {
    throw new Error(`Todas as fontes de CNPJ falharam: ${erros.join("; ")}`);
  }

  return { row: null, fonte: null };
}
