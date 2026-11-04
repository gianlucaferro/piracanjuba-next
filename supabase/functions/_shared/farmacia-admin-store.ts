import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hasAdminSessionAuth } from "./admin-session-auth.ts";
import type { FarmaciaAdminDependencies } from "./farmacia-admin.ts";

export function createFarmaciaAdminDependencies(supabase: SupabaseClient): FarmaciaAdminDependencies {
  return {
  authorize: (token) => hasAdminSessionAuth(token, async (tokenHash) => {
    const { data, error } = await supabase.from("admin_sessions").select("expires_at")
      .eq("id", "singleton").eq("token_hash", tokenHash).maybeSingle();
    if (error) throw error;
    return data;
  }),
  async upload(nome, path, bytes) {
    const bucket = supabase.storage.from("farmacia-fotos");
    const { error } = await bucket.upload(path, bytes, { upsert: true, contentType: "image/webp", cacheControl: "3600" });
    if (error) throw error;
    const { data } = bucket.getPublicUrl(path);
    const { error: dbError } = await supabase.from("farmacia_fotos").upsert({
      nome, foto_url: `${data.publicUrl}?v=${Date.now()}`, updated_at: new Date().toISOString(),
    }, { onConflict: "nome" });
    if (dbError) throw dbError;
  },
  async removePhoto(nome) {
    // Preserva telefone e objeto fixo, evitando corridas com um novo upload.
    // No maximo um objeto por farmacia; substituir a foto reutiliza o mesmo path.
    const { error } = await supabase.from("farmacia_fotos")
      .update({ foto_url: "", updated_at: new Date().toISOString() }).eq("nome", nome);
    if (error) throw error;
  },
  async updatePhone(nome, telefone, tipo) {
    // O insert ignorado em conflito nunca sobrescreve uma foto concorrente.
    const { error: initError } = await supabase.from("farmacia_fotos")
      .upsert({ nome, foto_url: "" }, { onConflict: "nome", ignoreDuplicates: true });
    if (initError) throw initError;
    const { error } = await supabase.from("farmacia_fotos")
      .update({ telefone, tipo_telefone: tipo, updated_at: new Date().toISOString() }).eq("nome", nome);
    if (error) throw error;
  },
  };
}
