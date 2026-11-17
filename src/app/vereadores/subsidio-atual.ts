import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { resumirSubsidio, type ResumoSubsidio } from "./remuneracao";

/**
 * Subsídio mensal dos vereadores na competência mais recente com pagamento
 * publicado na folha da Câmara (tabela remuneracao_mensal).
 */
export const fetchSubsidioAtualVereadores = unstable_cache(
  async (): Promise<ResumoSubsidio | null> => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("remuneracao_mensal")
      .select("competencia, bruto, liquido, subsidio_referencia")
      .order("competencia", { ascending: false })
      .limit(120);
    if (error) {
      console.error("fetchSubsidioAtualVereadores error:", error);
      return null;
    }
    return resumirSubsidio(data || []);
  },
  ["vereadores-subsidio-atual"],
  { revalidate: 3600, tags: ["vereadores"] },
);
