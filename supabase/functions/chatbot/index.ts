import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiGuard, guardBlockedResponse } from "../_shared/ratelimit.ts";
import {
  corsHeaders,
  geminiChat,
  openrouterChat,
  hasOpenRouter,
  MODELS,
  GeminiUpstreamError,
  geminiErrorToResponse,
  jsonError,
} from "../_shared/ai.ts";
import { buildBenefitContextRows } from "../_shared/beneficios-context.ts";

// Chatbot público do Piracanjuba.ai.
// Responde perguntas sobre o município usando SOMENTE os dados públicos do banco
// (grounding). Modelo barato (gemini-2.5-flash-lite), rate limit por IP, histórico
// curto (multi-turn) e máscara de qualquer CPF que escape ao contexto.
//
// O contexto é montado por intenção: um núcleo institucional sempre presente +
// blocos por assunto (DOMAINS) acionados por palavra-chave. Assim o bot tem acesso
// a todo o mapa de dados do portal sem inflar cada chamada.

const RATE_MAX_PER_MIN = 12;
const MAX_PERGUNTA = 500;
const MAX_DOMAINS = 9; // teto de blocos por assunto por pergunta (custo/latência)

type SB = ReturnType<typeof createClient>;
type Msg = { role: "user" | "assistant"; content: string };
type DomainBlock = { keys: string[]; run: (sb: SB) => Promise<string | null> };

const cur = (n: number | null | undefined): string =>
  n != null && !Number.isNaN(Number(n)) ? `R$ ${Number(n).toLocaleString("pt-BR")}` : "N/D";

const trunc = (s: string | null | undefined, n: number): string =>
  (s || "").replace(/\s+/g, " ").trim().slice(0, n);

// minúsculas + sem acento, para casar palavras-chave de forma robusta.
const norm = (s: string): string => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const fmtList = (title: string, rows: string[]): string | null =>
  rows.length ? `### ${title}\n${rows.join("\n")}` : null;

function maskCpf(s: string): string {
  return s.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "***.***.***-**");
}

async function hashIp(ip: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("pba-chat::" + ip));
  return Array.from(new Uint8Array(buf)).slice(0, 10).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sanitizeHistory(raw: unknown): Msg[] {
  if (!Array.isArray(raw)) return [];
  const out: Msg[] = [];
  for (const m of raw.slice(-6)) {
    if (m && typeof m === "object" && "role" in m && "content" in m) {
      const role = (m as Record<string, unknown>).role;
      const content = (m as Record<string, unknown>).content;
      if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim()) {
        out.push({ role, content: content.slice(0, 1500) });
      }
    }
  }
  return out;
}

// Núcleo institucional: sempre presente (pequeno e de alto valor).
async function coreContext(sb: SB): Promise<string[]> {
  const [exec, vers, secs, inds] = await Promise.all([
    sb.from("executivo").select("tipo, nome, partido, mandato_inicio, mandato_fim").limit(5),
    sb.from("vereadores").select("nome, partido, cargo_mesa, votos_eleicao").order("nome").limit(20),
    sb.from("secretarias").select("nome, secretario_nome, subsidio").limit(40),
    sb.from("indicadores_municipais").select("chave, valor_texto, valor, ano_referencia").limit(40),
  ]);
  const verList = vers.data || [];
  const blocks: string[] = [];
  blocks.push(
    `### Poder Executivo\n${
      (exec.data || []).map((e) => `- ${e.tipo}: ${e.nome} (${e.partido || "s/partido"}), mandato ${e.mandato_inicio} a ${e.mandato_fim}, subsídio (salário do cargo) ${cur(/vice/i.test(String(e.tipo)) ? 9875 : 19875)}/mês`).join("\n") || "Sem dados"
    }`,
  );
  blocks.push(
    `### Câmara Municipal (Legislativo) - ${verList.length} vereadores\n${
      verList.map((v) => `- ${v.nome} (${v.partido || "s/partido"})${v.cargo_mesa ? `, ${v.cargo_mesa}` : ""}${v.votos_eleicao ? `, ${v.votos_eleicao} votos` : ""}`).join("\n") || "Sem dados"
    }`,
  );
  blocks.push(
    `### Secretarias e secretários\n${
      (secs.data || []).map((s) => `- ${s.nome}: ${s.secretario_nome || "N/D"}${s.subsidio ? `, subsídio ${cur(s.subsidio)}` : ""}`).join("\n") || "Sem dados"
    }`,
  );
  if (inds.data?.length) {
    // despesa_anual: base IBGE antiga (2024) que conflita com o SICONFI atual; o domínio fiscal já
    // serve a despesa/receita oficial com rótulo correto. Filtrado só do chatbot (segue no card da home).
    const SKIP = new Set(["despesa_anual"]);
    const LABEL: Record<string, string> = {
      frota_veiculos: "Frota total do município (todos os proprietários, DENATRAN; a frota da Prefeitura é bem menor)",
      pessoal_ocupado_formal: "Pessoas com emprego formal no município (IBGE; NÃO é o número de servidores da prefeitura)",
    };
    const linhas = inds.data
      .filter((i) => !SKIP.has(String(i.chave)))
      .map((i) => `- ${LABEL[String(i.chave)] ?? i.chave}: ${i.valor_texto ?? i.valor} (${i.ano_referencia})`);
    blocks.push(`### Indicadores municipais (IBGE e outros)\n${linhas.join("\n")}`);
  }
  return blocks;
}

// Blocos por assunto. Cada um só é consultado se a pergunta casar com alguma
// palavra-chave (sem acento) e só entra no contexto se houver dado.
const DOMAINS: DomainBlock[] = [
  {
    // Totais e contagens. Resolve "quantos servidores/contratos/obras/vereadores...",
    // "número de X", "quantidade de Y". Sem isto o bot lista alguns itens mas nunca conta o total.
    keys: ["quantos", "quantas", "numero de", "n. de", "quantidade", "total de", "ao todo", "qtd", "quantos sao", "quantas sao"],
    run: async (sb) => {
      const countOf = async (tbl: string, col?: string, val?: string): Promise<number | null> => {
        let q = sb.from(tbl).select("*", { count: "exact", head: true });
        if (col && val) q = q.eq(col, val);
        const { count, error } = await q;
        return error ? null : count ?? 0;
      };
      const [
        servPref, servCam, vers, secs, contrPref, contrCam, licPref, licCam,
        obras, leis, decretos, portarias, veiculos, fornecedores, sancionadas, emendas, diarias,
      ] = await Promise.all([
        countOf("servidores", "orgao_tipo", "prefeitura"),
        countOf("servidores", "orgao_tipo", "camara"),
        countOf("vereadores"),
        countOf("secretarias"),
        countOf("contratos"),
        countOf("camara_contratos"),
        countOf("licitacoes"),
        countOf("camara_licitacoes"),
        countOf("obras"),
        countOf("leis_municipais"),
        countOf("decretos"),
        countOf("portarias"),
        countOf("veiculos_frota"),
        countOf("fornecedores_cnpj"),
        countOf("empresa_sancionada"),
        countOf("emendas_parlamentares"),
        countOf("diarias"),
      ]);
      const line = (label: string, v: number | null): string | null =>
        v == null ? null : `- ${label}: ${v.toLocaleString("pt-BR")}`;
      const rows = [
        line("Servidores da Prefeitura (folha de pessoal municipal; NÃO é o mesmo que 'pessoas ocupadas' do IBGE)", servPref),
        line("Servidores da Câmara", servCam),
        line("Vereadores", vers),
        line("Secretarias municipais", secs),
        line("Contratos da Prefeitura cadastrados", contrPref),
        line("Contratos da Câmara cadastrados", contrCam),
        line("Licitações da Prefeitura cadastradas", licPref),
        line("Licitações da Câmara cadastradas", licCam),
        line("Obras cadastradas", obras),
        line("Leis municipais cadastradas", leis),
        line("Decretos cadastrados", decretos),
        line("Portarias cadastradas", portarias),
        line("Veículos na frota", veiculos),
        line("Fornecedores (CNPJ) com contrato", fornecedores),
        line("Empresas sancionadas (CEIS/CNEP) na base", sancionadas),
        line("Emendas parlamentares registradas", emendas),
        line("Diárias da Prefeitura registradas", diarias),
      ].filter((x): x is string => !!x);
      return fmtList("Totais e contagens (números atuais cadastrados no portal)", rows);
    },
  },
  {
    // Salário do Executivo (prefeita/vice). Vem antes pra responder direto "quanto ganha a prefeita".
    keys: ["salario", "subsidio", "remunera", "ganha", "recebe", "vencimento", "quanto ganha", "prefeita", "prefeito", "vice-prefeito", "vice prefeito", "chefe do executivo"],
    run: async (sb) => {
      const { data: exe } = await sb.from("executivo").select("tipo, nome, partido").limit(5);
      if (!exe?.length) return null;
      const rows: string[] = [];
      for (const e of exe) {
        const sub = /vice/i.test(String(e.tipo)) ? 9875 : 19875;
        let remTxt = "";
        const { data: srv } = await sb.from("servidores").select("id").eq("orgao_tipo", "prefeitura").ilike("nome", `%${String(e.nome).toUpperCase()}%`).limit(1);
        if (srv?.length) {
          const { data: rem } = await sb.from("remuneracao_servidores").select("bruto, liquido, competencia").eq("servidor_id", srv[0].id).order("competencia", { ascending: false }).limit(1);
          if (rem?.length) remTxt = `; remuneração bruta mais recente ${cur(rem[0].bruto)} (líquido ${cur(rem[0].liquido)}, ${rem[0].competencia})`;
        }
        rows.push(`- ${e.tipo} ${e.nome} (${e.partido || "s/partido"}): subsídio (salário do cargo) ${cur(sub)}/mês${remTxt}`);
      }
      return fmtList("Salário do Executivo (prefeita e vice)", rows);
    },
  },
  {
    keys: ["salario", "subsidio", "remunera", "ganha", "recebe", "vencimento", "quanto ganha"],
    run: async (sb) => {
      const { data } = await sb.from("remuneracao_mensal").select("vereador_id, bruto, liquido, subsidio_referencia, competencia").order("competencia", { ascending: false }).limit(40);
      if (!data?.length) return null;
      const ids = [...new Set(data.map((r) => r.vereador_id))];
      const { data: vs } = await sb.from("vereadores").select("id, nome").in("id", ids);
      const nm = new Map((vs || []).map((v) => [v.id, v.nome]));
      const seen = new Set<string>();
      const rows: string[] = [];
      for (const r of data) {
        if (seen.has(r.vereador_id)) continue;
        seen.add(r.vereador_id);
        rows.push(`- ${nm.get(r.vereador_id) || "Vereador"}: bruto ${cur(r.bruto)}, líquido ${cur(r.liquido)} (subsídio ref. ${cur(r.subsidio_referencia)}, ${r.competencia})`);
      }
      return fmtList("Remuneração dos vereadores (folha recente)", rows);
    },
  },
  {
    keys: ["salario", "subsidio", "remunera", "ganha", "recebe", "folha", "servidor", "secretario", "funcionario"],
    run: async (sb) => {
      const { data: rem } = await sb.from("remuneracao_servidores").select("servidor_id, bruto, liquido, competencia").order("competencia", { ascending: false }).limit(120);
      if (!rem?.length) return null;
      const seen = new Map<string, { bruto: number | null; liquido: number | null }>();
      for (const r of rem) if (!seen.has(r.servidor_id)) seen.set(r.servidor_id, { bruto: r.bruto, liquido: r.liquido });
      const ids = [...seen.keys()].slice(0, 60);
      const { data: ss } = await sb.from("servidores").select("id, nome, cargo, orgao_tipo").in("id", ids);
      return fmtList(
        "Remuneração de servidores (folha mais recente)",
        (ss || []).map((s) => {
          const r = seen.get(s.id);
          return `- ${s.nome} (${s.cargo || "s/cargo"}, ${s.orgao_tipo === "camara" ? "Câmara" : "Prefeitura"}): bruto ${cur(r?.bruto)}, líquido ${cur(r?.liquido)}`;
        }),
      );
    },
  },
  {
    keys: ["projeto", "lei", "ementa", "propos", "legisla"],
    run: async (sb) => {
      const { data } = await sb.from("projetos").select("tipo, numero, ano, ementa, autor_texto, status").order("data", { ascending: false }).limit(15);
      return fmtList("Projetos da Câmara (autoria dos vereadores)", (data || []).map((p) => `- ${p.tipo} nº ${p.numero}/${p.ano} (${p.status}), autor ${p.autor_texto}: ${trunc(p.ementa, 120)}`));
    },
  },
  {
    keys: ["requerimento", "mocao", "indica", "atuacao", "fiscaliz", "propos"],
    run: async (sb) => {
      const { data } = await sb.from("atuacao_parlamentar").select("tipo, numero, ano, descricao, autor_texto").order("data", { ascending: false }).limit(15);
      return fmtList("Atuação parlamentar (requerimentos, moções, indicações)", (data || []).map((a) => `- ${a.tipo} ${a.numero}/${a.ano}, ${a.autor_texto}: ${trunc(a.descricao, 110)}`));
    },
  },
  {
    keys: ["presenca", "falta", "faltou", "frequencia", "sessao", "assiduidade", "compareceu"],
    run: async (sb) => {
      const { data } = await sb.from("presenca_sessoes").select("vereador_nome, presente, sessao_data").order("sessao_data", { ascending: false }).limit(220);
      if (!data?.length) return null;
      const m = new Map<string, { t: number; p: number }>();
      for (const r of data) {
        const n = r.vereador_nome || "?";
        const e = m.get(n) || { t: 0, p: 0 };
        e.t++;
        if (r.presente) e.p++;
        m.set(n, e);
      }
      return fmtList("Presença em sessões (registros recentes)", [...m.entries()].map(([n, { t, p }]) => `- ${n}: ${p}/${t} presenças (${Math.round((p / t) * 100)}%)`));
    },
  },
  {
    keys: ["contrato", "fornecedor", "licitad", "contratad", "terceiriz"],
    run: async (sb) => {
      const [recentes, maiores, cam] = await Promise.all([
        sb.from("contratos").select("numero, objeto, empresa, valor, status").order("vigencia_inicio", { ascending: false }).limit(8),
        sb.from("contratos").select("numero, objeto, empresa, valor, status").order("valor", { ascending: false, nullsFirst: false }).limit(6),
        sb.from("camara_contratos").select("numero, ano, credor, objeto, valor, status").order("vigencia_inicio", { ascending: false }).limit(6),
      ]);
      const secoes: string[] = [];
      const recentesBloco = fmtList("Contratos recentes", [
        ...(recentes.data || []).map((c) => `- [Prefeitura] Contrato ${c.numero} (${c.status}): ${trunc(c.objeto, 80)} - ${c.empresa || "N/D"} - ${cur(c.valor)}`),
        ...(cam.data || []).map((c) => `- [Câmara] Contrato ${c.numero}/${c.ano} (${c.status}): ${trunc(c.objeto, 80)} - ${c.credor || "N/D"} - ${cur(c.valor)}`),
      ]);
      if (recentesBloco) secoes.push(recentesBloco);
      const maioresBloco = fmtList(
        "Maiores contratos da Prefeitura por valor (entre todos os cadastrados)",
        (maiores.data || []).filter((c) => c.valor != null).map((c) => `- Contrato ${c.numero} (${c.status}): ${cur(c.valor)} - ${c.empresa || "N/D"} - ${trunc(c.objeto, 70)}`),
      );
      if (maioresBloco) secoes.push(maioresBloco);
      return secoes.length ? secoes.join("\n\n") : null;
    },
  },
  {
    keys: ["despesa", "gasto", "gastou", "pagamento", "pagou", "empenho", "favorecido", "quanto custou", "mais recebeu", "quem recebeu", "maior pagamento"],
    run: async (sb) => {
      const [recentes, maiores, cam] = await Promise.all([
        sb.from("despesas").select("data, favorecido, valor, descricao").order("data", { ascending: false }).limit(12),
        sb.from("despesas").select("data, favorecido, valor, descricao").order("valor", { ascending: false, nullsFirst: false }).limit(6),
        sb.from("camara_despesas").select("ano, mes, credor, descricao, valor").order("data_pagamento", { ascending: false }).limit(8),
      ]);
      const secoes: string[] = [];
      const recentesBloco = fmtList("Despesas recentes", [
        ...(recentes.data || []).map((d) => `- [Prefeitura] ${d.data}: ${d.favorecido || "N/D"} - ${cur(d.valor)} - ${trunc(d.descricao, 70)}`),
        ...(cam.data || []).map((d) => `- [Câmara] ${d.mes}/${d.ano}: ${d.credor || "N/D"} - ${cur(d.valor)} - ${trunc(d.descricao, 70)}`),
      ]);
      if (recentesBloco) secoes.push(recentesBloco);
      const maioresBloco = fmtList(
        "Maiores pagamentos individuais da Prefeitura por valor (entre todos os cadastrados)",
        (maiores.data || []).filter((d) => d.valor != null).map((d) => `- ${d.favorecido || "N/D"}: ${cur(d.valor)} (${d.data}) - ${trunc(d.descricao, 60)}`),
      );
      if (maioresBloco) secoes.push(maioresBloco);
      return secoes.length ? secoes.join("\n\n") : null;
    },
  },
  {
    // Orçamento, receita/despesa totais e limite de gasto com pessoal (LRF).
    // Dados oficiais do Tesouro Nacional (SICONFI RREO/RGF), os mesmos da aba Prestação de Contas.
    keys: ["orcament", "arrecad", "receita", "despesa total", "despesas totais", "total de despesa", "gastou", "gasta", "gastos", "quanto gast", "prestacao de conta", "balanco municipal", "rreo", "rgf", "lrf", "limite de gasto", "gasto com pessoal", "folha total", "quanto a prefeitura recebe", "quanto entra de dinheiro"],
    run: async (sb) => {
      const { data } = await sb
        .from("prestacao_contas_fiscal")
        .select("poder, ano, periodo_rreo, receita_realizada, despesa_empenhada, despesa_liquidada, despesa_paga, despesa_dotacao, dtp, dtp_pct, limite_max_pct, rcl")
        .order("ano", { ascending: false })
        .limit(12);
      if (!data?.length) return null;
      const rows: string[] = [];
      const exeFin = data.filter((r) => r.poder === "executivo" && r.receita_realizada != null).slice(0, 2);
      for (const e of exeFin) {
        const parcial = e.periodo_rreo != null && Number(e.periodo_rreo) < 6
          ? ` (parcial, acumulado até o ${e.periodo_rreo}º bimestre)`
          : " (exercício fechado, ano inteiro)";
        rows.push(`- Prefeitura, exercício ${e.ano}${parcial}: receita TOTAL realizada (arrecadação total oficial do município) ${cur(e.receita_realizada)}; despesa total empenhada ${cur(e.despesa_empenhada)}, liquidada ${cur(e.despesa_liquidada)}, paga ${cur(e.despesa_paga)}; dotação orçada ${cur(e.despesa_dotacao)}`);
      }
      const rgfExe = data.find((r) => r.poder === "executivo" && r.dtp != null);
      if (rgfExe) rows.push(`- Gasto com pessoal da Prefeitura (LRF/RGF ${rgfExe.ano}): ${cur(rgfExe.dtp)} = ${rgfExe.dtp_pct}% da Receita Corrente Líquida (limite máximo legal ${rgfExe.limite_max_pct}%)`);
      const rgfLeg = data.find((r) => r.poder === "legislativo" && r.dtp != null);
      if (rgfLeg) rows.push(`- Gasto com pessoal da Câmara (LRF/RGF ${rgfLeg.ano}): ${cur(rgfLeg.dtp)} = ${rgfLeg.dtp_pct}% da RCL (limite ${rgfLeg.limite_max_pct}%)`);
      if (rows.length) rows.push("- (Para o TOTAL de arrecadação/receita ou de despesa anual do município, use os valores oficiais acima, fonte SICONFI/Tesouro. Somar as categorias avulsas da aba Arrecadação pode duplicar repasses e superestimar o total.)");
      return fmtList("Orçamento e prestação de contas (Tesouro Nacional / SICONFI - RREO e RGF)", rows);
    },
  },
  {
    keys: ["diaria", "viagem", "viajou", "deslocamento"],
    run: async (sb) => {
      const [pref, cam] = await Promise.all([
        sb.from("diarias").select("servidor_nome, destino, motivo, valor, data").order("data", { ascending: false }).limit(12),
        sb.from("camara_diarias").select("beneficiario, cargo, destino, valor, data").order("data", { ascending: false }).limit(10),
      ]);
      const rows = [
        ...(pref.data || []).map((d) => `- [Prefeitura] ${d.servidor_nome || "N/D"} para ${d.destino || "N/D"}: ${cur(d.valor)} (${d.data}) ${trunc(d.motivo, 50)}`),
        ...(cam.data || []).map((d) => `- [Câmara] ${d.beneficiario || "N/D"} (${d.cargo || ""}) para ${d.destino || "N/D"}: ${cur(d.valor)} (${d.data})`),
      ];
      return fmtList("Diárias recentes", rows);
    },
  },
  {
    keys: ["obra", "reforma", "construc", "pavimenta", "asfalto", "praca", "ponte", "calcamento"],
    run: async (sb) => {
      const { data } = await sb.from("obras").select("nome, local, valor, empresa, status").limit(15);
      return fmtList("Obras", (data || []).map((o) => `- ${o.nome} (${o.status || "N/D"})${o.local ? ` em ${o.local}` : ""} - ${cur(o.valor)} - ${o.empresa || "N/D"}`));
    },
  },
  {
    keys: ["licita", "pregao", "edital", "dispensa", "concorrencia", "tomada de preco"],
    run: async (sb) => {
      const { data } = await sb.from("licitacoes").select("numero, modalidade, objeto, status, data_publicacao").order("data_publicacao", { ascending: false }).limit(12);
      return fmtList("Licitações da Prefeitura", (data || []).map((l) => `- ${l.modalidade || "N/D"} nº ${l.numero} (${l.status}): ${trunc(l.objeto, 80)}`));
    },
  },
  {
    keys: ["decreto"],
    run: async (sb) => {
      const { data } = await sb.from("decretos").select("numero, data_publicacao, ementa, resumo_ia").order("data_publicacao", { ascending: false }).limit(12);
      return fmtList("Decretos do Executivo", (data || []).map((d) => `- Decreto ${d.numero} (${d.data_publicacao}): ${trunc(d.resumo_ia || d.ementa, 110)}`));
    },
  },
  {
    keys: ["portaria"],
    run: async (sb) => {
      const { data } = await sb.from("portarias").select("numero, data_publicacao, ementa, resumo_ia").order("data_publicacao", { ascending: false }).limit(12);
      return fmtList("Portarias", (data || []).map((p) => `- Portaria ${p.numero} (${p.data_publicacao}): ${trunc(p.resumo_ia || p.ementa, 110)}`));
    },
  },
  {
    keys: ["lei municipal", "leis", "sanciona", "norma", "lei "],
    run: async (sb) => {
      const { data } = await sb.from("leis_municipais").select("numero, data_publicacao, ementa, resumo_ia").order("data_publicacao", { ascending: false }).limit(12);
      return fmtList("Leis municipais", (data || []).map((l) => `- Lei ${l.numero} (${l.data_publicacao}): ${trunc(l.resumo_ia || l.ementa, 110)}`));
    },
  },
  {
    keys: ["lei organica", "organica"],
    run: async (sb) => {
      const { data } = await sb.from("lei_organica_artigos").select("titulo, artigo_numero, resumo_ia, artigo_texto").order("ordem").limit(12);
      return fmtList("Lei Orgânica (artigos)", (data || []).map((a) => `- Art. ${a.artigo_numero} (${a.titulo || ""}): ${trunc(a.resumo_ia || a.artigo_texto, 110)}`));
    },
  },
  {
    keys: ["resolucao"],
    run: async (sb) => {
      const { data } = await sb.from("resolucoes").select("numero, ano, ementa, resumo_ia").order("data_publicacao", { ascending: false }).limit(10);
      return fmtList("Resoluções da Câmara", (data || []).map((r) => `- Resolução ${r.numero}/${r.ano}: ${trunc(r.resumo_ia || r.ementa, 110)}`));
    },
  },
  {
    keys: ["veiculo", "carro", "frota", "placa", "caminhao", "onibus", "ambulancia"],
    run: async (sb) => {
      const { data } = await sb.from("veiculos_frota").select("placa, descricao, marca, ano_fabricacao, situacao, orgao").limit(30);
      if (!data?.length) return null;
      return fmtList(`Frota de veículos (${data.length} no total)`, data.slice(0, 20).map((v) => `- ${v.descricao || v.marca || "Veículo"} ${v.ano_fabricacao || ""} (placa ${v.placa || "N/D"}, ${v.situacao || ""}, ${v.orgao || ""})`));
    },
  },
  {
    keys: ["saude", "posto", "hospital", "ubs", "medico", "dengue", "vacina", "sus", "leito", "cnes", "doenca"],
    run: async (sb) => {
      const [ind, est] = await Promise.all([
        sb.from("saude_indicadores").select("categoria, indicador, ano, valor_texto, valor").order("ano", { ascending: false }).limit(25),
        sb.from("saude_estabelecimentos").select("nome, tipo, endereco, telefone").limit(15),
      ]);
      const rows = [
        ...(ind.data || []).map((s) => `- [${s.categoria}] ${s.indicador} (${s.ano}): ${s.valor_texto ?? s.valor}`),
        ...(est.data || []).map((e) => `- Unidade: ${e.nome} (${e.tipo || ""})${e.endereco ? `, ${trunc(e.endereco, 40)}` : ""}${e.telefone ? `, tel ${e.telefone}` : ""}`),
      ];
      return fmtList("Saúde", rows);
    },
  },
  {
    keys: ["educac", "escola", "ideb", "matricula", "creche", "ensino", "aluno", "professor"],
    run: async (sb) => {
      const [ind, ideb] = await Promise.all([
        sb.from("educacao_indicadores").select("categoria, chave, valor_texto, ano_referencia").order("ano_referencia", { ascending: false }).limit(25),
        sb.from("educacao_ideb").select("ano, etapa, rede, ideb, meta").order("ano", { ascending: false }).limit(12),
      ]);
      const rows = [
        ...(ind.data || []).map((e) => `- [${e.categoria}] ${e.chave}: ${e.valor_texto} (${e.ano_referencia})`),
        ...(ideb.data || []).map((i) => `- IDEB ${i.etapa}/${i.rede} (${i.ano}): ${i.ideb}${i.meta ? ` (meta ${i.meta})` : ""}`),
      ];
      return fmtList("Educação", rows);
    },
  },
  {
    keys: ["seguran", "crime", "homic", "roubo", "furto", "violen", "policia", "assassin", "criminal"],
    run: async (sb) => {
      const { data } = await sb.from("seguranca_indicadores").select("ano, indicador, ocorrencias, vitimas").eq("municipio", "Piracanjuba").order("ano", { ascending: false }).limit(40);
      return fmtList("Segurança pública (SINESP/SSP-GO)", (data || []).map((s) => `- ${s.indicador} (${s.ano}): ${s.ocorrencias ?? "?"} ocorrências, ${s.vitimas ?? "?"} vítimas`));
    },
  },
  {
    keys: [
      "beneficio",
      "bolsa familia",
      "bpc",
      "garantia safra",
      "garantia-safra",
      "peti",
      "seguro defeso",
      "seguro-defeso",
      "tarifa social",
      "luz social",
      "auxilio",
      "cadunico",
      "programa social",
      "assistencia",
      "cras",
    ],
    run: async (sb) => {
      const { data } = await sb
        .from("v_beneficios_sociais_canonicos")
        .select("programa, competencia, beneficiarios, valor_pago, natureza_dado, fonte_nome")
        .eq("municipio_ibge", "5217104")
        .order("competencia", { ascending: false })
        .limit(60);
      const rows = buildBenefitContextRows(data || []);
      return fmtList("Benefícios sociais", rows);
    },
  },
  {
    keys: ["arrecada", "imposto", "iptu", "iss", "tributo", "receita propria"],
    run: async (sb) => {
      const { data } = await sb.from("arrecadacao_municipal").select("tipo, categoria, valor, competencia, ano").order("ano", { ascending: false }).limit(25);
      return fmtList("Arrecadação municipal", (data || []).map((a) => `- [${a.tipo}] ${a.categoria}: ${cur(a.valor)} (${a.competencia || a.ano})`));
    },
  },
  {
    keys: ["agro", "agricultura", "pecuaria", "rebanho", "plantac", "soja", "milho", "leite", "gado", "producao rural", "lavoura", "safra"],
    run: async (sb) => {
      const { data } = await sb.from("agro_indicadores").select("categoria, chave, valor_texto, ano_referencia").not("categoria", "like", "historico%").limit(30);
      return fmtList("Agropecuária (IBGE)", (data || []).map((a) => `- [${a.categoria}] ${a.chave}: ${a.valor_texto} (${a.ano_referencia})`));
    },
  },
  {
    keys: ["emenda", "deputado", "senador", "verba parlamentar"],
    run: async (sb) => {
      const { data } = await sb.from("emendas_parlamentares").select("parlamentar_nome, objeto, valor_empenhado, valor_pago, ano").order("ano", { ascending: false }).limit(15);
      return fmtList("Emendas parlamentares", (data || []).map((e) => `- ${e.parlamentar_nome} (${e.ano}): ${trunc(e.objeto, 70)} - empenhado ${cur(e.valor_empenhado)}, pago ${cur(e.valor_pago)}`));
    },
  },
  {
    keys: ["transferencia", "repasse", "uniao", "federal", "convenio"],
    run: async (sb) => {
      const { data } = await sb.from("transferencias_federais").select("tipo, orgao_concedente, objeto, valor_total, valor_liberado, ano").order("ano", { ascending: false }).limit(15);
      return fmtList("Transferências federais", (data || []).map((t) => `- ${t.tipo}${t.orgao_concedente ? ` (${t.orgao_concedente})` : ""} ${t.ano}: ${trunc(t.objeto, 60)} - total ${cur(t.valor_total)}, liberado ${cur(t.valor_liberado)}`));
    },
  },
  {
    keys: ["economia", "selic", "ipca", "inflac", "cambio", "dolar", "pib", "emprego", "caged", "salario minimo", "juros"],
    run: async (sb) => {
      const { data } = await sb.from("economia_indicadores").select("categoria, indicador, ano, mes, valor_texto, valor").order("ano", { ascending: false }).limit(20);
      return fmtList("Indicadores econômicos", (data || []).map((e) => `- [${e.categoria}] ${e.indicador}: ${e.valor_texto ?? e.valor} (${e.mes ? `${e.mes}/` : ""}${e.ano})`));
    },
  },
  {
    keys: ["infraestrutura", "saneamento", "esgoto", "agua", "iluminac", "energia eletrica", "internet"],
    run: async (sb) => {
      const { data } = await sb.from("infraestrutura_indicadores").select("categoria, indicador, valor_texto, ano").order("ano", { ascending: false }).limit(20);
      return fmtList("Infraestrutura", (data || []).map((i) => `- [${i.categoria}] ${i.indicador}: ${i.valor_texto} (${i.ano})`));
    },
  },
  {
    keys: ["tcm", "tribunal de contas", "apontamento", "irregularidade", "conta rejeitada", "auditoria"],
    run: async (sb) => {
      const { data } = await sb.from("tcm_go_apontamentos").select("numero_processo, ano, orgao_alvo, tipo, status, ementa, ementa_resumo_ia, valor_envolvido").order("data_publicacao", { ascending: false }).limit(12);
      return fmtList("Apontamentos do TCM-GO", (data || []).map((t) => `- ${t.tipo || "Processo"} ${t.numero_processo || ""} (${t.ano}, ${t.status || ""}) sobre ${t.orgao_alvo || "município"}: ${trunc(t.ementa_resumo_ia || t.ementa, 110)}${t.valor_envolvido ? ` - ${cur(t.valor_envolvido)}` : ""}`));
    },
  },
  {
    keys: ["ministerio publico", "mp-go", "mpgo", "promotoria", "acao civil", "improbidade", "promotor"],
    run: async (sb) => {
      const { data } = await sb.from("mpgo_atuacao").select("tipo, promotoria, ementa, ementa_resumo_ia, data_publicacao").order("data_publicacao", { ascending: false }).limit(12);
      return fmtList("Atuação do Ministério Público (MP-GO)", (data || []).map((m) => `- ${m.tipo || "Atuação"} (${m.promotoria || ""}, ${m.data_publicacao || ""}): ${trunc(m.ementa_resumo_ia || m.ementa, 120)}`));
    },
  },
  {
    keys: ["processo", "judicial", "justica", "reu", "condenado", "tjgo", "acao judicial", "sentenca"],
    run: async (sb) => {
      const { data } = await sb.from("processo_judicial").select("numero_processo, tribunal, classe, assunto, status, objeto_resumo, resumo_ia, pessoa_publica_id").eq("visivel_publico", true).order("data_ultima_movimentacao", { ascending: false }).limit(12);
      if (!data?.length) return null;
      const ids = [...new Set(data.map((p) => p.pessoa_publica_id).filter(Boolean))] as string[];
      const pp = ids.length ? (await sb.from("pessoa_publica").select("id, nome_publico, nome").in("id", ids)).data : [];
      const nm = new Map((pp || []).map((p) => [p.id, p.nome_publico || p.nome]));
      return fmtList(
        "Processos judiciais de agentes públicos (apenas os marcados como públicos)",
        data.map((p) => `- ${nm.get(p.pessoa_publica_id) || "Agente público"}: ${p.classe || ""}${p.assunto ? ` (${p.assunto})` : ""} no ${p.tribunal || ""} - ${p.status || ""}: ${trunc(p.resumo_ia || p.objeto_resumo, 100)}`),
      );
    },
  },
  {
    keys: ["duodecimo", "orcamento da camara", "custo da camara", "quanto custa a camara", "orcamento camara"],
    run: async (sb) => {
      const { data } = await sb.from("camara_orcamento").select("ano, dotacao, liquidada, periodo_referencia").order("ano", { ascending: false }).limit(6);
      return fmtList("Orçamento da Câmara (duodécimo)", (data || []).map((o) => `- ${o.ano}${o.periodo_referencia && o.periodo_referencia < 6 ? " (parcial)" : ""}: orçado ${cur(o.dotacao)}, executado ${cur(o.liquidada)}`));
    },
  },
  {
    keys: ["doador", "doacao", "financiad", "campanha", "quem financiou", "financiamento"],
    run: async (sb) => {
      const { data } = await sb.from("tse_doador_campanha").select("nome_candidato, ds_cargo, nome_doador, vr_receita, ano_eleicao").order("vr_receita", { ascending: false }).limit(25);
      return fmtList("Doadores de campanha (TSE 2024)", (data || []).map((d) => `- ${d.nome_candidato} (${d.ds_cargo}) recebeu ${cur(d.vr_receita)} de ${d.nome_doador} (${d.ano_eleicao})`));
    },
  },
  {
    keys: ["noticia", "aconteceu", "ultimas", "novidade", "acontecendo", "imprensa"],
    run: async (sb) => {
      const { data } = await sb.from("noticias").select("title, source, pub_date").order("pub_date", { ascending: false }).limit(12);
      return fmtList("Notícias recentes sobre Piracanjuba", (data || []).map((n) => `- ${n.title} (${n.source || ""}${n.pub_date ? `, ${String(n.pub_date).slice(0, 10)}` : ""})`));
    },
  },
  {
    keys: ["sanciona", "sancao", "inidonea", "ceis", "cnep", "impedida de contratar", "empresa punida", "empresa irregular"],
    run: async (sb) => {
      const { data } = await sb.from("empresa_sancionada").select("nome, cnpj, tipo_sancao, data_inicio_sancao, orgao_sancionador").order("data_inicio_sancao", { ascending: false }).limit(15);
      return fmtList("Empresas sancionadas (CEIS/CNEP)", (data || []).map((e) => `- ${e.nome} (CNPJ ${e.cnpj || "N/D"}): ${e.tipo_sancao || ""} por ${e.orgao_sancionador || ""}${e.data_inicio_sancao ? ` desde ${e.data_inicio_sancao}` : ""}`));
    },
  },
];

async function buildContext(sb: SB, pergunta: string): Promise<string> {
  const q = norm(pergunta);
  const core = await coreContext(sb);
  const matched = DOMAINS.filter((d) => d.keys.some((k) => q.includes(k))).slice(0, MAX_DOMAINS);
  const extra = (await Promise.all(matched.map((d) => d.run(sb).catch(() => null)))).filter((b): b is string => !!b);
  return [...core, ...extra].join("\n\n");
}

const PLATFORM = `O Piracanjuba.ai é um portal independente (da Ferro Labs, sem vínculo com órgão público) que reúne dados públicos de Piracanjuba, Goiás. Seções: Câmara (vereadores, projetos de lei, atuação, indicações, presença em sessões, contratos, despesas, diárias, orçamento/duodécimo, licitações), Prefeitura (secretarias, servidores e salários, contratos, despesas, licitações, obras, decretos, portarias, leis, lei orgânica, diárias, veículos, TCM-GO), e ainda Saúde, Educação, Segurança, Benefícios sociais, Arrecadação, Economia, Agro, Emendas, Transferências federais, MP-GO, Processos, Notícias. Fontes oficiais: Portal da Transparência municipal, Câmara, IBGE, DataSUS, INEP, SINESP/SSP-GO, Tesouro Nacional, TCM-GO, MP-GO, TSE.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const pergunta = typeof body.question === "string" ? body.question.trim() : "";
    if (pergunta.length < 2) return jsonError("Faça uma pergunta.", 400);
    if (pergunta.length > MAX_PERGUNTA) return jsonError("Pergunta muito longa (máx. 500 caracteres).", 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Rate limit por IP (janela de 60s) + log de uso.
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "0.0.0.0";
    const ipHash = await hashIp(ip);
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await sb
      .from("chatbot_consultas")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);
    if ((count ?? 0) >= RATE_MAX_PER_MIN) {
      return jsonError("Muitas perguntas em pouco tempo. Aguarde um minuto.", 429);
    }
    await sb.from("chatbot_consultas").insert({ ip_hash: ipHash, pergunta });

    const contexto = maskCpf(await buildContext(sb, pergunta));

    const systemPrompt = `Você é o assistente do Piracanjuba.ai, portal independente de transparência pública do município de Piracanjuba, Goiás, Brasil.

${PLATFORM}

Regras:
- Responda APENAS com base nos dados abaixo. Se a informação não estiver nos dados, diga com franqueza que ainda não tem esse dado no portal e indique a seção mais provável onde procurar.
- Seja conciso e use português simples. Use markdown leve (negrito e listas) quando ajudar. Prefira o ano/competência mais recente quando houver vários.
- Ao dar números, cite a origem (ex: "segundo o Portal da Transparência", "dados da Câmara", "IBGE", "DataSUS").
- NUNCA invente nomes, valores, datas ou documentos. Não exiba CPF. Não dê aconselhamento jurídico.
- Você não é órgão público. Para atos oficiais, oriente conferir a fonte.

## Dados disponíveis
${contexto}`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...sanitizeHistory(body.history),
      { role: "user" as const, content: pergunta },
    ];

    // Circuit breaker diário global (o rate limit por IP do chatbot já passou acima).
    const _g = await aiGuard(sb, req, "chatbot");
    if (!_g.allowed) return guardBlockedResponse(_g);

    // OpenRouter é o provider primário (Gemini direto satura no free-tier e devolve 429).
    // O modelo barato fica travado dentro de openrouterChat, sem fallback para modelo caro.
    const resp = hasOpenRouter()
      ? await openrouterChat({ messages, temperature: 0.3, stream: true })
      : await geminiChat({ model: MODELS.flashLite, messages, temperature: 0.3, stream: true });
    if (!resp.ok) {
      return geminiErrorToResponse(new GeminiUpstreamError(resp.status, await resp.text()));
    }
    return new Response(resp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Erro interno.", 500);
  }
});
