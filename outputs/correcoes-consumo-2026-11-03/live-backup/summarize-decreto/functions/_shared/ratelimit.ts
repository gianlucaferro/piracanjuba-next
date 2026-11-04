// Guard rail compartilhado das chamadas de IA (resumos + chatbot).
// Rate limit por IP (15/min, 80/h) + circuit breaker diário global (4000/dia), atômico no
// banco via RPC `ai_guard`. Deve ser chamado SEMPRE logo antes da chamada à IA (depois do
// cache-hit, que retorna de graça e não conta). Fail-open: se a RPC falhar, libera (não
// quebra o resumo); o teto de crédito na própria chave OpenRouter é o backstop final.

import { corsHeaders } from "./ai.ts";

const SALT = Deno.env.get("RATELIMIT_SALT") ?? "pba-ai-guard-v1";

export async function clientIpHash(req: Request): Promise<string> {
  const ip = (
    req.headers.get("x-forwarded-for")?.split(",")[0] ??
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    "desconhecido"
  ).trim();
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${SALT}`));
  return Array.from(new Uint8Array(buf)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface GuardResult {
  allowed: boolean;
  reason?: "rate" | "budget";
  scope?: string;
}

interface RpcClient {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
}

export async function aiGuard(sb: RpcClient, req: Request, fnName: string): Promise<GuardResult> {
  try {
    const ipHash = await clientIpHash(req);
    const { data, error } = await sb.rpc("ai_guard", { p_ip_hash: ipHash, p_fn: fnName });
    if (error) {
      console.error("ai_guard rpc error:", (error as { message?: string })?.message);
      return { allowed: true }; // fail-open
    }
    return (data ?? { allowed: true }) as GuardResult;
  } catch (e) {
    console.error("aiGuard exception:", (e as Error)?.message);
    return { allowed: true };
  }
}

export function guardBlockedResponse(g: GuardResult): Response {
  const msg = g.reason === "budget"
    ? "O limite diário de resumos por IA foi atingido. Tente novamente mais tarde ou consulte a fonte oficial."
    : `Muitas requisições${g.scope ? ` (limite por ${g.scope})` : ""}. Aguarde um pouco e tente de novo.`;
  return new Response(
    JSON.stringify({ error: msg, error_code: g.reason === "budget" ? "budget" : "rate_limit" }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
