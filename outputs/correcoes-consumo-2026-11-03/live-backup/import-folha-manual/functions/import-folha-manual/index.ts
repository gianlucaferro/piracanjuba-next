/// <reference lib="deno.ns" />
// deno-lint-ignore no-import-prefix
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  normalizeSourceIdentifier,
  servidorOriginKey,
} from "../_shared/servidor-origin.ts";
import { mapIdsByOrigin } from "../_shared/persistence-guards.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FolhaRow {
  matricula?: string | number;
  identificador_origem?: string | number;
  nome: string;
  cargo: string;
  total_proventos: number;
  total_descontos: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { competencia, orgao_tipo, registros } = await req.json() as {
      competencia: string; // "2026-02"
      orgao_tipo: string; // "prefeitura" or "camara"
      registros: FolhaRow[];
    };

    if (!competencia || !registros?.length) {
      return new Response(
        JSON.stringify({ error: "competencia e registros são obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (
      registros.some((row) =>
        !normalizeSourceIdentifier(
          row.identificador_origem ?? row.matricula,
        )
      )
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Cada registro deve informar matricula ou identificador_origem",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const orgaoTipo = orgao_tipo || "prefeitura";

    // A identidade acompanha a matrícula informada. Nome não é chave de pessoa.
    const agg = new Map<string, {
      origemChave: string;
      nome: string;
      cargo: string;
      bruto: number;
      descontos: number;
    }>();
    for (const r of registros) {
      const origemChave = servidorOriginKey(
        orgaoTipo,
        "importacao-matricula",
        r.identificador_origem ?? r.matricula,
      );
      const existing = agg.get(origemChave);
      if (!existing) {
        agg.set(origemChave, {
          origemChave,
          nome: r.nome,
          cargo: r.cargo,
          bruto: r.total_proventos,
          descontos: r.total_descontos,
        });
      } else {
        if (existing.nome !== r.nome) {
          throw new Error(
            `Identificador de origem repetido para nomes distintos: ${origemChave}`,
          );
        }
        existing.bruto += r.total_proventos;
        existing.descontos += r.total_descontos;
        // Prefer non-empty cargo
        if (!existing.cargo && r.cargo) existing.cargo = r.cargo;
      }
    }

    console.log(`Registros: ${registros.length}, Únicos: ${agg.size}`);

    // Upsert servidores
    const BATCH = 200;
    const entries = [...agg.values()];
    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH).map((row) => ({
        nome: row.nome,
        cargo: row.cargo || null,
        orgao_tipo: orgaoTipo,
        origem_chave: row.origemChave,
        fonte_url: "importação manual - planilha",
      }));
      const { error } = await sb.from("servidores").upsert(batch, {
        onConflict: "origem_chave",
      });
      if (error) throw new Error(`Srv batch ${i}: ${error.message}`);
    }

    // Resolve somente pelas mesmas chaves usadas no upsert.
    const dbSrvs: { id: string; origem_chave: string }[] = [];
    const originKeys = entries.map((row) => row.origemChave);
    for (let i = 0; i < originKeys.length; i += BATCH) {
      const { data, error } = await sb.from("servidores")
        .select("id, origem_chave")
        .in("origem_chave", originKeys.slice(i, i + BATCH));
      if (error) throw new Error(`Busca servidores ${i}: ${error.message}`);
      dbSrvs.push(...(data || []));
    }
    const originMap = mapIdsByOrigin(dbSrvs, originKeys);

    // Build and upsert remunerações
    const rems = entries
      .filter((row) => originMap.has(row.origemChave) && row.bruto > 0)
      .map((row) => ({
        servidor_id: originMap.get(row.origemChave)!,
        competencia,
        bruto: Math.round(row.bruto * 100) / 100,
        liquido: Math.round((row.bruto - row.descontos) * 100) / 100,
        fonte_url: "importação manual - planilha",
      }));

    let remCriadas = 0;
    for (let i = 0; i < rems.length; i += BATCH) {
      const batch = rems.slice(i, i + BATCH);
      const { data, error } = await sb.from("remuneracao_servidores")
        .upsert(
          batch.map((row) => ({ ...row, tipo_folha: "NORMAL" })),
          { onConflict: "servidor_id,competencia,tipo_folha" },
        ).select("id");
      if (error) throw new Error(`Rem batch ${i}: ${error.message}`);
      remCriadas += (data || []).length;
    }

    const result = {
      competencia,
      servidores: agg.size,
      remuneracoes: remCriadas,
      orgao_tipo: orgaoTipo,
    };

    // Log
    await sb.from("sync_log").insert({
      tipo: "import_folha_manual",
      status: "success",
      detalhes: result,
      finished_at: new Date().toISOString(),
    });

    // Send push notification for new payroll
    if (remCriadas > 0) {
      const [anoStr, mesStr] = competencia.split("-");
      const meses = [
        "",
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
      ];
      const mesNome = meses[parseInt(mesStr)] || competencia;
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            title: `💰 Folha de ${mesNome}/${anoStr} disponível`,
            body:
              `A folha de pagamento de ${mesNome} já está disponível com ${remCriadas} registros.`,
            topic: "geral",
            url: "/prefeitura",
            dedup_key: `folha_${competencia}`,
          }),
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error("Push notification error:", message);
      }
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erro:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
