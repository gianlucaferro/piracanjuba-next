/// <reference lib="deno.ns" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hasAdminSessionAuth } from "../_shared/admin-session-auth.ts";
import { createAdminSyncStatusHandler, safeSyncDetails, SYNC_OBSERVATION_TYPES } from "../_shared/admin-sync-status.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const logColumns = "id,tipo,status,started_at,finished_at,detalhes";

Deno.serve(createAdminSyncStatusHandler({
  authorize: (token) => hasAdminSessionAuth(token, async (tokenHash) => {
    const { data, error } = await supabase.from("admin_sessions").select("expires_at")
      .eq("id", "singleton").eq("token_hash", tokenHash).maybeSingle();
    if (error) throw error;
    return data;
  }),
  async loadSnapshot() {
    const [jobs, logs, observations] = await Promise.all([
      supabase.from("v_sync_dashboard").select("function_name,frequency_tier,max_stale_hours,health_status,cron_status,last_started_at,last_finished_at,last_dispatch_at"),
      supabase.from("sync_log").select(logColumns).order("started_at", { ascending: false }).limit(30),
      Promise.all(Object.entries(SYNC_OBSERVATION_TYPES).map(async ([functionName, types]) => {
        const { data, error } = await supabase.from("sync_log").select(logColumns)
          .in("tipo", types).order("started_at", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle();
        if (error) throw error;
        return [functionName, data ? { ...data, detalhes: safeSyncDetails(data.detalhes) } : null];
      })),
    ]);
    if (jobs.error) throw jobs.error;
    if (logs.error) throw logs.error;
    return {
      jobs: jobs.data ?? [],
      logs: (logs.data ?? []).map((log) => ({ ...log, detalhes: safeSyncDetails(log.detalhes) })),
      observations: Object.fromEntries(observations),
      checked_at: new Date().toISOString(),
    };
  },
}));
