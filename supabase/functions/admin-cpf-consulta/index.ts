// Edge function: consulta CPF via CPFHub (https://cpfhub.io) — admin only.
//
// Fluxo:
//   1) Valida token admin contra admin_sessions (mesmo padrao do admin-anuncios-update)
//   2) Sanitiza CPF (so digitos, 11 caracteres)
//   3) Chama CPFHub https://api.cpfhub.io/cpf/{cpf} com header x-api-key
//   4) Loga consulta em admin_cpf_consulta_log (auditoria LGPD)
//   5) Retorna dados ao frontend
//
// Secret necessario: CPFHUB_API_KEY (configurar via supabase secrets set).
//
// Auditoria LGPD (art. 37): toda consulta deixa rastro em admin_cpf_consulta_log
// com timestamp, CPF mascarado, justificativa obrigatoria, IP origem e User-Agent.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CPFHUB_BASE = "https://api.cpfhub.io/cpf";

type CpfHubResponse = {
  success: boolean;
  data?: {
    cpf: string;
    name: string;
    nameUpper?: string;
    gender?: "M" | "F" | string;
    birthDate?: string; // DD/MM/YYYY
    day?: number;
    month?: number;
    year?: number;
  };
  message?: string;
  error?: string;
};

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function validateAdminToken(
  supabase: ReturnType<typeof createClient>,
  token: string,
): Promise<boolean> {
  if (!token) return false;
  const tokenHash = await hashToken(token);
  const { data } = await supabase
    .from("admin_sessions")
    .select("expires_at")
    .eq("id", "singleton")
    .eq("token_hash", tokenHash)
    .single();
  if (!data) return false;
  return new Date(data.expires_at) > new Date();
}

/** Mascara CPF como "***.456.789-**" (mostra so os 6 digitos do meio). */
function mascararCpf(cpf: string): string {
  if (cpf.length !== 11) return "***.***.***-**";
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let supabase: ReturnType<typeof createClient> | null = null;
  let cpfDigitos = "";
  let cpfMascarado = "";
  let justificativa = "";

  try {
    const body = await req.json();
    const { admin_token, action, cpf, justificativa: just } = body;

    supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (!admin_token || !(await validateAdminToken(supabase, admin_token))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: list_log — retorna ultimas 50 consultas (sem CPF completo)
    if (action === "list_log") {
      const { data, error } = await supabase
        .from("admin_cpf_consulta_log")
        .select("id, consultado_em, cpf_mascarado, nome_retornado, status, justificativa, duracao_ms")
        .order("consultado_em", { ascending: false })
        .limit(50);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, log: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action default: consulta (consulta_cpf)
    if (action && action !== "consulta_cpf") {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    cpfDigitos = String(cpf ?? "").replace(/\D/g, "");
    justificativa = String(just ?? "").trim();

    if (cpfDigitos.length !== 11) {
      return new Response(JSON.stringify({ error: "CPF deve ter 11 digitos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (justificativa.length < 5) {
      return new Response(
        JSON.stringify({ error: "Justificativa obrigatoria (min. 5 caracteres) — exigencia LGPD." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    cpfMascarado = mascararCpf(cpfDigitos);

    const apiKey = Deno.env.get("CPFHUB_API_KEY");
    if (!apiKey) {
      const errMsg = "CPFHUB_API_KEY nao configurada no Supabase Secrets.";
      await supabase.from("admin_cpf_consulta_log").insert({
        cpf_mascarado: cpfMascarado,
        cpf_completo: cpfDigitos,
        status: "erro",
        erro_mensagem: errMsg,
        justificativa,
        ip_origem: req.headers.get("x-forwarded-for") ?? null,
        user_agent: req.headers.get("user-agent") ?? null,
      });
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const t0 = Date.now();
    const resp = await fetch(`${CPFHUB_BASE}/${cpfDigitos}`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });
    const duracaoMs = Date.now() - t0;

    if (resp.status === 401 || resp.status === 403) {
      const errMsg = "API key CPFHub invalida ou sem creditos.";
      await supabase.from("admin_cpf_consulta_log").insert({
        cpf_mascarado: cpfMascarado,
        cpf_completo: cpfDigitos,
        status: "erro",
        erro_mensagem: errMsg,
        duracao_ms: duracaoMs,
        justificativa,
        ip_origem: req.headers.get("x-forwarded-for") ?? null,
        user_agent: req.headers.get("user-agent") ?? null,
      });
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (resp.status === 429) {
      const errMsg = "Limite de consultas CPFHub atingido (50/mes no plano gratis).";
      await supabase.from("admin_cpf_consulta_log").insert({
        cpf_mascarado: cpfMascarado,
        cpf_completo: cpfDigitos,
        status: "limite_atingido",
        erro_mensagem: errMsg,
        duracao_ms: duracaoMs,
        justificativa,
        ip_origem: req.headers.get("x-forwarded-for") ?? null,
        user_agent: req.headers.get("user-agent") ?? null,
      });
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (resp.status === 404) {
      await supabase.from("admin_cpf_consulta_log").insert({
        cpf_mascarado: cpfMascarado,
        cpf_completo: cpfDigitos,
        status: "nao_encontrado",
        duracao_ms: duracaoMs,
        justificativa,
        ip_origem: req.headers.get("x-forwarded-for") ?? null,
        user_agent: req.headers.get("user-agent") ?? null,
      });
      return new Response(
        JSON.stringify({ success: false, message: "CPF nao encontrado na base CPFHub." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!resp.ok) {
      const errMsg = `CPFHub HTTP ${resp.status}`;
      await supabase.from("admin_cpf_consulta_log").insert({
        cpf_mascarado: cpfMascarado,
        cpf_completo: cpfDigitos,
        status: "erro",
        erro_mensagem: errMsg,
        duracao_ms: duracaoMs,
        justificativa,
        ip_origem: req.headers.get("x-forwarded-for") ?? null,
        user_agent: req.headers.get("user-agent") ?? null,
      });
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = (await resp.json()) as CpfHubResponse;

    if (!json.success || !json.data) {
      const errMsg = json.message ?? json.error ?? "CPF nao encontrado.";
      await supabase.from("admin_cpf_consulta_log").insert({
        cpf_mascarado: cpfMascarado,
        cpf_completo: cpfDigitos,
        status: "nao_encontrado",
        erro_mensagem: errMsg,
        duracao_ms: duracaoMs,
        justificativa,
        ip_origem: req.headers.get("x-forwarded-for") ?? null,
        user_agent: req.headers.get("user-agent") ?? null,
      });
      return new Response(
        JSON.stringify({ success: false, message: errMsg }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Sucesso: log + retorno
    await supabase.from("admin_cpf_consulta_log").insert({
      cpf_mascarado: cpfMascarado,
      cpf_completo: cpfDigitos,
      nome_retornado: json.data.name,
      status: "sucesso",
      duracao_ms: duracaoMs,
      justificativa,
      ip_origem: req.headers.get("x-forwarded-for") ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          cpf: cpfDigitos,
          name: json.data.name,
          gender: json.data.gender ?? null,
          birthDate: json.data.birthDate ?? null,
          day: json.data.day ?? null,
          month: json.data.month ?? null,
          year: json.data.year ?? null,
          duracao_ms: duracaoMs,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("admin-cpf-consulta error:", e);
    if (supabase && cpfDigitos.length === 11) {
      await supabase.from("admin_cpf_consulta_log").insert({
        cpf_mascarado: cpfMascarado || mascararCpf(cpfDigitos),
        cpf_completo: cpfDigitos,
        status: "erro",
        erro_mensagem: e instanceof Error ? e.message : "Erro interno",
        justificativa: justificativa || "(sem justificativa - erro antes da validacao)",
        ip_origem: req.headers.get("x-forwarded-for") ?? null,
        user_agent: req.headers.get("user-agent") ?? null,
      });
    }
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
