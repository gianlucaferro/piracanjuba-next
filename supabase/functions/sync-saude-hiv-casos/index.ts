import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hasCronOrServiceRoleAuth } from "../_shared/service-role-auth.ts";
import {
  failHealthSnapshot, healthDateYear, healthError, readHealthSource, saveHealthSnapshot,
  startHealthSnapshot, strictHealthNumber, strictHealthYear,
  type HealthSnapshotRow,
} from "../_shared/health-snapshot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "x-cron-secret, authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MUNICIPIO = "Piracanjuba";

// Resource IDs from dadosabertos.go.gov.br/dataset/ist-aids
const RESOURCES = {
  adulto: "9cac6ec3-47f5-4e85-9a2f-ae7acbe94810",
  crianca: "8d563b7f-01b0-4d1e-9be9-eaa39082f204",
  gestante: "89737856-1272-40f9-8bb9-061a8bb933d9",
  gestante_taxa: "03cc41bf-4aa6-4f93-86d9-5cc375bf18a3",
  obitos: "6ed31d56-ffea-48ec-ba78-d6284cc973cc",
};

type RawRecord = {
  data_diagnostico?: string;
  data_obito?: string;
  codigo_ibge: string;
  municipio: string;
  sexo: string;
  raca_cor: string;
  faixa_etaria: string;
  escolaridade: string;
  classificacao: string;
};

function aggregateByYear(records: RawRecord[], dateField: "data_diagnostico" | "data_obito"): Map<number, number> {
  const byYear = new Map<number, number>();
  for (const r of records) {
    const year = healthDateYear(r[dateField]);
    byYear.set(year, (byYear.get(year) || 0) + 1);
  }
  return byYear;
}

function aggregateBySexAndYear(records: RawRecord[], dateField: "data_diagnostico" | "data_obito"): Map<string, number> {
  const result = new Map<string, number>();
  for (const r of records) {
    const year = healthDateYear(r[dateField]);
    const key = `${year}|${r.sexo}`;
    result.set(key, (result.get(key) || 0) + 1);
  }
  return result;
}

function aggregateByAgeAndYear(records: RawRecord[], dateField: "data_diagnostico" | "data_obito"): Map<string, number> {
  const result = new Map<string, number>();
  for (const r of records) {
    const year = healthDateYear(r[dateField]);
    const key = `${year}|${r.faixa_etaria}`;
    result.set(key, (result.get(key) || 0) + 1);
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  if (!hasCronOrServiceRoleAuth(req, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), Deno.env.get("CRON_SECRET"))) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  let logId: string | null = null;
  try {
    logId = await startHealthSnapshot(supabase, "sync-saude-hiv-casos");
    console.log("Fetching HIV/AIDS data from Dados Abertos GO...");

    const deadline = Date.now() + 90_000;
    const [adultoSource, obitosSource, criancaSource, gestanteSource, taxaSource] = await Promise.all([
      readHealthSource<RawRecord>(RESOURCES.adulto, "municipio", MUNICIPIO, fetch, deadline),
      readHealthSource<RawRecord>(RESOURCES.obitos, "municipio", MUNICIPIO, fetch, deadline),
      readHealthSource<RawRecord>(RESOURCES.crianca, "municipio", MUNICIPIO, fetch, deadline),
      readHealthSource<RawRecord>(RESOURCES.gestante, "municipio", MUNICIPIO, fetch, deadline),
      readHealthSource(RESOURCES.gestante_taxa, "LOCAL", "PIRACANJUBA", fetch, deadline),
    ]);
    const adultoRecords = adultoSource.records;
    const obitosRecords = obitosSource.records;
    const criancaRecords = criancaSource.records;
    const gestanteRecords = gestanteSource.records;
    if (!adultoRecords.length) throw new Error("Fonte principal de HIV vazia; snapshot anterior preservado");

    console.log(`Fetched: ${adultoRecords.length} adulto, ${obitosRecords.length} óbitos, ${criancaRecords.length} criança, ${gestanteRecords.length} gestante`);

    // Combine all diagnosis records
    const allDiagnosticos = [...adultoRecords, ...criancaRecords, ...gestanteRecords];

    // Aggregate data
    const diagByYear = aggregateByYear(allDiagnosticos, "data_diagnostico");
    const obitosByYear = aggregateByYear(obitosRecords, "data_obito");
    const diagBySex = aggregateBySexAndYear(allDiagnosticos, "data_diagnostico");
    const diagByAge = aggregateByAgeAndYear(allDiagnosticos, "data_diagnostico");

    const rows: HealthSnapshotRow[] = [];
    const fonte = "SES-GO / Dados Abertos Goiás (SINAN)";
    const fonteUrl = "https://dadosabertos.go.gov.br/dataset/ist-aids";

    // Diagnósticos por ano
    for (const [year, count] of diagByYear) {
      rows.push({
        categoria: "hiv",
        indicador: "diagnosticos_ano",
        ano: year,
        valor: count,
        fonte,
        fonte_url: fonteUrl,
      });
    }

    // Óbitos por ano
    for (const [year, count] of obitosByYear) {
      rows.push({
        categoria: "hiv",
        indicador: "obitos_anual",
        ano: year,
        valor: count,
        fonte: "SES-GO / Dados Abertos Goiás (SIM)",
        fonte_url: fonteUrl,
      });
    }

    // Diagnósticos por sexo: use mes=1 for MASCULINO, mes=2 for FEMININO to satisfy unique constraint
    const sexoToMes: Record<string, number> = { "MASCULINO": 1, "FEMININO": 2 };
    for (const [key, count] of diagBySex) {
      const [yearStr, sexo] = key.split("|");
      const mesVal = sexoToMes[sexo] || 3;
      rows.push({
        categoria: "hiv",
        indicador: "diagnosticos_sexo",
        ano: parseInt(yearStr),
        mes: mesVal,
        valor: count,
        valor_texto: sexo,
        fonte,
        fonte_url: fonteUrl,
      });
    }

    // Diagnósticos por faixa etária: encode age group as mes (1-9)
    const faixaOrder = ["10 A 14 ANOS", "15 A 19 ANOS", "20 A 29 ANOS", "30 A 39 ANOS", "40 A 49 ANOS", "50 A 59 ANOS", ">= 60 ANOS"];
    for (const [key, count] of diagByAge) {
      const [yearStr, faixa] = key.split("|");
      const mesVal = faixaOrder.indexOf(faixa) + 1 || faixaOrder.length + 1;
      rows.push({
        categoria: "hiv",
        indicador: "diagnosticos_faixa_etaria",
        ano: parseInt(yearStr),
        mes: mesVal,
        valor: count,
        valor_texto: faixa,
        fonte,
        fonte_url: fonteUrl,
      });
    }

    // Gestantes por ano (separate from general diagnostics)
    const gestanteByYear = aggregateByYear(gestanteRecords, "data_diagnostico");
    for (const [year, count] of gestanteByYear) {
      rows.push({
        categoria: "hiv",
        indicador: "gestantes_ano",
        ano: year,
        valor: count,
        fonte,
        fonte_url: fonteUrl,
      });
    }

    // As taxas só entram após leitura completa, sem converter ausência em zero.
    for (const r of taxaSource.records) {
      rows.push({
        categoria: "hiv", indicador: "gestantes_taxa_deteccao",
        ano: strictHealthYear(r.ano), valor: strictHealthNumber(r.taxa, "taxa"),
        valor_texto: `${strictHealthNumber(r.qtde, "casos", true)} casos em ${strictHealthNumber(r.qtd_nasc, "nascidos vivos", true)} nascidos vivos`,
        fonte, fonte_url: fonteUrl,
      });
    }

    // Totals
    const totalDiag = allDiagnosticos.length;
    const totalObitos = obitosRecords.length;
    const totalGestantes = gestanteRecords.length;
    const latestYear = Math.max(...Array.from(diagByYear.keys()));
    rows.push({
      categoria: "hiv",
      indicador: "total_diagnosticos",
      ano: latestYear,
      valor: totalDiag,
      fonte,
      fonte_url: fonteUrl,
    });
    rows.push({
      categoria: "hiv",
      indicador: "total_obitos",
      ano: latestYear,
      valor: totalObitos,
      fonte: "SES-GO / Dados Abertos Goiás (SIM)",
      fonte_url: fonteUrl,
    });
    rows.push({
      categoria: "hiv",
      indicador: "total_gestantes",
      ano: latestYear,
      valor: totalGestantes,
      fonte,
      fonte_url: fonteUrl,
    });

    const saved = await saveHealthSnapshot(supabase, "hiv_casos", logId, rows,
      [adultoSource.receipt, obitosSource.receipt, criancaSource.receipt, gestanteSource.receipt, taxaSource.receipt]);

    return new Response(
      JSON.stringify({
        success: true,
        diagnosticos_adulto: adultoRecords.length,
        diagnosticos_crianca: criancaRecords.length,
        diagnosticos_gestante: gestanteRecords.length,
        obitos: obitosRecords.length,
        indicadores_inseridos: saved.inserted,
        indicadores_confirmados: saved.total,
        indicadores_atualizados: saved.updated,
        indicadores_preservados: saved.unchanged,
        indicadores_removidos: saved.removed,
        historicos_fora_do_payload_preservados: saved.preserved_missing,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    await failHealthSnapshot(supabase, logId, error);
    console.error("Falha na sincronização:", healthError(error));
    return new Response(
      JSON.stringify({ success: false, error: healthError(error), log_id: logId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
