import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-nepo-senha",
};

// Cruzamento de SOBRENOMES entre agentes politicos (prefeita, vice, vereadores) e
// servidores/secretarios, como SINAL de possivel vinculo familiar para verificacao.
// NAO e prova de nepotismo: coincidencia de sobrenome != parentesco != nepotismo.
// Privado: so retorna se a senha bater com o secret NEPOTISMO_SENHA (fail-closed).

const CONECTORES = new Set(["DA", "DE", "DO", "DOS", "DAS", "E"]);
// Sobrenomes muito comuns: ignorados no match pra reduzir falso positivo.
const COMUNS = new Set([
  "SILVA", "SANTOS", "SOUZA", "SOUSA", "OLIVEIRA", "PEREIRA", "LIMA", "FERREIRA", "RODRIGUES",
  "ALVES", "COSTA", "GOMES", "RIBEIRO", "CARVALHO", "ALMEIDA", "NASCIMENTO", "ARAUJO", "BARBOSA",
  "MARTINS", "ROCHA", "DIAS", "MOREIRA", "CARDOSO", "TEIXEIRA", "CORREIA", "CUNHA", "MENDES",
  "NUNES", "RAMOS", "GONCALVES", "FERNANDES", "BATISTA", "PINTO", "MONTEIRO", "CAMPOS", "REIS",
  "FREITAS", "DUARTE", "CASTRO", "ANDRADE", "MACHADO", "VIEIRA", "BORGES", "LOPES", "MARQUES",
]);

function norm(s: string): string {
  return (s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
}
function sobrenomes(nome: string): string[] {
  const toks = norm(nome).split(" ");
  // ignora o primeiro token (nome proprio) + conectores + comuns; mantem so sobrenomes distintivos
  return toks.slice(1).filter((t) => t.length >= 3 && !CONECTORES.has(t) && !COMUNS.has(t));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = { ...corsHeaders, "Content-Type": "application/json" };

  const senha = Deno.env.get("NEPOTISMO_SENHA");
  if (!senha || req.headers.get("x-nepo-senha") !== senha) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: json });
  }

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const [exec, vers, servs, secs] = await Promise.all([
      sb.from("executivo").select("nome, tipo"),
      sb.from("vereadores").select("nome, slug"),
      sb.from("servidores").select("nome, cargo, orgao_tipo"),
      sb.from("secretarias").select("nome, secretario_nome"),
    ]);

    type Agente = { nome: string; cargo: string };
    const agentes: Agente[] = [
      ...((exec.data || []).map((e: any) => ({ nome: e.nome, cargo: e.tipo === "prefeita" ? "Prefeita" : "Vice-Prefeito" }))),
      ...((vers.data || []).map((v: any) => ({ nome: v.nome, cargo: "Vereador(a)" }))),
    ];

    // Pool de pessoas no quadro publico (servidores + secretarios).
    type Pessoa = { nome: string; cargo: string; fonte: string; sob: string[] };
    const pool: Pessoa[] = [];
    for (const s of servs.data || []) {
      pool.push({ nome: s.nome, cargo: s.cargo || "Servidor", fonte: s.orgao_tipo === "camara" ? "Servidor (Câmara)" : "Servidor (Prefeitura)", sob: sobrenomes(s.nome) });
    }
    for (const s of secs.data || []) {
      if (s.secretario_nome) pool.push({ nome: s.secretario_nome, cargo: `Secretário(a) - ${s.nome}`, fonte: "Secretário", sob: sobrenomes(s.secretario_nome) });
    }

    const resultado = agentes.map((a) => {
      const sobA = new Set(sobrenomes(a.nome));
      const vinculos = pool
        .filter((p) => norm(p.nome) !== norm(a.nome)) // ignora a propria pessoa
        .map((p) => {
          const comuns = p.sob.filter((x) => sobA.has(x));
          return comuns.length ? { nome: p.nome, cargo: p.cargo, fonte: p.fonte, sobrenomes: comuns } : null;
        })
        .filter(Boolean);
      return { agente: a.nome, cargo: a.cargo, sobrenomes: [...sobA], vinculos };
    }).filter((r) => r.vinculos.length > 0);

    return new Response(JSON.stringify({
      gerado_em: new Date().toISOString(),
      total_agentes_com_indicio: resultado.length,
      aviso: "SINAL para verificação. Coincidência de sobrenome NÃO é prova de parentesco nem de nepotismo (Súmula Vinculante 13 exige parente até 3º grau em cargo de confiança nomeado pela autoridade). Sobrenomes muito comuns foram filtrados.",
      resultado,
    }), { headers: json });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), { status: 500, headers: json });
  }
});
