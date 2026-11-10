import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { resumirFolhaPrefeitura, type RegistroCoberturaPrefeitura, type RegistroFolhaPrefeitura, type ResumoFolhaPrefeitura } from "@/lib/prefeitura-folha";

const supabase = createBrowserSupabaseClient();

async function lerPaginas<T extends { id?: string; chave?: string }>(
  lerPagina: (inicio: number, fim: number) => Promise<{ data: T[] | null; error: unknown; count: number | null }>,
): Promise<T[]> {
  const registros: T[] = [];
  const ids = new Set<string>();
  const tamanho = 1000;
  let totalEsperado: number | null = null;
  for (let inicio = 0; ; inicio += tamanho) {
    const { data, error, count } = await lerPagina(inicio, inicio + tamanho - 1);
    if (error) throw error;
    if (count === null || (totalEsperado !== null && count !== totalEsperado)) {
      throw new Error("Não foi possível confirmar o total de registros da folha da Prefeitura.");
    }
    totalEsperado = count;
    for (const registro of data ?? []) {
      const id = registro.id ?? registro.chave;
      if (!id || ids.has(id)) throw new Error("A consulta da folha da Prefeitura retornou registros inconsistentes.");
      ids.add(id);
      registros.push(registro);
    }
    if (registros.length === totalEsperado) return registros;
    if (!data?.length || data.length < tamanho || registros.length > totalEsperado) {
      throw new Error("A consulta da folha da Prefeitura retornou registros incompletos.");
    }
  }
}

export async function fetchPrefeituraResumoFolha(): Promise<ResumoFolhaPrefeitura | null> {
  const ultimaCompetencia = async (apenasMensal: boolean, antesDe?: string) => {
    let query = supabase.from("remuneracao_servidores")
      .select("competencia, servidores!inner(orgao_tipo)")
      .eq("servidores.orgao_tipo", "prefeitura");
    if (apenasMensal) query = query.ilike("tipo_folha", "MENSAL");
    if (antesDe) query = query.lt("competencia", antesDe);
    const { data, error } = await query.order("competencia", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data?.competencia ?? null;
  };

  const [recente, mensal] = await Promise.all([ultimaCompetencia(false), ultimaCompetencia(true)]);
  if (!recente) return null;
  const anterior = mensal ? await ultimaCompetencia(true, mensal) : null;
  const competencias = [...new Set([recente, ...(mensal ? [mensal] : [])])];
  const competenciasCobertura = [mensal, anterior].filter((c): c is string => c !== null);
  const filtroCobertura = competenciasCobertura.map((competencia) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) throw new Error("Competência inválida na folha da Prefeitura.");
    const [ano, mes] = competencia.split("-").map(Number);
    return `and(ano.eq.${ano},mes.eq.${mes})`;
  }).join(",");

  const [registros, cobertura] = await Promise.all([
    lerPaginas<RegistroFolhaPrefeitura & { id: string }>(async (inicio, fim) => await supabase.from("remuneracao_servidores")
      .select("id, servidor_id, competencia, tipo_folha, bruto, servidores!inner(orgao_tipo)", { count: "exact" })
      .eq("servidores.orgao_tipo", "prefeitura")
      .in("competencia", competencias)
      .order("id", { ascending: true }).range(inicio, fim)),
    filtroCobertura ? lerPaginas<RegistroCoberturaPrefeitura & { chave: string }>(async (inicio, fim) => await supabase.from("prefeitura_folha_nucleogov")
      // Projetar somente metadados públicos de órgão, nunca o payload pessoal.
      .select("chave, ano, mes, orgao_id:raw_payload->>orgao_id, orgao_nome:raw_payload->>orgao", { count: "exact" })
      .ilike("tipo_folha", "MENSAL").or(filtroCobertura)
      .order("chave", { ascending: true }).range(inicio, fim)
      .returns<(RegistroCoberturaPrefeitura & { chave: string })[]>()) : Promise.resolve([]),
  ]);

  const partes = new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const competenciaAtual = `${partes.find((p) => p.type === "year")!.value}-${partes.find((p) => p.type === "month")!.value}`;
  return resumirFolhaPrefeitura(registros, cobertura, anterior, competenciaAtual);
}
