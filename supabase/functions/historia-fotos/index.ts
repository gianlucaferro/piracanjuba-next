import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Fotos da história enviadas pelos moradores (página /historia-pba).
// - action "upload": público, rate-limited por IP. Recebe a imagem já convertida
//   para WebP (base64) no navegador, salva no bucket privado e cria um registro
//   pendente para o operador moderar.
// - actions "list" / "set_status" / "delete": exigem admin_token (admin_sessions).

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = { ...cors, "Content-Type": "application/json" };

const BUCKET = "historia-fotos";
const UPLOAD_RATE_MAX = 6; // uploads por IP a cada 10 min
const MAX_BYTES = 4_000_000; // ~4MB já em WebP

type SB = ReturnType<typeof createClient>;

const erro = (msg: string, status = 400): Response => new Response(JSON.stringify({ error: msg }), { status, headers: json });
const ok = (payload: unknown): Response => new Response(JSON.stringify(payload), { headers: json });

async function sha256hex(s: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function validateAdmin(sb: SB, token: unknown): Promise<boolean> {
  if (typeof token !== "string" || !token) return false;
  const th = await sha256hex(token);
  const { data } = await sb.from("admin_sessions").select("expires_at").eq("id", "singleton").eq("token_hash", th).single();
  return !!data && new Date(data.expires_at as string) > new Date();
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.split(",").pop() ?? "" : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = body.action;

    // --- Upload público (rate-limited) ---
    if (action === "upload") {
      const b64 = typeof body.webpBase64 === "string" ? body.webpBase64 : "";
      if (!b64) return erro("Imagem ausente.");
      const bytes = base64ToBytes(b64);
      if (bytes.length < 100) return erro("Imagem inválida.");
      if (bytes.length > MAX_BYTES) return erro("Imagem muito grande.", 413);

      const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "0.0.0.0";
      const ipHash = (await sha256hex("pba-hist::" + ip)).slice(0, 20);
      const since = new Date(Date.now() - 10 * 60_000).toISOString();
      const { count } = await sb
        .from("historia_fotos")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", since);
      if ((count ?? 0) >= UPLOAD_RATE_MAX) {
        return erro("Você enviou muitas fotos em pouco tempo. Tente novamente mais tarde.", 429);
      }

      const id = crypto.randomUUID();
      const path = `pendente/${id}.webp`;
      const up = await sb.storage.from(BUCKET).upload(path, bytes, { contentType: "image/webp", upsert: false });
      if (up.error) return erro("Falha ao salvar a imagem.", 500);

      await sb.from("historia_fotos").insert({
        id,
        storage_path: path,
        original_name: typeof body.originalName === "string" ? body.originalName.slice(0, 200) : null,
        descricao: typeof body.descricao === "string" ? body.descricao.slice(0, 500) : null,
        autor_nome: typeof body.autorNome === "string" ? body.autorNome.slice(0, 120) : null,
        status: "pendente",
        ip_hash: ipHash,
      });
      return ok({ success: true });
    }

    // --- Ações de admin ---
    if (!(await validateAdmin(sb, body.admin_token))) return erro("Unauthorized", 401);

    if (action === "list") {
      const { data, error } = await sb.from("historia_fotos").select("*").order("created_at", { ascending: false }).limit(300);
      if (error) return erro("Erro ao listar.", 500);
      const fotos = await Promise.all(
        (data || []).map(async (r) => {
          const { data: signed } = await sb.storage.from(BUCKET).createSignedUrl(r.storage_path as string, 3600);
          return { ...r, url: signed?.signedUrl ?? null };
        }),
      );
      return ok({ fotos });
    }

    if (action === "set_status") {
      const status = body.status;
      if (status !== "pendente" && status !== "aprovada" && status !== "rejeitada") return erro("Status inválido.");
      await sb.from("historia_fotos").update({ status }).eq("id", body.id);
      return ok({ success: true });
    }

    if (action === "delete") {
      const { data: row } = await sb.from("historia_fotos").select("storage_path").eq("id", body.id).single();
      if (row?.storage_path) await sb.storage.from(BUCKET).remove([row.storage_path as string]);
      await sb.from("historia_fotos").delete().eq("id", body.id);
      return ok({ success: true });
    }

    return erro("Ação desconhecida.");
  } catch (e) {
    return erro(e instanceof Error ? e.message : "Erro interno.", 500);
  }
});
