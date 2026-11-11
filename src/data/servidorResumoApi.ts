import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { RespostaResumoServidor } from "../../supabase/functions/_shared/servidor-resumo.ts";

const supabase = createBrowserSupabaseClient();

export type { GrupoFolhaIndividual, RespostaResumoServidor } from "../../supabase/functions/_shared/servidor-resumo.ts";

export async function fetchServidorResumo(
  servidorId: string,
  orgaoTipo: "prefeitura" | "camara",
): Promise<RespostaResumoServidor> {
  const { data, error } = await supabase.functions.invoke<RespostaResumoServidor & { error?: string }>("summarize-servidor", {
    body: { servidor_id: servidorId },
  });
  if (
    error || !data || data.error || data.modo !== "dados_oficiais" ||
    data.servidor?.id !== servidorId || data.servidor.orgao_tipo !== orgaoTipo ||
    !data.resumo_folha || typeof data.resumo !== "string"
  ) {
    throw new Error("Não foi possível carregar o resumo deste servidor.");
  }
  return data;
}
