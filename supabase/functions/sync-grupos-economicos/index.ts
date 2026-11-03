import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hasCronOrServiceRoleAuth } from "../_shared/service-role-auth.ts";
import { calcularGruposEconomicos, type ContratoGrupo, type FornecedorGrupo } from "../_shared/grupos-economicos.ts";

const headers = { "Content-Type": "application/json" };
type Row = Record<string, unknown> & { id: string; updated_at: string | null };

Deno.serve(async (req) => {
  if (!hasCronOrServiceRoleAuth(req, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), Deno.env.get("CRON_SECRET"))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
  }
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let logId: string | null = null;
  try {
    const { data: log, error: logError } = await sb.from("sync_log").insert({ tipo: "sync-grupos-economicos", status: "running", started_at: new Date().toISOString() }).select("id").single();
    if (logError) throw logError;
    logId = log.id;
    async function lerTudo(table: string, columns: string): Promise<Row[]> {
      const rows: Row[] = [];
      let total: number | null = null;
      for (let from = 0; from < 100_000; from += 500) {
        const { data, error, count } = await sb.from(table).select(columns, { count: "exact" }).order("id").range(from, from + 499);
        if (error) throw error;
        if (count === null || (total !== null && total !== count)) throw new Error(`Base ${table} mudou durante a leitura; snapshot preservado`);
        total = count;
        rows.push(...(data ?? []) as unknown as Row[]);
        if ((data?.length ?? 0) < 500) {
          if (rows.length !== total) throw new Error(`Leitura incompleta de ${table}`);
          return rows;
        }
      }
      throw new Error(`Base ${table} excedeu o limite de leitura; snapshot preservado`);
    }
    const [prefeitura, camara, fornecedores] = await Promise.all([
      lerTudo("contratos", "id, empresa_cnpj_digitos, empresa_cnpj, empresa_razao_social, empresa, valor, updated_at"),
      lerTudo("contrato_camara", "id, fornecedor_cnpj_limpo, fornecedor_cnpj, fornecedor_nome, valor, tipo, updated_at"),
      lerTudo("fornecedores_cnpj", "id, cnpj, razao_social, socios, updated_at"),
    ]);
    if (!prefeitura.length || !camara.length || !fornecedores.length) throw new Error("Uma base de origem está vazia; snapshot preservado");
    const contratos: ContratoGrupo[] = [
      ...prefeitura.map((r) => ({ id: r.id, cnpj: (r.empresa_cnpj_digitos ?? r.empresa_cnpj) as string | null,
        razao_social: (r.empresa_razao_social ?? r.empresa) as string | null, poder: "prefeitura" as const, valor: r.valor as number | null })),
      ...camara.filter((r) => r.tipo === "Original").map((r) => ({ id: r.id, cnpj: (r.fornecedor_cnpj_limpo ?? r.fornecedor_cnpj) as string | null,
        razao_social: r.fornecedor_nome as string | null, poder: "camara" as const, valor: r.valor as number | null })),
    ];
    const grupos = calcularGruposEconomicos(fornecedores as unknown as FornecedorGrupo[], contratos);
    const assinatura = (rows: Row[]) => ({ quantidade: rows.length, atualizado_em: rows.map((r) => r.updated_at).filter((v): v is string => !!v).sort().at(-1) ?? null });
    const fontes = { contratos: assinatura(prefeitura), contrato_camara: assinatura(camara), fornecedores_cnpj: assinatura(fornecedores) };
    const { data: resultado, error } = await sb.rpc("publicar_grupos_economicos", { p_grupos: grupos, p_fontes: fontes });
    if (error) throw error;
    const { error: finalError } = await sb.from("sync_log").update({ status: "success", finished_at: new Date().toISOString(), detalhes: { ...resultado, registros: grupos.length, complete: true, fontes } }).eq("id", logId);
    if (finalError) throw finalError;
    return new Response(JSON.stringify({ success: true, ...resultado }), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (logId) await sb.from("sync_log").update({ status: "error", finished_at: new Date().toISOString(), detalhes: { error: message, complete: false } }).eq("id", logId);
    return new Response(JSON.stringify({ success: false, error: message }), { status: 500, headers });
  }
});
