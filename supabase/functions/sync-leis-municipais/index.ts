/// <reference lib="deno.ns" />

import { hasCronOrServiceRoleAuth } from "../_shared/service-role-auth.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import {
  collectMunicipalLaws,
  isRetiredWordPressUrl,
  lawIdentity,
  type LawSourceResult,
  type MunicipalLaw,
  selectMunicipalLaws,
} from "../_shared/municipal-laws.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ExistingLaw = { id: string; numero: string; fonte_url: string | null };

type LeisMunicipaisDependencies = {
  createClient: typeof createClient;
  collect: typeof collectMunicipalLaws;
  env: (name: string) => string | undefined;
};

export function createLeisMunicipaisHandler(
  overrides: Partial<LeisMunicipaisDependencies> = {},
) {
  const deps: LeisMunicipaisDependencies = {
    createClient,
    collect: collectMunicipalLaws,
    env: (name) => Deno.env.get(name),
    ...overrides,
  };
  return async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    const response = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const serviceRoleKey = deps.env("SUPABASE_SERVICE_ROLE_KEY");
    if (
      !hasCronOrServiceRoleAuth(req, serviceRoleKey, deps.env("CRON_SECRET"))
    ) {
      return response({ success: false, error: "Não autorizado" }, 401);
    }
    const started = Date.now();
    let supabase: SupabaseClient | null = null;
    let logId: string | null = null;
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    let conflicts = 0;
    let rejected = 0;
    let total = 0;
    let sourceConflicts: string[] = [];
    let sourceSummaries:
      (Omit<LawSourceResult, "laws"> & { normalized: number })[] = [];
    let sourceErrors: string[] = [];
    const persistenceErrors: string[] = [];
    const details = () => ({
      inserted,
      updated,
      unchanged,
      conflicts,
      source_conflicts: sourceConflicts,
      rejected,
      total,
      sources: sourceSummaries,
      errors: [...sourceErrors, ...persistenceErrors],
      duration_ms: Date.now() - started,
    });
    const finishLog = async (
      status: "success" | "partial" | "error",
      result: Record<string, unknown>,
    ) => {
      if (!supabase || !logId) return;
      const { error } = await supabase.from("sync_log").update({
        status,
        detalhes: result,
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
      if (error) throw new Error(`Conclusão do sync_log: ${error.message}`);
    };

    try {
      const client = deps.createClient(
        deps.env("SUPABASE_URL")!,
        serviceRoleKey!,
      );
      supabase = client;
      const { data: log, error: logError } = await client.from("sync_log")
        .insert({
          tipo: "sync-leis-municipais",
          status: "running",
          detalhes: details(),
        }).select("id").single();
      if (logError || !log?.id) {
        throw new Error(
          `Início do sync_log: ${
            logError?.message || "registro não retornou ID"
          }`,
        );
      }
      logId = log.id;
      const { sources, errors } = await deps.collect();
      sourceErrors = errors;
      sourceSummaries = sources.map(({ laws, ...source }) => ({
        ...source,
        normalized: laws.length,
      }));
      rejected = sources.reduce((count, source) => count + source.rejected, 0);
      if (!sources.length) {
        const result = { success: false, partial: false, ...details() };
        await finishLog("error", result);
        return response(result, 502);
      }

      const existing = new Map<string, ExistingLaw[]>();
      for (let offset = 0;; offset += 1000) {
        const { data, error } = await client.from("leis_municipais")
          .select("id,numero,fonte_url").order("id").range(
            offset,
            offset + 999,
          );
        if (error) {
          throw new Error(`Leitura das leis existentes: ${error.message}`);
        }
        for (const law of data ?? []) {
          const key = lawIdentity(law.numero);
          if (key) existing.set(key, [...(existing.get(key) ?? []), law]);
        }
        if (!data || data.length < 1000) break;
      }

      // A Prefeitura fornece a fonte histórica atual. A Câmara também publica 2026.
      // A ordem mantém a fonte principal quando ambas publicam o mesmo número.
      const selection = selectMunicipalLaws(sources);
      const unique = selection.laws;

      const inserts: MunicipalLaw[] = [];
      const repairs: { id: string; fonte_url: string }[] = [];
      conflicts = selection.conflicts.length;
      sourceConflicts = selection.conflicts;
      total = unique.size;
      for (const [key, law] of unique) {
        const matches = existing.get(key) ?? [];
        if (matches.length > 1) {
          conflicts++;
        } else if (matches.length === 0) {
          inserts.push(law);
        } else if (isRetiredWordPressUrl(matches[0].fonte_url)) {
          // Preserva identidade, resumo, categoria e ementa histórica, que pode ser
          // mais completa do que os textos truncados publicados pela API atual.
          repairs.push({ id: matches[0].id, fonte_url: law.fonte_url });
        } else {
          unchanged++;
        }
      }

      for (let offset = 0; offset < inserts.length; offset += 100) {
        const batch = inserts.slice(offset, offset + 100);
        const { data, error } = await client.from("leis_municipais")
          .upsert(batch, { onConflict: "numero", ignoreDuplicates: true })
          .select(
            "id",
          );
        if (error) persistenceErrors.push(`Inserção de lote: ${error.message}`);
        else inserted += data?.length ?? 0;
      }
      for (let offset = 0; offset < repairs.length; offset += 10) {
        const results = await Promise.allSettled(
          repairs.slice(offset, offset + 10).map(async (repair) => {
            const { error } = await client.from("leis_municipais")
              .update({ fonte_url: repair.fonte_url }).eq("id", repair.id);
            return error;
          }),
        );
        // Contabiliza as gravações já disparadas mesmo se uma delas interromper.
        for (const result of results) {
          if (result.status === "rejected") continue;
          if (result.value) {
            persistenceErrors.push(
              `Atualização da fonte: ${result.value.message}`,
            );
          } else updated++;
        }
        const interrupted = results.find((result) =>
          result.status === "rejected"
        );
        if (interrupted?.status === "rejected") throw interrupted.reason;
      }

      const success = errors.length === 0 && persistenceErrors.length === 0 &&
        conflicts === 0 && rejected === 0;
      const result = {
        success,
        partial: !success,
        ...details(),
        warnings: rejected
          ? [
            "Registros oficiais inválidos foram ignorados; consultar o total rejected por fonte.",
          ]
          : [],
      };
      await finishLog(success ? "success" : "partial", result);
      return response(
        result,
        persistenceErrors.length
          ? 500
          : errors.length
          ? 502
          : success
          ? 200
          : 207,
      );
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Erro interno";
      const result = { success: false, error: message, ...details() };
      console.error("Sincronização de leis:", message);
      try {
        await finishLog("error", result);
      } catch (logError) {
        console.error(
          "Falha ao concluir sync_log de leis:",
          logError instanceof Error ? logError.message : "Erro interno",
        );
      }
      return response(result, 500);
    }
  };
}

Deno.serve(createLeisMunicipaisHandler());
