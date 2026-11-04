/// <reference lib="deno.ns" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSyncHealthHandler } from "../_shared/sync-health-policy.ts";

Deno.serve(createSyncHealthHandler({
  getServiceRoleKey: () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  getCronSecret: () => Deno.env.get("CRON_SECRET"),
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  createStore: (serviceRoleKey) => {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey,
    );
    return {
      async loadDashboard() {
        const { data, error } = await supabase.from("v_sync_dashboard").select(
          "*",
        );
        if (error) {
          throw new Error(
            `Dashboard de sincronização indisponível: ${error.message}`,
          );
        }
        return data || [];
      },
      async insertLog() {
        const { data, error } = await supabase.from("sync_log")
          .insert({ tipo: "health-check", status: "running", detalhes: {} })
          .select("id").single();
        if (error) throw error;
        return data.id;
      },
      async updateLog(id, status, detalhes) {
        const { error } = await supabase.from("sync_log")
          .update({ status, detalhes, finished_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
      },
      async invoke(name, body) {
        const { error } = await supabase.functions.invoke(name, { body });
        if (error) throw error;
      },
    };
  },
}));
