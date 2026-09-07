/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  collectMunicipalLaws,
  isRetiredWordPressUrl,
  lawIdentity,
  type MunicipalLaw,
  selectMunicipalLaws,
} from "../_shared/municipal-laws.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ExistingLaw = { id: string; numero: string; fonte_url: string | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const response = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { sources, errors } = await collectMunicipalLaws();
    if (!sources.length) {
      return response({ success: false, partial: false, errors }, 502);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const existing = new Map<string, ExistingLaw[]>();
    for (let offset = 0;; offset += 1000) {
      const { data, error } = await supabase.from("leis_municipais")
        .select("id,numero,fonte_url").order("id").range(offset, offset + 999);
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
    let conflicts = selection.conflicts.length;
    let unchanged = 0;
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

    let inserted = 0;
    let updated = 0;
    const persistenceErrors: string[] = [];
    for (let offset = 0; offset < inserts.length; offset += 100) {
      const batch = inserts.slice(offset, offset + 100);
      const { data, error } = await supabase.from("leis_municipais")
        .upsert(batch, { onConflict: "numero", ignoreDuplicates: true }).select(
          "id",
        );
      if (error) persistenceErrors.push(`Inserção de lote: ${error.message}`);
      else inserted += data?.length ?? 0;
    }
    for (let offset = 0; offset < repairs.length; offset += 10) {
      const results = await Promise.all(
        repairs.slice(offset, offset + 10).map(async (repair) => {
          const { error } = await supabase.from("leis_municipais")
            .update({ fonte_url: repair.fonte_url }).eq("id", repair.id);
          return error;
        }),
      );
      for (const error of results) {
        if (error) {
          persistenceErrors.push(`Atualização da fonte: ${error.message}`);
        } else updated++;
      }
    }

    const rejected = sources.reduce(
      (total, source) => total + source.rejected,
      0,
    );
    const success = errors.length === 0 && persistenceErrors.length === 0 &&
      conflicts === 0 && rejected === 0;
    return response(
      {
        success,
        partial: !success,
        inserted,
        updated,
        unchanged,
        conflicts,
        source_conflicts: selection.conflicts,
        rejected,
        total: unique.size,
        sources: sources.map(({ laws: _laws, ...source }) => ({
          ...source,
          normalized: _laws.length,
        })),
        errors: [...errors, ...persistenceErrors],
        warnings: rejected
          ? [
            "Registros oficiais inválidos foram ignorados; consultar o total rejected por fonte.",
          ]
          : [],
      },
      persistenceErrors.length
        ? 500
        : errors.length
        ? 502
        : success
        ? 200
        : 207,
    );
  } catch (error) {
    console.error("Sincronização de leis:", error);
    return response({
      success: false,
      error: error instanceof Error ? error.message : "Erro interno",
    }, 500);
  }
});
