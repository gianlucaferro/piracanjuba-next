import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Backfill do campo "objeto" dos contratos da prefeitura a partir da pagina de
// detalhe do portal Centi. O sync diario nao captura o objeto (so a lista, que
// nao tem essa coluna); aqui buscamos a pagina de detalhe de cada contrato.
//
// Centi serve o objeto em: <span class="dialog-label">Objeto</span>
//                          <span class="dialog-text">VALOR</span>
//
// Processa em lotes (recentes primeiro). A flag contratos.objeto_sync_em evita
// reprocessar contratos ja tentados (inclusive os cuja pagina nao traz objeto).

const UA = "piracanjuba.ai/1.0 (transparencia municipal)";

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function parseObjeto(html: string): string | null {
  const m = html.match(
    /<span class="dialog-label">Objeto<\/span>\s*<span class="dialog-text">([\s\S]*?)<\/span>/i,
  );
  if (!m) return null;
  const val = decodeEntities(m[1].replace(/<[^>]*>/g, "")).trim();
  return val.length > 2 ? val : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null);
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(Number(body?.batch_size) || 60, 150);

    const { data: contratos, error } = await supabase
      .from("contratos")
      .select("id, objeto, fonte_url")
      .is("objeto_sync_em", null)
      .like("fonte_url", "%contratos/contrato/%")
      .order("vigencia_inicio", { ascending: false, nullsFirst: false })
      .limit(batchSize);
    if (error) throw error;

    if (!contratos?.length) {
      return Response.json({ success: true, populated: 0, remaining: 0, message: "Backfill completo." });
    }

    let populated = 0;
    let skipped = 0;
    let semObjeto = 0;
    const errors: string[] = [];
    const now = new Date().toISOString();

    for (const c of contratos) {
      try {
        // Ja tem objeto: so marca como processado, sem refetch
        if (c.objeto && c.objeto.trim() !== "") {
          await supabase.from("contratos").update({ objeto_sync_em: now }).eq("id", c.id);
          skipped++;
          continue;
        }
        await new Promise((r) => setTimeout(r, 250)); // throttle anti-429
        const resp = await fetch(c.fonte_url, { headers: { "User-Agent": UA } });
        if (resp.status === 429) {
          // rate limit transitorio: nao marca, re-tenta num proximo lote
          errors.push(`${c.id}: 429`);
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        if (!resp.ok) {
          // 404 e afins: marca como tentado pra nao travar o loop
          await supabase.from("contratos").update({ objeto_sync_em: now }).eq("id", c.id);
          errors.push(`${c.id}: HTTP ${resp.status}`);
          continue;
        }
        const objeto = parseObjeto(await resp.text());
        const patch: Record<string, unknown> = { objeto_sync_em: now };
        if (objeto) {
          patch.objeto = objeto;
          populated++;
        } else {
          semObjeto++;
        }
        const { error: uErr } = await supabase.from("contratos").update(patch).eq("id", c.id);
        if (uErr) errors.push(`${c.id}: ${uErr.message}`);
      } catch (e) {
        errors.push(`${c.id}: ${(e as Error).message}`);
      }
    }

    const { count } = await supabase
      .from("contratos")
      .select("id", { count: "exact", head: true })
      .is("objeto_sync_em", null)
      .like("fonte_url", "%contratos/contrato/%");

    return Response.json({
      success: true,
      populated,
      skipped,
      sem_objeto: semObjeto,
      processados: contratos.length,
      remaining: count ?? null,
      errors: errors.slice(0, 5),
    });
  } catch (e) {
    return Response.json(
      { success: false, error: e instanceof Error ? e.message : "erro desconhecido" },
      { status: 500 },
    );
  }
});
