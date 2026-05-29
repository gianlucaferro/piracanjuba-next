// Edge function para operacoes de escrita em anuncios via painel admin.
// Usa service_role (bypassa RLS) apos validar o token de sessao admin.
// Acoes: toggle_ativo | delete | update_link | update_whatsapp | reset_stats | create

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { admin_token, action, id, ativo, link_destino, whatsapp, nome_empresa, plano, imagem_url } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (!admin_token || !(await validateAdminToken(supabase, admin_token))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!action) {
      return new Response(JSON.stringify({ error: "action is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result;

    switch (action) {
      case "toggle_ativo": {
        if (!id || typeof ativo !== "boolean") {
          return new Response(JSON.stringify({ error: "id and ativo required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await supabase
          .from("anuncios")
          .update({ ativo, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        result = { success: true, ativo };
        break;
      }

      case "delete": {
        if (!id) {
          return new Response(JSON.stringify({ error: "id required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await supabase.from("anuncios").delete().eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "update_link": {
        if (!id) {
          return new Response(JSON.stringify({ error: "id required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await supabase
          .from("anuncios")
          .update({ link_destino: link_destino?.trim() || null, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "update_whatsapp": {
        if (!id) {
          return new Response(JSON.stringify({ error: "id required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await supabase
          .from("anuncios")
          .update({ whatsapp: whatsapp?.trim() || null, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "update_imagem": {
        if (!id || !imagem_url) {
          return new Response(JSON.stringify({ error: "id and imagem_url required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await supabase
          .from("anuncios")
          .update({ imagem_url, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "reset_stats": {
        if (!id) {
          return new Response(JSON.stringify({ error: "id required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await supabase
          .from("anuncios")
          .update({ impressoes: 0, cliques: 0, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "create": {
        if (!nome_empresa || !plano) {
          return new Response(JSON.stringify({ error: "nome_empresa and plano required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: created, error } = await supabase
          .from("anuncios")
          .insert({
            nome_empresa: nome_empresa.trim(),
            plano,
            link_destino: link_destino?.trim() || null,
            whatsapp: whatsapp?.trim() || null,
            imagem_url: imagem_url || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        result = { success: true, id: created?.id };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-anuncios-update error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
