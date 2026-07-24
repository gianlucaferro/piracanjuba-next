/// <reference lib="deno.ns" />
// deno-lint-ignore no-import-prefix
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// deno-lint-ignore no-import-prefix
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { servidorOriginKey } from "../_shared/servidor-origin.ts";
import { mapIdsByOrigin } from "../_shared/persistence-guards.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_url, competencia, orgao_tipo } = await req.json();

    if (!file_url || !competencia) {
      return new Response(
        JSON.stringify({ error: "file_url e competencia são obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch the xlsx file
    console.log(`Fetching file from: ${file_url}`);
    const fileResp = await fetch(file_url);
    if (!fileResp.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch file: ${fileResp.status}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const arrayBuffer = await fileResp.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

    console.log(`Total rows in xlsx: ${rows.length}`);

    // Find header row
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      if (row && row.some((c: unknown) => String(c).includes("Nome"))) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) {
      return new Response(JSON.stringify({ error: "Header row not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = rows[headerIdx].map((h: unknown) => String(h).trim());
    const matriculaIdx = headers.findIndex((header: string) => {
      const normalized = header.normalize("NFD").replace(/\p{M}/gu, "")
        .toLowerCase();
      return normalized.includes("matricula") || /^mat\.?$/.test(normalized);
    });
    const nomeIdx = headers.indexOf("Nome");
    const cargoIdx = headers.indexOf("Cargo");
    const proventosIdx = headers.findIndex((h: string) =>
      h.includes("Total proventos") || h.includes("proventos")
    );
    const descontosIdx = headers.findIndex((h: string) =>
      h.includes("desc") || h.includes("Descontos") ||
      h.includes("obrigatórios")
    );

    console.log(
      `Header indices - Matrícula: ${matriculaIdx}, Nome: ${nomeIdx}, Cargo: ${cargoIdx}, Proventos: ${proventosIdx}, Descontos: ${descontosIdx}`,
    );

    if (matriculaIdx === -1 || nomeIdx === -1 || proventosIdx === -1) {
      return new Response(
        JSON.stringify({ error: "Required columns not found", headers }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse data rows
    interface FolhaRow {
      matricula: string;
      nome: string;
      cargo: string;
      total_proventos: number;
      total_descontos: number;
    }

    const parseMoney = (val: unknown): number => {
      if (val === null || val === undefined) return 0;
      if (typeof val === "number") return val;
      const str = String(val);
      return parseFloat(
        str.replace("R$", "").replace(/\./g, "").replace(",", ".").trim(),
      ) || 0;
    };

    const registros: FolhaRow[] = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      const nome = row[nomeIdx] ? String(row[nomeIdx]).trim() : "";
      const matricula = row[matriculaIdx]
        ? String(row[matriculaIdx]).trim()
        : "";
      const cargo = cargoIdx >= 0 && row[cargoIdx]
        ? String(row[cargoIdx]).trim()
        : "";
      const total_proventos = parseMoney(row[proventosIdx]);
      const total_descontos = descontosIdx >= 0
        ? parseMoney(row[descontosIdx])
        : 0;

      if (nome && total_proventos > 0) {
        if (!matricula) {
          throw new Error(
            `Matrícula ausente na linha ${i + 1} para ${nome}`,
          );
        }
        registros.push({
          matricula,
          nome,
          cargo,
          total_proventos,
          total_descontos,
        });
      }
    }

    console.log(`Parsed ${registros.length} records with proventos > 0`);

    const orgaoTipo = orgao_tipo || "prefeitura";
    // Aggregate pela matrícula, nunca pelo nome.
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

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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

    // Fetch apenas pelas chaves persistidas.
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
      linhas_xlsx: rows.length,
      registros_com_proventos: registros.length,
      servidores_unicos: agg.size,
      servidores_atualizados: servidoresAtualizados,
      remuneracoes_atualizadas: remCriadas,
      orgao_tipo: orgaoTipo,
    };

    // Log
    await sb.from("sync_log").insert({
      tipo: "import_folha_xlsx",
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
