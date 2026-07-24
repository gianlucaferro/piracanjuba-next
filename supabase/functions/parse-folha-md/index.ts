/// <reference lib="deno.ns" />
// deno-lint-ignore no-import-prefix
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { servidorOriginKey } from "../_shared/servidor-origin.ts";
import { mapIdsByOrigin } from "../_shared/persistence-guards.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FolhaRow {
  matricula: string;
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
    const { competencia, orgao_tipo, markdown_content } = await req.json();

    if (!competencia || !markdown_content) {
      return new Response(
        JSON.stringify({
          error: "competencia e markdown_content são obrigatórios",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const rows: FolhaRow[] = [];
    const lines = markdown_content.split("\n");

    // Regex para extrair dados da tabela markdown
    // Ex: |Mat.|Nome|...|Cargo|...|Salário base|Total proventos|Total desc. obrigatórios|
    // |51496684|ADIR FRANCISCO DOS REIS|...|ASSESSOR|...|R$ 1,533.67|R$ 1,563.10|R$ 117.23|

    for (const line of lines) {
      if (
        !line.trim().startsWith("|") || line.includes("Nome") ||
        line.includes("---")
      ) continue;

      const cols = line.split("|").map((c: string) => c.trim());
      // cols[0] is empty (before first |)
      // cols[1] = Matrícula
      // cols[2] = Nome
      // ...
      // cols[6] = Cargo (index 5 se não contar o vazio inicial, mas split gera vazio no inicio)
      // Vamos contar índices baseados no split:
      // ["", "Mat", "Nome", "Adm", "Tipo", "Estab", "Cargo", ...]

      if (cols.length < 12) continue;

      const matricula = cols[1];
      const nome = cols[2];
      const cargo = cols[6];

      // Proventos e Descontos estão nas últimas colunas
      // A tabela tem: ... |Tp. pagto|Salário base|Total proventos|Total desc. obrigatórios|
      // Vamos pegar as duas últimas colunas com valores monetários

      // Limpar R$ e converter para number
      const parseMoney = (val: string) => {
        if (!val) return 0;
        return parseFloat(
          val.replace("R$", "").replace(/\./g, "").replace(",", ".").trim(),
        ) || 0;
      };

      // Assumindo que Total Proventos é a penúltima e Descontos a última (antes do pipe final)
      // A linha termina com |, então o último elemento é ""
      // ["", "Mat", "Nome", ..., "Tp Pagto", "Base", "Proventos", "Descontos", ""]
      // Indices relativos ao fim

      const proventosStr = cols[cols.length - 3]; // Antepenúltimo (se ultimo é vazio)
      const descontosStr = cols[cols.length - 2]; // Penúltimo

      const total_proventos = parseMoney(proventosStr);
      const total_descontos = parseMoney(descontosStr);

      if (nome && total_proventos > 0) {
        if (!matricula) {
          throw new Error(`Matrícula ausente para ${nome}`);
        }
        rows.push({
          matricula,
          nome,
          cargo,
          total_proventos,
          total_descontos,
        });
      }
    }

    console.log(`Extraídos ${rows.length} registros do markdown`);

    // Agora processa igual ao import-folha-manual
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const orgaoTipo = orgao_tipo || "prefeitura";

    // A identidade acompanha a matrícula extraída da primeira coluna.
    const agg = new Map<string, {
      origemChave: string;
      nome: string;
      cargo: string;
      bruto: number;
      descontos: number;
    }>();
    for (const r of rows) {
      const origemChave = servidorOriginKey(
        orgaoTipo,
        "importacao-matricula",
        r.matricula,
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
            `Matrícula repetida para nomes distintos: ${r.matricula}`,
          );
        }
        existing.bruto += r.total_proventos;
        existing.descontos += r.total_descontos;
        if (!existing.cargo && r.cargo && r.cargo !== "-") {
          existing.cargo = r.cargo;
        }
      }
    }

    // Upsert servidores
    const BATCH = 200;
    const entries = [...agg.values()];
    let servidoresAtualizados = 0;

    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH).map((row) => ({
        nome: row.nome,
        cargo: row.cargo || null,
        orgao_tipo: orgaoTipo,
        origem_chave: row.origemChave,
        fonte_url: "importação manual - planilha fev/2026",
      }));
      const { error } = await sb.from("servidores").upsert(batch, {
        onConflict: "origem_chave",
      });
      if (error) throw new Error(`Srv batch ${i}: ${error.message}`);
      else servidoresAtualizados += batch.length;
    }

    // Fetch apenas pelas mesmas chaves usadas no upsert.
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

    // Upsert remunerações
    const rems = entries
      .filter((row) => originMap.has(row.origemChave) && row.bruto > 0)
      .map((row) => ({
        servidor_id: originMap.get(row.origemChave)!,
        competencia,
        bruto: Math.round(row.bruto * 100) / 100,
        liquido: Math.round((row.bruto - row.descontos) * 100) / 100,
        fonte_url: "importação manual - planilha fev/2026",
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
      linhas_processadas: rows.length,
      servidores_unicos: agg.size,
      servidores_atualizados: servidoresAtualizados,
      remuneracoes_atualizadas: remCriadas,
    };

    // Log
    await sb.from("sync_log").insert({
      tipo: "import_folha_md",
      status: "success",
      detalhes: result,
      finished_at: new Date().toISOString(),
    });

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
