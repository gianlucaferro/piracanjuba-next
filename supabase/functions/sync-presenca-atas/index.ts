/// <reference lib="deno.ns" />

import {
  AdminBodyTooLargeError,
  hasAdminSessionAuth,
  isAdminSessionToken,
  readAdminActionBody,
} from "../_shared/admin-session-auth.ts";
import { hasCronOrServiceRoleAuth } from "../_shared/service-role-auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Lista fixa de vereadores da legislatura 2025-2028
const VEREADORES_LEGISLATURA = [
  "Fernando Abraão Magalhães Silva",
  "Douglas Miranda Silva",
  "Reginaldo Moreira da Silva",
  "Aparecida Divani Rocha Cordeiro",
  "Adriana Dias Pinheiro",
  "Edimar Lopes Machado",
  "Marco Antonio Antunes da Cruz",
  "Sirley de Fátima Menezes Wehbe",
  "Welton Eterno da Silva",
  "Wennder Trindade e Silva",
  "Yuri Santiago Alves",
];

function normalizeNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Use AI to extract attendance from ata text
 */
async function extractAttendanceWithAI(
  ataText: string,
  apiKey: string | undefined,
  fetcher: typeof fetch,
): Promise<string[]> {
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const systemPrompt =
    `Você é um assistente que extrai a lista de vereadores presentes de atas de sessões legislativas.

Lista oficial de vereadores da legislatura 2025-2028:
${VEREADORES_LEGISLATURA.map((n, i) => `${i + 1}. ${n}`).join("\n")}

Regras:
- Procure trechos como "vereadores presentes", "compareceram à sessão", "presentes na sessão", "verificada a presença"
- Retorne APENAS os nomes dos vereadores PRESENTES, um por linha
- Use exatamente os nomes da lista oficial acima
- Se não encontrar informação de presença, retorne "NENHUM_ENCONTRADO"
- NÃO invente dados. Se o texto não mencionar presença, retorne "NENHUM_ENCONTRADO"`;

  const response = await fetcher(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Extraia os vereadores presentes desta ata:\n\n${
              ataText.slice(0, 8000)
            }`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_attendance",
              description:
                "Report the list of vereadores present at the session",
              parameters: {
                type: "object",
                properties: {
                  presentes: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of vereador full names who were present",
                  },
                  trecho_fonte: {
                    type: "string",
                    description: "The text excerpt that mentions attendance",
                  },
                },
                required: ["presentes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "report_attendance" },
        },
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI error:", response.status, errText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error("IA não retornou extração estruturada de presença");
  }

  let presentes: string[];
  try {
    const args = JSON.parse(toolCall.function.arguments);
    if (!Array.isArray(args.presentes)) throw new Error("Lista ausente");
    presentes = args.presentes.filter((nome: unknown) =>
      typeof nome === "string" && VEREADORES_LEGISLATURA.some(
        (v) => normalizeNome(v) === normalizeNome(nome),
      )
    );
  } catch {
    throw new Error("IA retornou extração de presença inválida");
  }
  if (!presentes.length) {
    throw new Error(
      "IA não identificou presença válida; nenhuma gravação realizada",
    );
  }
  return presentes;
}

type PresencaAtasDependencies = {
  createClient: typeof createClient;
  env: (name: string) => string | undefined;
  fetch: typeof fetch;
};

export function createPresencaAtasHandler(
  overrides: Partial<PresencaAtasDependencies> = {},
) {
  const deps: PresencaAtasDependencies = {
    createClient,
    env: (name) => Deno.env.get(name),
    fetch,
    ...overrides,
  };
  return async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    const response = (body: unknown, status: number) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    const serviceRoleKey = deps.env("SUPABASE_SERVICE_ROLE_KEY");
    const privileged = hasCronOrServiceRoleAuth(
      req,
      serviceRoleKey,
      deps.env("CRON_SECRET"),
    );
    // O painel usa admin_token no corpo; o header anon nunca confere papel admin.
    let body: Record<string, any>;
    try {
      body = await readAdminActionBody(req);
    } catch (error) {
      return response(
        {
          error: privileged
            ? "Corpo inválido ou acima do limite"
            : "Não autorizado",
        },
        privileged ? error instanceof AdminBodyTooLargeError ? 413 : 400 : 401,
      );
    }
    if (!privileged && !isAdminSessionToken(body.admin_token)) {
      return response({ error: "Não autorizado" }, 401);
    }
    if (req.method !== "POST") return response({ error: "Use POST" }, 405);
    if (!serviceRoleKey) {
      return response({ error: "Serviço não configurado" }, 503);
    }

    try {
      const sb = deps.createClient(deps.env("SUPABASE_URL")!, serviceRoleKey);
      if (
        !privileged &&
        !(await hasAdminSessionAuth(body.admin_token, async (tokenHash) => {
          const { data, error } = await sb.from("admin_sessions")
            .select("expires_at").eq("id", "singleton").eq(
              "token_hash",
              tokenHash,
            ).maybeSingle();
          return error ? null : data;
        }))
      ) {
        return response({ error: "Não autorizado" }, 401);
      }
      const {
        action = "process_ata",
        sessao_titulo,
        sessao_data,
        ano,
        tipo_sessao = "ordinária",
        ata_texto,
        presentes_manual,
        fonte_url,
        ata_url,
        fonte_tipo = "ata",
      } = body;

      // Get vereador IDs from DB
      const { data: vereadoresDb } = await sb.from("vereadores").select(
        "id, nome",
      );
      const vereadorIdMap = new Map<string, string>();
      for (const v of vereadoresDb || []) {
        vereadorIdMap.set(normalizeNome(v.nome), v.id);
      }

      if (action === "process_ata") {
        // Extract attendance from ata text using AI
        if (!ata_texto && !presentes_manual) {
          return new Response(
            JSON.stringify({
              error: "ata_texto ou presentes_manual é obrigatório",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        if (!sessao_titulo) {
          return new Response(
            JSON.stringify({ error: "sessao_titulo é obrigatório" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        let presentes: string[];

        if (presentes_manual && Array.isArray(presentes_manual)) {
          // Direct input of verified attendance
          presentes = presentes_manual.filter((n: string) =>
            VEREADORES_LEGISLATURA.some((v) =>
              normalizeNome(v) === normalizeNome(n)
            )
          );
        } else {
          // AI extraction from ata text
          presentes = await extractAttendanceWithAI(
            ata_texto,
            deps.env("GEMINI_API_KEY"),
            deps.fetch,
          );
        }

        const ausentes = VEREADORES_LEGISLATURA.filter(
          (v) => !presentes.some((p) => normalizeNome(p) === normalizeNome(v)),
        );

        const sessionAno = ano ||
          (sessao_data
            ? parseInt(sessao_data.split("-")[0])
            : new Date().getFullYear());

        // Upsert presence records for ALL vereadores
        let insertedCount = 0;
        const errors: string[] = [];

        for (const nome of VEREADORES_LEGISLATURA) {
          const isPresente = presentes.some((p) =>
            normalizeNome(p) === normalizeNome(nome)
          );
          const vereadorId = vereadorIdMap.get(normalizeNome(nome)) || null;

          const { error } = await sb.from("presenca_sessoes").upsert({
            sessao_titulo,
            sessao_data: sessao_data || null,
            ano: sessionAno,
            tipo_sessao,
            vereador_nome: nome,
            vereador_id: vereadorId,
            presente: isPresente,
            fonte_url: fonte_url || null,
            ata_url: ata_url || null,
            fonte_tipo,
            status_verificacao: Array.isArray(presentes_manual)
              ? "confirmado"
              : "ia",
          }, {
            onConflict: "sessao_titulo,vereador_nome",
            ignoreDuplicates: false,
          });

          if (error) errors.push(`${nome}: ${error.message}`);
          else insertedCount++;
        }

        return new Response(
          JSON.stringify({
            success: true,
            sessao: sessao_titulo,
            presentes: presentes.length,
            ausentes: ausentes.length,
            presentes_nomes: presentes,
            ausentes_nomes: ausentes,
            records_inserted: insertedCount,
            errors: errors.slice(0, 5),
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (action === "batch_process") {
        // Process multiple sessions at once
        const { sessoes } = body;
        if (!Array.isArray(sessoes)) {
          return new Response(
            JSON.stringify({ error: "sessoes array é obrigatório" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const results: any[] = [];
        for (const sessao of sessoes) {
          const presentes = sessao.presentes || [];
          const ausentes = VEREADORES_LEGISLATURA.filter(
            (v) =>
              !presentes.some((p: string) =>
                normalizeNome(p) === normalizeNome(v)
              ),
          );
          const sessionAno = sessao.ano ||
            (sessao.sessao_data
              ? parseInt(sessao.sessao_data.split("-")[0])
              : new Date().getFullYear());

          let count = 0;
          for (const nome of VEREADORES_LEGISLATURA) {
            const isPresente = presentes.some((p: string) =>
              normalizeNome(p) === normalizeNome(nome)
            );
            const vereadorId = vereadorIdMap.get(normalizeNome(nome)) || null;

            const { error } = await sb.from("presenca_sessoes").upsert({
              sessao_titulo: sessao.sessao_titulo,
              sessao_data: sessao.sessao_data || null,
              ano: sessionAno,
              tipo_sessao: sessao.tipo_sessao || "ordinária",
              vereador_nome: nome,
              vereador_id: vereadorId,
              presente: isPresente,
              fonte_url: sessao.fonte_url || null,
              ata_url: sessao.ata_url || null,
              fonte_tipo: sessao.fonte_tipo || "ata",
              status_verificacao: "confirmado",
            }, {
              onConflict: "sessao_titulo,vereador_nome",
              ignoreDuplicates: false,
            });

            if (!error) count++;
          }

          results.push({
            sessao: sessao.sessao_titulo,
            presentes: presentes.length,
            ausentes: ausentes.length,
            records: count,
          });
        }

        return new Response(JSON.stringify({ success: true, results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "action inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Erro:", error);
      return new Response(JSON.stringify({ error: (error as Error).message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  };
}

Deno.serve(createPresencaAtasHandler());
