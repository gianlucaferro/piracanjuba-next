/// <reference lib="deno.ns" />
import { hasCronOrServiceRoleAuth } from "../_shared/service-role-auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import {
  baixarPdfPresenca,
  type ListaPresenca,
  parseListasPresenca,
  parsePedidoPresencas,
  parseResultadoPresencas,
  type PresencaExistente,
  PRESENCAS_CENTI_URL,
  PRESENCAS_UA,
  protegerPresencasConfirmadas,
  resolverVereadoresPresenca,
  selecionarLotePresencas,
  sessaoJaVerificada,
  urlPresenca,
  type VereadorPresenca,
} from "../_shared/presencas-centi.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
const message = (error: unknown): string =>
  error && typeof error === "object" && "message" in error
    ? String(error.message)
    : String(error);
async function analisarPdf(
  pdf: Uint8Array,
  apiKey: string,
  lista: ListaPresenca,
  vereadores: VereadorPresenca[],
) {
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY não configurada; nenhuma presença presumida",
    );
  }
  const prompt =
    `Analise exclusivamente a lista de presença anexada da Câmara Municipal de Piracanjuba. Extraia a data da sessão escrita no documento e a situação de cada vereador. Não use a data de publicação para inventar a data da sessão. Assinatura identificável comprova presença. Anotação explícita de ausência comprova ausência. Se estiver ilegível ou a evidência for insuficiente, use presente:null, nunca presuma presença. Não trate nomes apenas impressos como assinaturas. Os nomes esperados são: ${
      vereadores.map((v) => v.nomeCompleto).join("; ")
    }. Responda somente JSON: {"sessao_data":"YYYY-MM-DD","presencas":[{"nome":"nome completo","presente":true}]}, com todos os vereadores e sem outros nomes.`;
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${encodeBase64(pdf)}`,
              },
            },
          ],
        }],
        max_tokens: 2000,
      }),
      signal: AbortSignal.timeout(45_000),
    },
  );
  if (!response.ok) throw new Error(`IA de presenças HTTP ${response.status}`);
  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("IA de presenças não retornou conteúdo válido");
  }
  return parseResultadoPresencas(content, lista, vereadores);
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (
    !hasCronOrServiceRoleAuth(req, serviceRoleKey, Deno.env.get("CRON_SECRET"))
  ) {
    return json({ success: false, error: "Não autorizado" }, 401);
  }
  let dryRun: boolean;
  let batchSize: number;
  try {
    ({ dryRun, batchSize } = parsePedidoPresencas(
      req.method === "POST" ? await req.text() : "",
    ));
  } catch (error) {
    return json({ success: false, error: message(error) }, 400);
  }
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceRoleKey!,
  );
  let logId: string | null = null;
  let cursorPrevious: string | null = null;
  let cursorLastAttempted: string | null = null;
  const started = Date.now();
  const errors: { titulo: string; pdf_url: string; error: string }[] = [];
  try {
    if (!dryRun) {
      const { data, error } = await sb.from("sync_log").insert({
        tipo: "presenca-centi",
        status: "running",
        detalhes: { fonte_url: PRESENCAS_CENTI_URL },
      }).select("id").single();
      if (error) throw error;
      logId = data.id;
    }
    let cursorQuery = sb.from("sync_log").select("detalhes")
      .eq("tipo", "presenca-centi")
      .not("detalhes->>cursor_last_attempted", "is", null)
      .order("started_at", { ascending: false }).limit(1);
    if (logId) cursorQuery = cursorQuery.neq("id", logId);
    const { data: previousLogs, error: cursorError } = await cursorQuery;
    if (cursorError) throw cursorError;
    const previousCursor = previousLogs?.[0]?.detalhes?.cursor_last_attempted;
    if (previousCursor !== undefined && previousCursor !== null) {
      if (typeof previousCursor !== "string") {
        throw new Error("Cursor de presenças inválido");
      }
      cursorPrevious = urlPresenca(previousCursor);
      cursorLastAttempted = cursorPrevious;
    }
    const page = await fetch(PRESENCAS_CENTI_URL, {
      headers: { "User-Agent": PRESENCAS_UA },
      signal: AbortSignal.timeout(25_000),
    });
    if (!page.ok) throw new Error(`Página de presenças HTTP ${page.status}`);
    const entries = parseListasPresenca(await page.text());
    const { data: dbVereadores, error: vereadorError } = await sb.from(
      "vereadores",
    ).select("id,nome");
    if (vereadorError) throw vereadorError;
    const vereadores = resolverVereadoresPresenca(dbVereadores || []);
    const existing: PresencaExistente[] = [];
    let total: number | null = null;
    for (let offset = 0;; offset += 1000) {
      const { data, count, error } = await sb.from("presenca_sessoes")
        .select(
          "id,sessao_titulo,sessao_data,vereador_nome,vereador_id,fonte_url,status_verificacao",
          { count: "exact" },
        ).order("id").range(offset, offset + 999);
      if (error) throw error;
      if (count === null || (total !== null && count !== total)) {
        throw new Error("Cadastro de presenças mudou durante leitura");
      }
      total = count;
      existing.push(...(data || []));
      if (existing.length === total) break;
      if (!data?.length || data.length < 1000) {
        throw new Error("Leitura incompleta das presenças existentes");
      }
    }
    const pendentes = entries.filter((lista) =>
      !sessaoJaVerificada(lista, existing, vereadores)
    );
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!dryRun && pendentes.length && !apiKey) {
      throw new Error(
        "GEMINI_API_KEY não configurada; nenhuma presença presumida",
      );
    }
    const selected = selecionarLotePresencas(
      entries,
      pendentes,
      cursorPrevious,
      batchSize,
    );
    let records = 0;
    let sessoesProcessadas = 0;
    let protectedCount = 0;
    const pdfs: {
      titulo: string;
      data: string;
      pdf_url: string;
      bytes: number;
      ja_verificada: boolean;
    }[] = [];
    // O ensaio verifica todos os PDFs desta página, sem IA e sem qualquer gravação.
    for (const lista of dryRun ? entries : selected) {
      if (!dryRun && logId) {
        cursorLastAttempted = lista.pdfUrl;
        // Salvar antes da tentativa também permite avançar após interrupção abrupta.
        const { error } = await sb.from("sync_log").update({
          detalhes: {
            fonte_url: PRESENCAS_CENTI_URL,
            cursor_last_attempted: cursorLastAttempted,
            last_attempt_started_at: new Date().toISOString(),
            pending: pendentes.length,
          },
        }).eq("id", logId);
        if (error) throw error;
      }
      try {
        const pdf = await baixarPdfPresenca(lista.pdfUrl);
        pdfs.push({
          titulo: lista.titulo,
          data: lista.data,
          pdf_url: lista.pdfUrl,
          bytes: pdf.length,
          ja_verificada: sessaoJaVerificada(lista, existing, vereadores),
        });
        if (!sessaoJaVerificada(lista, existing, vereadores)) {
          // Recusar duplicatas ambíguas antes de gastar com IA ou escrever outra linha.
          protegerPresencasConfirmadas(
            lista,
            vereadores.map((v) => ({
              vereador_id: v.id,
              vereador_nome: v.nome,
            })),
            existing,
            vereadores,
          );
        }
        if (dryRun) continue;
        const extraction = await analisarPdf(pdf, apiKey!, lista, vereadores);
        const writable = protegerPresencasConfirmadas(
          lista,
          extraction,
          existing,
          vereadores,
        );
        protectedCount += extraction.length - writable.length;
        if (writable.length) {
          const { error } = await sb.from("presenca_sessoes").upsert(
            writable.map((row) => ({
              ...row,
              sessao_titulo: row.sessao_titulo ?? lista.titulo,
              sessao_data: lista.data,
              tipo_sessao: lista.tipo,
              ano: Number(lista.data.slice(0, 4)),
              fonte_url: lista.pdfUrl,
              fonte_tipo: "centi-ia",
              status_verificacao: "ia",
            })),
            { onConflict: "sessao_titulo,vereador_nome" },
          );
          if (error) throw error;
          records += writable.length;
        }
        sessoesProcessadas++;
      } catch (error) {
        errors.push({
          titulo: lista.titulo,
          pdf_url: lista.pdfUrl,
          error: message(error),
        });
      }
    }
    const result = {
      success: errors.length === 0,
      dry_run: dryRun,
      source_scope: "primeira_pagina_listas_ordinarias",
      source_total: null,
      fonte_url: PRESENCAS_CENTI_URL,
      entries: entries.length,
      pending: pendentes.length,
      batch_size: batchSize,
      cursor_previous: cursorPrevious,
      cursor_last_attempted: cursorLastAttempted,
      selected_pdf_urls: selected.map((lista) => lista.pdfUrl),
      deferred: dryRun ? 0 : pendentes.length - selected.length,
      sessoes_processadas: sessoesProcessadas,
      remaining: pendentes.length - sessoesProcessadas,
      complete: !dryRun && pendentes.length === sessoesProcessadas,
      already_verified: entries.length - pendentes.length,
      records,
      confirmed_preserved: protectedCount,
      pdfs,
      errors,
      duration_ms: Date.now() - started,
    };
    if (logId) {
      const { error } = await sb.from("sync_log").update({
        status: errors.length ? "partial" : "success",
        detalhes: result,
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
      if (error) throw error;
    }
    return json(result, errors.length ? 502 : 200);
  } catch (error) {
    const detail = message(error);
    if (logId) {
      const { error: logError } = await sb.from("sync_log").update({
        status: "error",
        detalhes: {
          error: detail,
          errors,
          cursor_last_attempted: cursorLastAttempted,
        },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
      if (logError) {
        console.error("Falha ao concluir log de presenças:", message(logError));
      }
    }
    return json(
      { success: false, dry_run: dryRun, error: detail, errors },
      500,
    );
  }
});
