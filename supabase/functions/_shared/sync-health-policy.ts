import { hasCronOrServiceRoleAuth } from "./service-role-auth.ts";

export interface SyncHealthJob {
  function_name: string;
  health_status: string;
  is_active?: boolean;
  cron_status?: string;
  retry_eligible?: boolean;
  errors_7d?: number;
  last_status?: string;
  last_started_at?: string;
}

const RETRYABLE_STATUSES = new Set(["failing", "stuck", "stale", "degraded"]);

/** A ausencia de log ou de cron nao autoriza novas chamadas a coletores. */
export function selectSyncRetryCandidates(
  jobs: SyncHealthJob[],
  limit = 5,
): SyncHealthJob[] {
  const cap = Number.isFinite(limit)
    ? Math.min(5, Math.max(0, Math.floor(limit)))
    : 0;
  return jobs.filter((job) =>
    job.is_active === true &&
    job.cron_status === "scheduled" &&
    job.retry_eligible === true &&
    job.function_name !== "sync-health-check" &&
    RETRYABLE_STATUSES.has(job.health_status) &&
    Number.isFinite(job.errors_7d ?? 0) &&
    (job.errors_7d ?? 0) >= 0 &&
    (job.errors_7d ?? 0) <= 5
  ).slice(0, cap);
}

export interface SyncHealthStore {
  loadDashboard(): Promise<SyncHealthJob[]>;
  insertLog(): Promise<string>;
  updateLog(id: string, status: string, details: unknown): Promise<void>;
  invoke(name: string, body: Record<string, unknown>): Promise<void>;
}

export interface SyncHealthDependencies {
  getServiceRoleKey(): string | undefined;
  getCronSecret(): string | undefined;
  createStore(serviceRoleKey: string): SyncHealthStore;
  wait(ms: number): Promise<void>;
}

export function parseSyncHealthBody(raw: string): { dryRun: boolean } {
  if (raw.length > 4096) throw new Error("Corpo excede o limite");
  let body: unknown;
  try {
    body = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    throw new Error("Corpo deve ser JSON válido");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Corpo deve ser um objeto JSON");
  }
  if (Object.keys(body).some((key) => key !== "dry_run")) {
    throw new Error("Campo de requisição não reconhecido");
  }
  if ("dry_run" in body && typeof body.dry_run !== "boolean") {
    throw new Error("dry_run deve ser booleano");
  }
  return { dryRun: "dry_run" in body && body.dry_run === true };
}

const HEALTH_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function healthJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...HEALTH_CORS, "Content-Type": "application/json" },
  });
}

export function createSyncHealthHandler(deps: SyncHealthDependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: HEALTH_CORS });
    }
    const serviceRoleKey = deps.getServiceRoleKey();
    if (!hasCronOrServiceRoleAuth(req, serviceRoleKey, deps.getCronSecret())) {
      return healthJson({ success: false, error: "Não autorizado" }, 401);
    }
    if (req.method !== "POST") {
      return healthJson({ success: false, error: "Use POST" }, 405);
    }
    let dryRun: boolean;
    try {
      ({ dryRun } = parseSyncHealthBody(await req.text()));
    } catch (error) {
      return healthJson({
        success: false,
        error: String((error as Error).message),
      }, 400);
    }
    if (!serviceRoleKey) {
      return healthJson(
        { success: false, error: "Monitor não configurado" },
        503,
      );
    }
    let store: SyncHealthStore | null = null;
    let logId: string | null = null;
    try {
      store = deps.createStore(serviceRoleKey);
      if (!dryRun) logId = await store.insertLog();
      const jobs = await store.loadDashboard();
      const unhealthy = jobs.filter((job) => job.health_status !== "healthy");
      const healthy = jobs.filter((job) => job.health_status === "healthy");
      const candidates = selectSyncRetryCandidates(unhealthy);
      const critical = unhealthy.filter((job) =>
        job.health_status === "failing" && (job.errors_7d ?? 0) >= 3
      );
      const retried: string[] = [];
      if (!dryRun) {
        for (const job of candidates) {
          try {
            await store.invoke(job.function_name, {});
            retried.push(job.function_name);
          } catch (error) {
            console.error(
              `Retry falhou para ${job.function_name}:`,
              (error as Error).message,
            );
          }
          await deps.wait(10_000);
        }
        if (critical.length) {
          try {
            await store.invoke("send-push", {
              title: "Piracanjuba.ai: Alerta de Sincronização",
              body: `Alerta: ${critical.length} sync(s) com falhas críticas: ${
                critical.map((job) => job.function_name).join(", ")
              }`,
              url: "/admin",
            });
          } catch (error) {
            console.error(
              "Falha no alerta de sincronização:",
              (error as Error).message,
            );
          }
        }
      }
      const summary = {
        dry_run: dryRun,
        total_jobs: jobs.length,
        healthy: healthy.length,
        unhealthy: unhealthy.length,
        retried,
        planned_retries: candidates.map((job) => job.function_name),
        critical: critical.map((job) => ({
          function: job.function_name,
          errors_7d: job.errors_7d,
          last_status: job.last_status,
          last_run: job.last_started_at,
        })),
        by_schedule: {
          scheduled: jobs.filter((job) =>
            job.cron_status === "scheduled"
          ).length,
          disabled: jobs.filter((job) => job.cron_status === "disabled").length,
          missing: jobs.filter((job) => job.cron_status === "missing").length,
        },
        retry_candidates: candidates.length,
        by_status: {
          healthy: healthy.length,
          failing: unhealthy.filter((job) =>
            job.health_status === "failing"
          ).length,
          stale:
            unhealthy.filter((job) => job.health_status === "stale").length,
          stuck:
            unhealthy.filter((job) => job.health_status === "stuck").length,
          degraded:
            unhealthy.filter((job) => job.health_status === "degraded").length,
          unobserved:
            unhealthy.filter((job) => job.health_status === "unobserved")
              .length,
          never_run:
            unhealthy.filter((job) => job.health_status === "never_run").length,
        },
      };
      if (logId) {
        await store.updateLog(
          logId,
          critical.length ? "partial" : "success",
          summary,
        );
      }
      return healthJson({ success: true, ...summary });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Falha do monitor";
      if (store && logId) {
        try {
          await store.updateLog(logId, "error", { error: message });
        } catch {
          console.error("Não foi possível concluir o log do monitor");
        }
      }
      return healthJson(
        { success: false, dry_run: dryRun, error: message },
        500,
      );
    }
  };
}
