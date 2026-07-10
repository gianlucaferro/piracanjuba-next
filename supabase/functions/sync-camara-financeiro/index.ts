import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CENTI_API = "https://api.centi.com.br/portal";
const UF = "go";
const TENANT = "camarapiracanjuba";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function decodeHtmlEntities(str: string | null | undefined): string | null {
  if (!str) return null;
  return str
    .replace(/&#x([0-9A-Fa-f]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function toIsoDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const m = d.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.split("T")[0];
  return null;
}

function parseBrNumber(val: any): number | null {
  if (val == null) return null;
  if (typeof val === "number") return val;
  const s = String(val).trim();
  if (!s) return null;
  // Brazilian format: 1.234,56 → 1234.56
  const cleaned = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function safeParseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    let cleaned = text;
    // Remove $type, $id, $ref properties
    cleaned = cleaned.replace(/"\$(type|id|ref)"\s*:\s*"[^"]*"\s*,?\s*/g, "");
    // Fix trailing commas
    cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");
    cleaned = cleaned.replace(/,\s*,/g, ",");
    try {
      return JSON.parse(cleaned);
    } catch {
      // Fix unescaped quotes inside string values
      // Strategy: process each "Key": "Value" pair and escape inner quotes
      cleaned = cleaned.replace(
        /("(?:[^"\\]|\\.)*")\s*:\s*(")([\s\S]*?)(")\s*([,}\]])/g,
        (_match, key, _q1, val, _q2, tail) => {
          const escapedVal = val.replace(/"/g, '\\"');
          return `${key}: "${escapedVal}"${tail}`;
        }
      );
      try {
        return JSON.parse(cleaned);
      } catch (e3) {
        // Nuclear option: manually extract objects using bracket matching
        console.error("Parse attempt 3 failed, trying manual extraction:", (e3 as Error).message?.slice(0, 100));
        return manualExtractArray(text);
      }
    }
  }
}

function manualExtractArray(text: string): any[] | null {
  const results: any[] = [];
  // Find each top-level object by matching balanced braces
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        let obj = text.slice(start, i + 1);
        // Clean this individual object
        obj = obj.replace(/"\$(type|id|ref)"\s*:\s*"[^"]*"\s*,?\s*/g, "");
        obj = obj.replace(/,\s*([}\]])/g, "$1");
        obj = obj.replace(/,\s*,/g, ",");
        try {
          results.push(JSON.parse(obj));
        } catch {
          // Try to salvage by extracting key numeric/simple fields with regex
          const item: Record<string, any> = {};
          const numMatch = (key: string) => {
            const m = obj.match(new RegExp(`"${key}"\\s*:\\s*([\\d.]+)`));
            return m ? parseFloat(m[1]) : null;
          };
          const strMatch = (key: string) => {
            const m = obj.match(new RegExp(`"${key}"\\s*:\\s*"([^"]{0,200})"`));
            return m ? m[1] : null;
          };
          item.Id = numMatch("Id");
          item.Ano = numMatch("Ano");
          item.Valor = numMatch("Valor");
          item.Numero = strMatch("Numero") || strMatch("NumeroContrato");
          item.DataInicio = strMatch("DataInicio") || strMatch("DataPublicacao");
          item.DataFinal = strMatch("DataFinal") || strMatch("DataFim");
          item.Orgao = strMatch("Orgao");
          item.Credor = strMatch("Credor") || strMatch("NomeCredor") || strMatch("Fornecedor");
          // For Objeto, grab everything between "Objeto": " and the next property
          const objMatch = obj.match(/"Objeto"\s*:\s*"([\s\S]*?)(?:"\s*[,}])/);
          item.Objeto = objMatch ? objMatch[1].replace(/"/g, "'").slice(0, 500) : null;
          if (item.Id) results.push(item);
        }
        start = -1;
      }
    }
  }
  return results.length > 0 ? results : null;
}

async function centiPost(endpoint: string, body: Record<string, unknown>) {
  const resp = await fetch(`${CENTI_API}/${endpoint}/${UF}/${TENANT}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Centi ${endpoint} HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }
  const text = await resp.text();
  console.log(`Centi ${endpoint}: response length=${text.length}, first 100=${text.slice(0, 100)}`);
  const parsed = safeParseJson(text);
  if (parsed === null) throw new Error(`Centi ${endpoint}: unparseable response (len=${text.length})`);
  return parsed;
}

function extractItems(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data?.Data && Array.isArray(data.Data)) return data.Data;
  if (data?.Items && Array.isArray(data.Items)) return data.Items;
  if (data?.Result && Array.isArray(data.Result)) return data.Result;
  if (data?.Lista && Array.isArray(data.Lista)) return data.Lista;
  // Try first array property
  for (const key of Object.keys(data || {})) {
    if (Array.isArray(data[key]) && data[key].length > 0) return data[key];
  }
  return [];
}

// Monta a URL de download do PDF a partir do FileKey/FileName que a API Centi retorna
// (contratos em item.docs[], licitacoes em item.Documentos[] ou no topo do item).
// Prefere o doc de "contrato"/"edital"; senao o primeiro disponivel.
function buildDocUrl(item: any): string | null {
  const arr = item?.docs || item?.Documentos || [];
  const doc = Array.isArray(arr) && arr.length
    ? (arr.find((d: any) => /contrat|edital/i.test(`${d?.Descricao || ""} ${d?.FileName || ""}`)) || arr[0])
    : null;
  const key = doc?.FileKey || item?.FileKey;
  const name = doc?.FileName || item?.FileName;
  if (!key || !name) return null;
  return `https://camarapiracanjuba.centi.com.br/download/${key}/${name}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* empty body ok */ }
  const onlyContratos = body?.only === "contratos";
  const customYears: number[] | undefined = body?.years;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "camara-financeiro", status: "running", detalhes: {} })
    .select("id").single();
  const logId = log?.id;

  const errors: string[] = [];
  const counts = { licitacoes: 0, contratos: 0, receitas: 0, diarias: 0 };
  const currentYear = new Date().getFullYear();
  // Range completo 2013..ano atual pra licitacoes e contratos (era 2 e 5
  // anos hard-coded — perdia historico). Anos sem dados retornam vazio.
  const allYearsFin = Array.from({ length: currentYear - 2012 }, (_, i) => currentYear - i);
  const defaultYears = allYearsFin;
  const contractYears = customYears || allYearsFin;
  // Receitas/duodecimo: dado mensal de execucao orcamentaria. 4 anos recentes
  // cobrem a serie util sem inflar o tempo de execucao (12 meses x N anos).
  const receitaYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

  try {
    // === LICITAÇÕES ===
    if (!onlyContratos) {
    const ALL_MODALIDADES = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
    for (const ano of defaultYears) {
      try {
        await delay(500);
        const reqBody = {
          Ano: ano, IdOrgao: 3,
          ModalidadeLicitacao: ALL_MODALIDADES,
          Page: { Number: 1, Size: 500 },
        };
        console.log(`Lic request: ${JSON.stringify(reqBody)}`);
        const data = await centiPost("ListaLicitacao", reqBody);
        const items = extractItems(data);
        console.log(`Lic ano=${ano}: ${items.length} items`);
        for (const item of items) {
          const centiId = `lic-centi-${item.Id || item.id}-${ano}`;
          const modalidade = item.Modalidade || item.DescricaoModalidade || null;
          const numero = item.Numero || item.NumeroLicitacao || null;
          const objeto = (item.Descricao || item.Objeto || item.DescricaoMotivo || "").slice(0, 1000) || null;
          const situacao = item.Situacao || item.DescricaoSituacao || null;
          const dataAbertura = toIsoDate(item.DataPublicacao || item.DataAbertura || item.SessaoAbertura) || null;
          const { error } = await sb.from("camara_licitacoes").upsert({
            centi_id: centiId, ano, numero, modalidade, objeto, situacao,
            data_abertura: dataAbertura,
            valor_estimado: parseBrNumber(item.ValorEstimado || item.Valor),
            fonte_url: `https://camarapiracanjuba.centi.com.br/licitacoes`,
            documento_url: buildDocUrl(item),
          }, { onConflict: "centi_id" });
          if (error) errors.push(`Lic: ${error.message}`);
          else counts.licitacoes++;
        }
      } catch (e) { errors.push(`Lic ${ano}: ${(e as Error).message?.slice(0, 150)}`); }
    }
    } // end !onlyContratos

    // === CONTRATOS: apenas o documento_url ===
    // A ingestao dos contratos da Camara pertence ao sync-contratos-camara, que escreve na
    // tabela canonica `contrato_camara` (id REAL do portal, CNPJ, enriquecimento). Este bloco
    // mantinha uma 2a tabela (`camara_contratos`) com id sintetico ctr-{id}-{ano}, duplicando
    // a fonte e divergindo em credor/objeto. O unico dado exclusivo deste endpoint e o link do
    // documento (GetContratoPortal expoe `docs`; contratos_cnt/listar nao). Entao agora ele so
    // enriquece o documento_url da canonica. O `Id` daqui e o proprio centi_id do portal.
    for (const ano of contractYears) {
      try {
        await delay(1000);
        const data = await centiPost("GetContratoPortal", { Ano: ano, IdOrgao: 3 });
        const items = extractItems(data);
        for (const item of items) {
          const portalId = Number(item.Id ?? item.id);
          const docUrl = buildDocUrl(item);
          if (!Number.isFinite(portalId) || !docUrl) continue;
          const { error } = await sb
            .from("contrato_camara")
            .update({ documento_url: docUrl })
            .eq("centi_id", portalId);
          if (error) errors.push(`Ctr doc: ${error.message}`);
          else counts.contratos++;
        }
      } catch (e) { errors.push(`Contratos ${ano}: ${(e as Error).message?.slice(0, 100)}`); }
    }

    if (!onlyContratos) {
    // === RECEITAS / DUODÉCIMO ===
    for (const ano of receitaYears) {
      for (let mes = 1; mes <= 12; mes++) {
        try {
          await delay(300);
          // API exige o campo "Orgao" (nao "IdOrgao", que retorna erro de campo obrigatorio).
          const data = await centiPost("GetReceita", { Ano: ano, Mes: mes, Orgao: 3 });
          const items = extractItems(data);
          if (items.length > 0) {
            // A API devolve a arvore de receita (RECEITAS CORRENTES -> sub-elementos).
            // Somar so os totais de nivel 1 ("X.0.0.0.00.0.0") evita dobrar pai + filhos.
            const topo = items.filter((i: any) => /^\d+(\.0+){6}$/.test(String(i.CodigoElemento || "")));
            const base = topo.length ? topo : items;
            const totalPrevisto = base.reduce((s: number, i: any) => s + (i.ValorOrcado || i.ValorPrevisto || 0), 0);
            const totalArrecadado = base.reduce((s: number, i: any) => s + (i.ValoReceitaAcumuladoMes || i.ValorArrecadado || i.Valor || 0), 0);
            // A camara nao tem receita propria (vive de duodecimo) e a API retorna zeros.
            // So grava se houver valor real, pra nao poluir a aba com linhas R$ 0,00.
            if (totalPrevisto > 0 || totalArrecadado > 0) {
              const descricao = base.map((i: any) => i.DescricaoElemento || i.Descricao).filter(Boolean).join("; ").slice(0, 500) || `Receita ${mes}/${ano}`;
              const { error } = await sb.from("camara_receitas").upsert({
                ano, mes, descricao, valor_previsto: totalPrevisto || null, valor_arrecadado: totalArrecadado || null,
              }, { onConflict: "ano,mes" });
              if (error) errors.push(`Rec: ${error.message}`);
              else counts.receitas++;
            }
          }
        } catch { /* month may not have data */ }
      }
    }

    // === DIÁRIAS ===
    try {
      await delay(500);
      const now = new Date();
      // Endpoint getdiariasportal exige datas em ISO yyyy-MM-dd (nao DD/MM/YYYY).
      // Range ampliado: desde 2013 ate hoje.
      const startDate = `2013-01-01`;
      const endDate = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const data = await centiPost("getdiariasportal", {
        DataInicio: startDate, DataFim: endDate, IdOrgao: 3,
        Page: { Number: 1, Size: 200 },
      });
      const items = extractItems(data);
      for (const item of items) {
        const centiId = `dia-${item.Id || item.id || `${item.Credor}-${item.Data}`}`;
        const rawDate = item.Data || item.DataViagem || null;
        let isoDate: string | null = null;
        if (rawDate) {
          const m = rawDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (m) isoDate = `${m[3]}-${m[2]}-${m[1]}`;
          else isoDate = rawDate;
        }
        const { error } = await sb.from("camara_diarias").upsert({
          centi_id: centiId, data: isoDate,
          beneficiario: item.Credor || item.Nome || item.Servidor || item.Beneficiario || null,
          cargo: item.Cargo || item.Funcao || null,
          destino: item.Destino || item.CidadeDestino || null,
          motivo: item.Objetivo || item.Motivo || null,
          valor: item.Valor || item.ValorDiaria || null,
        }, { onConflict: "centi_id" });
        if (error) errors.push(`Dia: ${error.message}`);
        else counts.diarias++;
      }
    } catch (e) { errors.push(`Diárias: ${(e as Error).message}`); }
    } // end !onlyContratos

    const result = { counts, errors: errors.slice(0, 10) };
    if (logId) {
      await sb.from("sync_log").update({
        status: errors.length > 0 ? "partial" : "success",
        detalhes: result, finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro:", error);
    if (logId) {
      await sb.from("sync_log").update({
        status: "error", detalhes: { error: (error as Error).message, errors, counts },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: (error as Error).message, counts }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
