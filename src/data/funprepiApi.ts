import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { FunprepiDashboard } from "@/lib/funprepi";

const supabase = createBrowserSupabaseClient();

export async function fetchFunprepiDashboard(): Promise<FunprepiDashboard> {
  const { data, error } = await supabase.rpc("funprepi_dashboard");
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Painel FUNPREPI retornou resposta inválida");
  }
  return data as FunprepiDashboard;
}
