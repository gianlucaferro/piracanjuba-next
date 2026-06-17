import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Chave estavel de negocio do contrato (numero + vigencia_inicio + empresa), no
// lugar do UUID volatil: mantem a analise vinculada mesmo quando o sync regenera
// o id do contrato (correcao de valor/empresa na fonte gerava analises orfas).
function chaveContrato(numero: unknown, vigencia: unknown, empresa: unknown): string {
  return `${numero ?? ""}|${vigencia ?? ""}|${empresa ?? ""}`;
}

// Busca todas as linhas contornando o limite default de 1000 do PostgREST,
// paginando por .range() ate esgotar. Sem isso a analise so via os 1000
// contratos de maior valor e a cobertura travava.
async function fetchAllRows(supabase: any, table: string, columns: string, orderCol: string): Promise<any[]> {
  const pageSize = 1000;
  const all: any[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderCol, { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
  }
  return all;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("GEMINI_API_KEY");
    if (!lovableKey) throw new Error("GEMINI_API_KEY not configured");

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const orgao = body?.orgao || "prefeitura"; // "prefeitura" or "camara"
    const forceRefresh = body?.force === true;
    const batchSize = body?.batch_size || 20;
    // "desde" (ex "2021-01-01"): recorta a analise a contratos com vigencia_inicio >= desde.
    const desde = typeof body?.desde === "string" ? body.desde : null;

    // 1. Fetch contracts that haven't been analyzed yet (or all if force)
    const tableName = orgao === "camara" ? "camara_contratos" : "contratos";

    const allContratos = await fetchAllRows(supabase, tableName, "*", "valor");
    if (!allContratos.length) {
      return new Response(
        JSON.stringify({ success: true, analyzed: 0, flagged: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get already analyzed contracts (skip if not force)
    let alreadyAnalyzed = new Set<string>();
    if (!forceRefresh) {
      const { data: existing } = await supabase
        .from("contratos_risco")
        .select("contrato_numero, contrato_vigencia_inicio, contrato_empresa")
        .eq("orgao", orgao);
      if (existing) {
        alreadyAnalyzed = new Set(
          existing.map((r: any) =>
            chaveContrato(r.contrato_numero, r.contrato_vigencia_inicio, r.contrato_empresa)
          )
        );
      }
    }

    const toAnalyze = allContratos
      .filter((c: any) => !desde || (c.vigencia_inicio && c.vigencia_inicio >= desde))
      .filter((c: any) => !alreadyAnalyzed.has(chaveContrato(c.numero, c.vigencia_inicio, c.empresa)))
      .slice(0, batchSize);

    if (toAnalyze.length === 0) {
      return new Response(
        JSON.stringify({ success: true, analyzed: 0, flagged: 0, message: "Todos os contratos já foram analisados." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch aditivos for context
    const contratoNumeros = toAnalyze.map((c: any) => c.numero).filter(Boolean);
    let aditivos: any[] = [];
    if (contratoNumeros.length > 0) {
      const { data: adData } = await supabase
        .from("contratos_aditivos")
        .select("contrato_numero, termo, tipo_aditivo, valor, data_termo")
        .in("contrato_numero", contratoNumeros);
      aditivos = adData || [];
    }

    // 4. Build statistics context
    const allValues = allContratos
      .map((c: any) => c.valor)
      .filter((v: any): v is number => v !== null && v > 0)
      .sort((a: number, b: number) => a - b);
    const mid = Math.floor(allValues.length / 2);
    const median = allValues.length % 2 === 0
      ? (allValues[mid - 1] + allValues[mid]) / 2
      : allValues[mid];
    const avg = allValues.reduce((s: number, v: number) => s + v, 0) / allValues.length;

    // 5. Count contracts per supplier for concentration analysis
    const supplierField = orgao === "camara" ? "credor" : "empresa";
    const supplierCount: Record<string, number> = {};
    const supplierTotal: Record<string, number> = {};
    for (const c of allContratos) {
      const name = (c as any)[supplierField]?.trim()?.toUpperCase();
      if (!name) continue;
      supplierCount[name] = (supplierCount[name] || 0) + 1;
      supplierTotal[name] = (supplierTotal[name] || 0) + ((c as any).valor || 0);
    }

    // 6. Analyze each contract with AI
    let analyzed = 0;
    let flagged = 0;
    const errors: string[] = [];

    for (const contrato of toAnalyze) {
      try {
        const supplier = (contrato as any)[supplierField]?.trim()?.toUpperCase() || "NÃO INFORMADO";
        const supplierContracts = supplierCount[supplier] || 1;
        const supplierTotalValue = supplierTotal[supplier] || 0;

        const contratoAditivos = aditivos.filter(
          (a: any) => a.contrato_numero === (contrato as any).numero
        );
        const totalAditivos = contratoAditivos.reduce((s: number, a: any) => s + (a.valor || 0), 0);

        const valorContrato = (contrato as any).valor || 0;
        const ratioToMedian = median > 0 ? (valorContrato / median).toFixed(1) : "N/A";

        const objetoInfo = (contrato as any).objeto;
        const hasObjeto = objetoInfo && objetoInfo.trim() !== "";

        const prompt = `Você é um auditor conservador de contratos públicos municipais brasileiros. Analise este contrato e determine se há ALTO RISCO REAL de irregularidade grave.

REGRAS FUNDAMENTAIS:
- A maioria dos contratos públicos é legítima. Espera-se que MENOS DE 5% dos contratos sejam alto risco.
- Campo "objeto" vazio é um problema de dados do portal de transparência, NÃO é indício de corrupção por si só.
- Valores altos sozinhos NÃO são indicador de risco. Prefeituras contratam serviços caros (coleta de lixo, obras, combustível, saúde).
- Contratos de combustível, medicamentos, coleta de lixo, obras viárias, pavimentação e serviços de saúde tipicamente têm valores altos e são legítimos.
- Múltiplos contratos com o mesmo fornecedor são normais em compras recorrentes (combustível, alimentos, materiais).
- Aditivos até 25% do valor original são comuns e legais.

CLASSIFIQUE COMO ALTO RISCO SOMENTE SE PELO MENOS 3 DESTES CRITÉRIOS GRAVES SE APLICAREM SIMULTANEAMENTE:
1. Aditivos que somam mais de 100% do valor original (dobro ou mais)
2. Objeto CLARAMENTE incompatível com a razão social da empresa (ex: empresa de informática vendendo combustível)
3. Valor absurdamente desproporcional ao objeto descrito (ex: R$ 5 milhões para "consultoria" genérica)
4. Empresa com nome que sugere empresa de fachada (CNPJ de pessoa física fornecendo serviços de grande porte)
5. Contrato sem licitação para valores que obrigatoriamente a exigiriam (acima de R$ 176 mil para obras)

DADOS DO CONTRATO:
- Número: ${(contrato as any).numero || "N/I"}
- Empresa/Credor: ${supplier}
- Objeto: ${hasObjeto ? objetoInfo : "NÃO DISPONÍVEL NO PORTAL (problema de dados, não de corrupção)"}
- Valor: R$ ${valorContrato.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Status: ${(contrato as any).status || "N/I"}
- Vigência: ${(contrato as any).vigencia_inicio || "N/I"} a ${(contrato as any).vigencia_fim || "N/I"}

CONTEXTO:
- Mediana: R$ ${median.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | Média: R$ ${avg.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Razão valor/mediana: ${ratioToMedian}x | Total contratos: ${allContratos.length}
- Contratos deste fornecedor: ${supplierContracts} | Total fornecedor: R$ ${supplierTotalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
${contratoAditivos.length > 0 ? `- Aditivos: ${contratoAditivos.length} termos, total R$ ${totalAditivos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${valorContrato > 0 ? ((totalAditivos / valorContrato) * 100).toFixed(0) : "N/A"}% do original)` : "- Aditivos: Nenhum"}

NA DÚVIDA, CLASSIFIQUE COMO BAIXO RISCO. Falsos positivos são piores que falsos negativos neste contexto.`;

        const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            messages: [
              { role: "system", content: "Você é um analista de contratos públicos. Responda sempre usando a função fornecida." },
              { role: "user", content: prompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "classificar_risco",
                  description: "Classifica o risco de irregularidade de um contrato público.",
                  parameters: {
                    type: "object",
                    properties: {
                      risco_alto: {
                        type: "boolean",
                        description: "true se há alto risco de irregularidade baseado em múltiplos indicadores, false caso contrário",
                      },
                      score: {
                        type: "number",
                        description: "Score de risco de 0 a 100. 0-30 baixo, 31-60 médio, 61-100 alto. Use alto somente com evidências fortes.",
                      },
                      fatores: {
                        type: "array",
                        items: { type: "string" },
                        description: "Lista de fatores de risco identificados. Vazio se risco baixo.",
                      },
                    },
                    required: ["risco_alto", "score", "fatores"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "classificar_risco" } },
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          if (aiResponse.status === 429) {
            console.warn("Rate limited, stopping batch.");
            errors.push("Rate limited pela API de IA. Tente novamente em alguns minutos.");
            break;
          }
          if (aiResponse.status === 402) {
            errors.push("Créditos de IA insuficientes.");
            break;
          }
          errors.push(`AI error ${aiResponse.status}: ${errText.slice(0, 200)}`);
          continue;
        }

        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

        if (!toolCall?.function?.arguments) {
          errors.push(`No tool call for contrato ${(contrato as any).numero}`);
          continue;
        }

        const result = JSON.parse(toolCall.function.arguments);
        const riscoAlto = result.risco_alto === true && result.score >= 90;

        // Upsert result
        const { error: uErr } = await supabase
          .from("contratos_risco")
          .upsert({
            contrato_id: contrato.id,
            contrato_numero: contrato.numero ?? null,
            contrato_vigencia_inicio: contrato.vigencia_inicio ?? null,
            contrato_empresa: contrato.empresa ?? null,
            orgao,
            risco_alto: riscoAlto,
            score: result.score || 0,
            fatores: result.fatores || [],
            modelo_versao: "gemini-3-flash-v1",
            analisado_em: new Date().toISOString(),
          }, { onConflict: "orgao,contrato_numero,contrato_vigencia_inicio,contrato_empresa" });

        if (uErr) {
          errors.push(`Upsert error: ${uErr.message}`);
        } else {
          analyzed++;
          if (riscoAlto) flagged++;
        }

        // Delay entre chamadas pra respeitar o rate limit do Gemini free (~13 req/min).
        // 500ms era agressivo demais e estourava 429 em poucos contratos.
        await new Promise(r => setTimeout(r, 4500));
      } catch (e) {
        errors.push(`Contrato ${(contrato as any).numero}: ${(e as Error).message}`);
      }
    }

    console.log(`Risk analysis complete: ${analyzed} analyzed, ${flagged} flagged, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        analyzed,
        flagged,
        remaining: allContratos.length - alreadyAnalyzed.size - analyzed,
        errors: errors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-contrato-risco error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
