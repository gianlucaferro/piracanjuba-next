import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Ingestao das receitas de campanha (doadores) do TSE, ja casadas a pessoa_publica
// (matching por nome feito offline, pois a CPF do candidato vem mascarada nas receitas
// publicas). Recebe as linhas via JSON e grava em tse_doador_campanha. Idempotente:
// apaga as linhas existentes do mesmo ano + pessoas antes de inserir.
// Guard: exige Authorization Bearer == SUPABASE_ANON_KEY (insere apenas dado publico do TSE).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = { ...corsHeaders, "Content-Type": "application/json" };

  // Fail-closed: so roda se o segredo estiver configurado E baterem o header.
  const secret = Deno.env.get("INGEST_TSE_SECRET");
  if (!secret || req.headers.get("x-ingest-secret") !== secret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: json });
  }

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    const pessoaIds = Array.isArray(body?.pessoa_publica_ids) ? body.pessoa_publica_ids : [];
    const ano = Number(body?.ano_eleicao) || 2024;
    if (!rows.length) {
      return new Response(JSON.stringify({ error: "rows vazio" }), { status: 400, headers: json });
    }

    // Idempotente: limpa as linhas antigas das pessoas envolvidas (mesmo ano).
    if (pessoaIds.length) {
      await sb.from("tse_doador_campanha").delete().eq("ano_eleicao", ano).in("pessoa_publica_id", pessoaIds);
    }

    let inserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb.from("tse_doador_campanha").insert(rows.slice(i, i + 200));
      if (error) {
        return new Response(JSON.stringify({ error: error.message, inserted }), { status: 500, headers: json });
      }
      inserted += Math.min(200, rows.length - i);
    }
    return new Response(JSON.stringify({ success: true, inserted }), { headers: json });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), { status: 500, headers: json });
  }
});
