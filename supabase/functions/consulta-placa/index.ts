import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiGuard, guardBlockedResponse } from "../_shared/ratelimit.ts";
import { dadosVeiculoDaPlaca, melhorFipeDaPlaca } from "../_shared/placa-veiculo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { placa } = await req.json();

    if (!placa || typeof placa !== "string") {
      return new Response(
        JSON.stringify({ error: "Placa é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const placaNorm = placa.toUpperCase().replace(/[^A-Z0-9]/g, "");

    const placaRegex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
    if (!placaRegex.test(placaNorm)) {
      return new Response(
        JSON.stringify({ error: "Formato de placa inválido. Use ABC1234 ou ABC1D23." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit por IP (repo público: função exposta que chama API paga de placas)
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const guard = await aiGuard(sb, req, "consulta-placa");
    if (!guard.allowed) return guardBlockedResponse(guard);

    // API Placas (apiplacas.com.br), paga, no sistema antigo: wdapi2.com.br/consulta/<placa>/<token>.
    const apiKey = Deno.env.get("PLACA_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ not_configured: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let resposta: unknown = null;
    let semResultado = false;
    try {
      const res = await fetch(`https://wdapi2.com.br/consulta/${placaNorm}/${apiKey}`, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        resposta = await res.json();
        semResultado = true;
      } else {
        // 401 = placa inválida, 406 = sem resultados, 402 e 429 = token ou limite do plano.
        // O corpo não vai para o log.
        semResultado = res.status === 401 || res.status === 406;
        console.warn(`wdapi2 returned ${res.status}`);
        await res.body?.cancel();
      }
    } catch (e) {
      console.warn("wdapi2 failed:", (e as Error).name);
    }

    const veiculo = resposta ? dadosVeiculoDaPlaca(resposta) : {};
    if (!veiculo.marca && !veiculo.modelo) {
      return semResultado
        ? new Response(
          JSON.stringify({ error: "Veículo não encontrado. Preencha manualmente." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
        : new Response(
          JSON.stringify({ error: "Consulta por placa indisponível no momento." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "600" } }
        );
    }
    const fipe = melhorFipeDaPlaca(resposta);

    return new Response(
      JSON.stringify(fipe ? { veiculo, fipe } : { veiculo }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("consulta-placa error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
