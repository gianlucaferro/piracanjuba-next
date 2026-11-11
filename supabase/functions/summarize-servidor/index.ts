// deno-lint-ignore no-import-prefix
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hasCronOrServiceRoleAuth } from "../_shared/service-role-auth.ts";
import {
  AdminBodyTooLargeError,
  readAdminActionBody,
} from "../_shared/admin-session-auth.ts";
import {
  type LancamentoIndividual,
  montarRespostaResumoServidor,
  type ServidorIndividual,
} from "../_shared/servidor-resumo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const headers = {
  ...corsHeaders,
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const PAGE_SIZE = 250;
const MAX_RECORDS = 5_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") {
    return new Response(null, {
      status: 405,
      headers: { ...headers, Allow: "POST, OPTIONS" },
    });
  }
  let body: Record<string, unknown>;
  try {
    body = await readAdminActionBody(req, 8_192);
  } catch (error) {
    return json(
      { error: "Corpo da requisição inválido ou muito grande." },
      error instanceof AdminBodyTooLargeError ? 413 : 400,
    );
  }
  const internal = hasCronOrServiceRoleAuth(
    req,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    Deno.env.get("CRON_SECRET"),
  );
  if (!internal && (body.model !== undefined || body.provider !== undefined)) {
    return json({ error: "Parâmetros administrativos não permitidos." }, 403);
  }
  const requestedId = body.servidor_id;
  if (
    typeof requestedId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      requestedId,
    )
  ) {
    return json({
      error: "servidor_id é obrigatório e deve ser um UUID válido.",
    }, 400);
  }
  const servidorId = requestedId.toLowerCase();
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: servidor, error: servidorError } = await sb.from("servidores")
      .select("id,nome,cargo,orgao_tipo,fonte_url")
      .eq("id", servidorId)
      .maybeSingle();
    if (servidorError) throw new Error("Falha na leitura do cadastro");
    if (!servidor) return json({ error: "Servidor não encontrado." }, 404);
    if (servidor.id !== servidorId || typeof servidor.nome !== "string") {
      throw new Error("Cadastro retornado fora do escopo");
    }
    const remuneracoes: LancamentoIndividual[] = [];
    const ids = new Set<string>();
    let expectedCount: number | null = null;
    for (let offset = 0; offset < MAX_RECORDS; offset += PAGE_SIZE) {
      const { data, error, count } = await sb.from("remuneracao_servidores")
        .select(
          "id,servidor_id,competencia,tipo_folha,bruto,liquido,fonte_url",
          { count: "exact" },
        )
        .eq("servidor_id", servidorId)
        .order("competencia", { ascending: false })
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw new Error("Falha na leitura das remuneracoes");
      if (
        !Array.isArray(data) || !Number.isSafeInteger(count) ||
        count === null || count < 0 || count > MAX_RECORDS
      ) {
        throw new Error("Consulta de remuneracoes incompleta");
      }
      if (expectedCount !== null && expectedCount !== count) {
        throw new Error("Quantidade de remuneracoes alterada durante consulta");
      }
      expectedCount = count;
      for (const row of data) {
        if (
          row.servidor_id !== servidorId || typeof row.id !== "string" ||
          ids.has(row.id)
        ) {
          throw new Error("Remuneracao duplicada ou fora do escopo");
        }
        ids.add(row.id);
        remuneracoes.push({
          id: row.id,
          competencia: row.competencia,
          tipo_folha: row.tipo_folha,
          bruto: row.bruto,
          liquido: row.liquido,
          fonte_url: row.fonte_url,
        });
      }
      if (remuneracoes.length > expectedCount) {
        throw new Error("Total de remuneracoes inconsistente");
      }
      if (remuneracoes.length === expectedCount) break;
      if (data.length < PAGE_SIZE) {
        throw new Error("Pagina de remuneracoes incompleta");
      }
    }
    if (remuneracoes.length !== expectedCount) {
      throw new Error("Historico de remuneracoes incompleto");
    }
    const resposta = montarRespostaResumoServidor(
      servidor as ServidorIndividual,
      remuneracoes,
    );
    return json(resposta);
  } catch {
    // Nao transformar indisponibilidade em ausencia de folha nem expor detalhes do banco.
    console.error("Falha ao consultar resumo individual do servidor");
    return json({
      error:
        "Não foi possível consultar os dados do servidor. Tente novamente.",
    }, 503);
  }
});
