import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { parseRespostaPlaca, type VeiculoDaPlaca } from "@/lib/fipe";

export class ErroConsultaPlaca extends Error {
  readonly motivo: "nao-encontrada" | "limite" | "indisponivel";
  constructor(motivo: ErroConsultaPlaca["motivo"]) {
    super(
      motivo === "nao-encontrada"
        ? "Não encontramos essa placa. Confira a placa ou escolha o veículo abaixo."
        : motivo === "limite"
          ? "Muitas consultas por placa em pouco tempo. Aguarde um pouco ou escolha o veículo abaixo."
          : "A consulta por placa está indisponível agora. Escolha o veículo abaixo.",
    );
    this.motivo = motivo;
  }
}

let cliente: ReturnType<typeof createBrowserSupabaseClient> | null = null;

/**
 * Identifica o veículo pela placa na Edge Function consulta-placa (API Placas, paga, com
 * limite por IP). A placa vai só no corpo do POST, nunca na URL.
 */
export async function consultarPlaca(placa: string): Promise<VeiculoDaPlaca> {
  cliente ??= createBrowserSupabaseClient();
  const { data, error } = await cliente.functions.invoke<unknown>("consulta-placa", { body: { placa } });
  if (error) {
    const status = (error as { context?: { status?: unknown } }).context?.status;
    if (status === 404 || status === 400) throw new ErroConsultaPlaca("nao-encontrada");
    if (status === 429) throw new ErroConsultaPlaca("limite");
    throw new ErroConsultaPlaca("indisponivel");
  }
  if (typeof data === "object" && data !== null && (data as { not_configured?: unknown }).not_configured === true) {
    throw new ErroConsultaPlaca("indisponivel");
  }
  try {
    return parseRespostaPlaca(data);
  } catch {
    throw new ErroConsultaPlaca("indisponivel");
  }
}
