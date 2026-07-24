/// <reference lib="deno.ns" />

// Enriquece, em lotes controlados, todos os CNPJs encontrados nas fontes
// canonicas de contratos, aditivos, empenhos e pagamentos.

// deno-lint-ignore no-import-prefix
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkCentiAuth } from "../_shared/centi-auth.ts";
import { consultarCnpjComFallback } from "../_shared/cnpj-fallback.ts";
import { type JsonObject } from "../_shared/cnpj-normalize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-cron-secret, x-centi-ingest-secret",
};

const BRASIL_API = "https://brasilapi.com.br/api/cnpj/v1";
const OPEN_CNPJ = "https://api.opencnpj.org";
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_EXECUTION_MS = 110_000;
const MIN_REMAINING_FOR_ITEM_MS = 40_000;
const SOURCE_TIMEOUT_MS = 8_000;
const SOURCE_ATTEMPTS = 2;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function boundedInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`Parametro inteiro invalido: ${String(value)}`);
  }
  return parsed;
}

async function readBoundedJson(resp: Response): Promise<JsonObject> {
  const declaredLength = Number(resp.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error(`Resposta CNPJ excede ${MAX_RESPONSE_BYTES} bytes`);
  }
  if (!resp.body) throw new Error("Resposta CNPJ sem corpo");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new Error(`Resposta CNPJ excedeu ${MAX_RESPONSE_BYTES} bytes`);
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();

  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Resposta CNPJ nao e um objeto");
  }
  return parsed as JsonObject;
}

async function fetchCnpjSource(url: string): Promise<JsonObject | null> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < SOURCE_ATTEMPTS; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Piracanjuba.ai dados publicos",
        },
        signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
      });
      if (resp.status === 404) return null;
      if (resp.status === 429 || resp.status >= 500) {
        await resp.body?.cancel().catch(() => undefined);
        if (attempt < SOURCE_ATTEMPTS - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1_000 * (attempt + 1))
          );
          continue;
        }
      }
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      return await readBoundedJson(resp);
    } catch (error) {
      lastError = error;
      if (attempt < SOURCE_ATTEMPTS - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1_000 * (attempt + 1))
        );
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Falha desconhecida na consulta de CNPJ");
}

function consultarCnpj(cnpj: string) {
  return consultarCnpjComFallback(cnpj, [
    {
      nome: "brasilapi",
      consultar: () => fetchCnpjSource(`${BRASIL_API}/${cnpj}`),
    },
    {
      nome: "opencnpj",
      consultar: () => fetchCnpjSource(`${OPEN_CNPJ}/${cnpj}`),
    },
  ]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }
  if (!checkCentiAuth(req)) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const startedAt = Date.now();
  const deadlineAt = startedAt + MAX_EXECUTION_MS;
  let logId: string | null = null;
  let leaseToken: string | null = null;
  let releaseAttempted = false;

  async function releaseLease(): Promise<void> {
    if (!leaseToken || releaseAttempted) return;
    releaseAttempted = true;

    const { data: released, error: releaseError } = await supabase.rpc(
      "release_sync_fornecedores_cnpj",
      { lease_token: leaseToken },
    );
    if (releaseError || released !== true) {
      throw new Error(
        `liberacao do lease CNPJ: ${
          releaseError?.message ?? "lease nao pertencia mais a esta execucao"
        }`,
      );
    }
    leaseToken = null;
  }

  try {
    const { data: claimedLease, error: leaseError } = await supabase.rpc(
      "claim_sync_fornecedores_cnpj",
    );
    if (leaseError) {
      throw new Error(`claim do sync CNPJ: ${leaseError.message}`);
    }
    leaseToken = claimedLease ?? null;
    if (!leaseToken) {
      return jsonResponse({
        success: true,
        status: "skipped",
        reason: "sync_fornecedores_cnpj_em_execucao",
        duration_ms: Date.now() - startedAt,
      }, 202);
    }

    const body = req.method === "POST"
      ? await req.json().catch(() => ({}))
      : {};
    const batchSize = boundedInteger(body?.batch_size, 20, 1, 50);

    const { data: log, error: logError } = await supabase
      .from("sync_log")
      .insert({
        tipo: "sync-fornecedores-cnpj",
        status: "running",
        detalhes: {
          source: "brasilapi+opencnpj",
          batch_size: batchSize,
        },
      })
      .select("id")
      .single();
    if (logError) throw new Error(`sync_log start: ${logError.message}`);
    logId = log?.id ?? null;

    const { data: pendentes, error: pendingError } = await supabase.rpc(
      "cnpjs_investigativos_pendentes",
      { limite: batchSize },
    );
    if (pendingError) {
      throw new Error(`cnpjs pendentes: ${pendingError.message}`);
    }

    const cnpjs = (pendentes ?? [])
      .map((item: { cnpj?: string }) => item.cnpj?.replace(/\D/g, ""))
      .filter((cnpj: string | undefined): cnpj is string =>
        Boolean(cnpj && cnpj.length === 14)
      );

    let enriquecidos = 0;
    let processados = 0;
    let interrompidoPorOrcamento = false;
    const falhas: Array<{ cnpj: string; erro: string }> = [];
    const fontes: Record<string, number> = {};

    if (cnpjs.length === 0) {
      const details = {
        source: "brasilapi+opencnpj",
        solicitados: 0,
        enriquecidos: 0,
        falhas: 0,
        pendentes_amostra: 0,
        fontes,
        refresh: null,
        duration_ms: Date.now() - startedAt,
      };

      if (logId) {
        const { error: finishLogError } = await supabase
          .from("sync_log")
          .update({
            status: "success",
            detalhes: details,
            finished_at: new Date().toISOString(),
          })
          .eq("id", logId);
        if (finishLogError) {
          throw new Error(
            `sync_log final sem pendentes: ${finishLogError.message}`,
          );
        }
      }

      await releaseLease();
      return jsonResponse({ success: true, status: "success", ...details });
    }

    for (const cnpj of cnpjs) {
      if (Date.now() + MIN_REMAINING_FOR_ITEM_MS > deadlineAt) {
        interrompidoPorOrcamento = true;
        break;
      }

      try {
        const { row, fonte } = await consultarCnpj(cnpj);
        if (!row || !fonte) {
          throw new Error("CNPJ nao encontrado nas fontes consultadas");
        }

        const { error: upsertError } = await supabase
          .from("fornecedores_cnpj")
          .upsert(row, { onConflict: "cnpj" });
        if (upsertError) throw upsertError;

        const { error: deleteFailureError } = await supabase
          .from("fornecedores_cnpj_falhas")
          .delete()
          .eq("cnpj", cnpj);
        if (deleteFailureError) {
          throw new Error(
            `limpeza do backoff de ${cnpj}: ${deleteFailureError.message}`,
          );
        }

        fontes[fonte] = (fontes[fonte] ?? 0) + 1;
        enriquecidos++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        falhas.push({ cnpj, erro: message });
        const { data: atual, error: failureReadError } = await supabase
          .from("fornecedores_cnpj_falhas")
          .select("tentativas")
          .eq("cnpj", cnpj)
          .maybeSingle();
        if (failureReadError) {
          throw new Error(
            `leitura do backoff de ${cnpj}: ${failureReadError.message}; ` +
              `erro original: ${message}`,
          );
        }
        const tentativas = Number(atual?.tentativas ?? 0) + 1;
        const horas = Math.min(24 * 30, 2 ** Math.min(tentativas, 10));
        const { error: failureUpsertError } = await supabase
          .from("fornecedores_cnpj_falhas")
          .upsert({
            cnpj,
            tentativas,
            ultimo_erro: message.slice(0, 500),
            proxima_tentativa_em: new Date(
              Date.now() + horas * 60 * 60 * 1_000,
            ).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "cnpj" });
        if (failureUpsertError) {
          throw new Error(
            `persistencia do backoff de ${cnpj}: ` +
              `${failureUpsertError.message}; erro original: ${message}`,
          );
        }
      }
      processados++;

      // Mantem a cadencia conservadora da BrasilAPI.
      await new Promise((resolve) => setTimeout(resolve, 1_100));
    }

    const { data: remaining, error: remainingError } = await supabase.rpc(
      "cnpjs_investigativos_pendentes",
      { limite: 100 },
    );
    if (remainingError) {
      throw new Error(`contagem de pendentes: ${remainingError.message}`);
    }

    let refresh: unknown = null;
    if ((remaining?.length ?? 0) === 0) {
      const { data, error: refreshError } = await supabase.rpc(
        "refresh_investigacao_piracanjuba",
      );
      if (refreshError) {
        throw new Error(`refresh investigativo: ${refreshError.message}`);
      }
      refresh = data;
    }

    const details = {
      source: "brasilapi+opencnpj",
      solicitados: cnpjs.length,
      processados,
      enriquecidos,
      falhas: falhas.length,
      interrompido_por_orcamento: interrompidoPorOrcamento,
      pendentes_amostra: remaining?.length ?? 0,
      fontes,
      refresh,
      duration_ms: Date.now() - startedAt,
    };
    const status = falhas.length === 0 && !interrompidoPorOrcamento
      ? "success"
      : "partial";

    if (logId) {
      const { error: finishLogError } = await supabase
        .from("sync_log")
        .update({
          status,
          detalhes: { ...details, erros: falhas.slice(0, 10) },
          finished_at: new Date().toISOString(),
        })
        .eq("id", logId);
      if (finishLogError) {
        throw new Error(`sync_log final: ${finishLogError.message}`);
      }
    }

    await releaseLease();
    return jsonResponse({
      success: true,
      status,
      ...details,
      erros: falhas.slice(0, 10),
    }, status === "success" ? 200 : 206);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    let responseError = message;
    if (logId) {
      const { error: errorLogError } = await supabase
        .from("sync_log")
        .update({
          status: "error",
          detalhes: {
            error: message,
            duration_ms: Date.now() - startedAt,
          },
          finished_at: new Date().toISOString(),
        })
        .eq("id", logId);
      if (errorLogError) {
        responseError +=
          `; falha ao finalizar sync_log: ${errorLogError.message}`;
      }
    }
    try {
      await releaseLease();
    } catch (releaseError) {
      const releaseMessage = releaseError instanceof Error
        ? releaseError.message
        : String(releaseError);
      if (!responseError.includes(releaseMessage)) {
        responseError += `; ${releaseMessage}`;
      }
    }
    return jsonResponse({
      success: false,
      error: responseError,
      duration_ms: Date.now() - startedAt,
    }, 500);
  }
});
