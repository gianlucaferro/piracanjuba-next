import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { respostaFixtureBiodiversidade } from "../../tests/fixtures/biodiversidade-fixtures.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));

// Respostas fixas da API de Dados Abertos da Câmara dos Deputados para /emendas, no formato
// conferido em 2026-11-25. "INSTAVEL" simula a Câmara fora do ar para um autor.
const camaraDeputados = [
  { id: 220565, nome: "Delegada Adriana Accorsi", siglaPartido: "PT", siglaUf: "GO", idLegislatura: 57 },
  { id: 164359, nome: "Delegado Waldir", siglaPartido: "PSL", siglaUf: "GO", idLegislatura: 56 },
  { id: 164359, nome: "Delegado Waldir", siglaPartido: "UNIÃO", siglaUf: "GO", idLegislatura: 56 },
];
const camaraDetalhes = {
  220565: { nome: "Delegada Adriana Accorsi", siglaPartido: "PT", idLegislatura: 57, situacao: "Exercício" },
  164359: { nome: "Delegado Waldir", siglaPartido: "UNIÃO", idLegislatura: 56, situacao: "Fim de Mandato" },
};
const semAcento = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
function responderCamara(url, response) {
  const base = "https://dadosabertos.camara.leg.br/api/v2";
  const foto = (id) => `https://www.camara.leg.br/internet/deputado/bandep/${id}.jpg`;
  if (url.pathname === "/camara-api/v2/deputados") {
    const nome = semAcento(url.searchParams.get("nome") ?? "");
    if (nome.includes("INSTAVEL")) { response.writeHead(503); response.end('{"erro":"fixture indisponível"}'); return; }
    const legislaturas = url.searchParams.getAll("idLegislatura").map(Number);
    const dados = camaraDeputados
      .filter((d) => semAcento(d.nome).includes(nome) && legislaturas.includes(d.idLegislatura))
      .map((d) => ({ ...d, uri: `${base}/deputados/${d.id}`, uriPartido: `${base}/partidos/1`, urlFoto: foto(d.id), email: null }));
    response.end(JSON.stringify({ dados, links: [{ rel: "self", href: `${base}/deputados` }] }));
    return;
  }
  const id = Number(url.pathname.match(/^\/camara-api\/v2\/deputados\/(\d+)$/)?.[1]);
  const detalhe = camaraDetalhes[id];
  if (!detalhe) { response.writeHead(404); response.end('{"erro":"não encontrado"}'); return; }
  response.end(JSON.stringify({
    dados: {
      id, uri: `${base}/deputados/${id}`, nomeCivil: "NOME CIVIL FICTÍCIO", cpf: "00000000000",
      ultimoStatus: { id, nome: detalhe.nome, nomeEleitoral: detalhe.nome, siglaPartido: detalhe.siglaPartido, siglaUf: "GO", idLegislatura: detalhe.idLegislatura, urlFoto: foto(id), situacao: detalhe.situacao, condicaoEleitoral: "Titular", data: "2023-02-01" },
    },
    links: [{ rel: "self", href: `${base}/deputados/${id}` }],
  }));
}

const server = createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:4319");
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "*");
  response.setHeader("Access-Control-Expose-Headers", "Content-Range");
  response.setHeader("Content-Type", "application/json");
  if (request.method === "OPTIONS") { response.writeHead(204); response.end(); return; }
  if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405); response.end('{"error":"fixture read-only"}'); return; }
  // GBIF e iNaturalist da seção de biodiversidade de /meio-ambiente, sem rede.
  const biodiversidade = respostaFixtureBiodiversidade(url);
  if (biodiversidade) { response.writeHead(biodiversidade.status); response.end(request.method === "HEAD" ? undefined : JSON.stringify(biodiversidade.body)); return; }
  if (url.pathname.startsWith("/camara-api/v2/")) { responderCamara(url, response); return; }
  let data = [];
  if (url.pathname === "/rest/v1/emendas_parlamentares") {
    // Autores federais com perfil, sem perfil e com a Câmara instável, mais um estadual e uma transferência.
    const fonte = "https://portaldatransparencia.gov.br/emendas";
    data = [
      { id: "00000000-0000-4000-8000-000000000201", parlamentar_nome: "Adriana Accorsi (PT-GO)", parlamentar_esfera: "federal", valor_empenhado: 200000, valor_pago: 200000, objeto: "Emenda Individual - Assistência Farmacêutica Básica", ano: 2025, fonte_url: fonte, atualizado_em: "2026-03-01T05:05:28Z" },
      { id: "00000000-0000-4000-8000-000000000202", parlamentar_nome: "Adriana Accorsi (PT-GO)", parlamentar_esfera: "federal", valor_empenhado: 100000, valor_pago: 100000, objeto: "Emenda Individual - Equipamentos para CREAS", ano: 2023, fonte_url: fonte, atualizado_em: "2026-03-01T05:05:28Z" },
      { id: "00000000-0000-4000-8000-000000000203", parlamentar_nome: "Delegado Waldir (União-GO)", parlamentar_esfera: "federal", valor_empenhado: 150000, valor_pago: 150000, objeto: "Emenda Individual - Defesa Civil", ano: 2022, fonte_url: fonte, atualizado_em: "2026-03-01T05:05:28Z" },
      { id: "00000000-0000-4000-8000-000000000204", parlamentar_nome: "Fulano Inexistente (PL-GO)", parlamentar_esfera: "federal", valor_empenhado: 50000, valor_pago: 0, objeto: "Emenda Individual - Esporte", ano: 2025, fonte_url: fonte, atualizado_em: "2026-03-01T05:05:28Z" },
      { id: "00000000-0000-4000-8000-000000000205", parlamentar_nome: "Carlos Instavel (PL-GO)", parlamentar_esfera: "federal", valor_empenhado: 70000, valor_pago: 70000, objeto: "Emenda Individual - Cultura", ano: 2025, fonte_url: fonte, atualizado_em: "2026-03-01T05:05:28Z" },
      { id: "00000000-0000-4000-8000-000000000206", parlamentar_nome: "Amauri Ribeiro", parlamentar_esfera: "estadual", valor_empenhado: 90000, valor_pago: 90000, objeto: "Saúde - Custeio", ano: 2025, fonte_url: "https://dadosabertos.go.gov.br/dataset/emendas-parlamentares", atualizado_em: "2026-03-01T05:05:28Z" },
      { id: "00000000-0000-4000-8000-000000000207", parlamentar_nome: "Governo Federal (FPM)", parlamentar_esfera: "federal", valor_empenhado: 1000000, valor_pago: 1000000, objeto: "Transferência constitucional", ano: 2025, fonte_url: fonte, atualizado_em: "2026-03-01T05:05:28Z" },
    ];
    const ano = url.searchParams.get("ano");
    if (ano?.startsWith("eq.")) data = data.filter((row) => String(row.ano) === ano.slice(3));
  }
  if (url.pathname === "/rest/v1/servidores") {
    // A fixture inclui mais de mil registros e órgãos distintos para detectar truncamento e mistura.
    const orgao = url.searchParams.get("orgao_tipo")?.replace("eq.", "");
    const organs = orgao ? [orgao] : ["prefeitura", "camara"];
    data = organs.flatMap((type) => Array.from({ length: type === "prefeitura" ? 1002 : 32 }, (_, i) => ({ id: `${type}-${i}`, nome: `${type === "prefeitura" ? "PREF" : "CAM"} Servidor ${String(i + 1).padStart(4, "0")}`, cargo: type === "prefeitura" ? "Professor" : "Assessor", orgao_tipo: type, secretaria_id: null, updated_at: "2026-11-03T12:00:00Z" })));
    const search = url.searchParams.get("nome")?.replace(/^ilike\./, "").replaceAll("%", "").toLowerCase();
    if (search) data = data.filter((row) => row.nome.toLowerCase().includes(search));
  }
  if (url.pathname === "/rest/v1/remuneracao_servidores") {
    data = [
      ...Array.from({ length: 32 }, (_, i) => ({ id: `camara-mensal-${String(i).padStart(2, "0")}`, servidor_id: `camara-${i}`, competencia: "2026-10", tipo_folha: "MENSAL", bruto: 3000, servidores: { nome: `CAM Servidor ${String(i + 1).padStart(4, "0")}`, cargo: "Assessor", orgao_tipo: "camara" } })),
      { id: "camara-rescisao-00", servidor_id: "camara-0", competencia: "2026-11", tipo_folha: "RESCISÃO", bruto: 2407.68, servidores: { nome: "CAM Servidor 0001", cargo: "Assessor", orgao_tipo: "camara" } },
      // O registro municipal mais recente não pode definir a competência da Câmara.
      { id: "prefeitura-mensal-00", servidor_id: "prefeitura-0", competencia: "2026-12", tipo_folha: "MENSAL", bruto: 999999.99, servidores: { nome: "PREF Servidor 0001", cargo: "Professor", orgao_tipo: "prefeitura" } },
      { id: "prefeitura-mensal-anterior-00", servidor_id: "prefeitura-0", competencia: "2026-10", tipo_folha: "MENSAL", bruto: 3000, servidores: { nome: "PREF Servidor 0001", cargo: "Professor", orgao_tipo: "prefeitura" } },
    ];
    for (const column of ["servidores.orgao_tipo", "servidor_id", "competencia", "tipo_folha"]) {
      const filter = url.searchParams.get(column);
      if (!filter) continue;
      data = data.filter((row) => {
        const value = column === "servidores.orgao_tipo" ? row.servidores.orgao_tipo : row[column];
        if (filter.startsWith("eq.")) return value === filter.slice(3);
        if (filter.startsWith("lt.")) return value < filter.slice(3);
        if (filter.startsWith("ilike.")) return value.toLowerCase() === filter.slice(6).toLowerCase();
        if (filter.startsWith("in.(")) return filter.slice(4, -1).split(",").map((item) => item.replaceAll('"', "")).includes(value);
        return true;
      });
    }
  }
  if (url.pathname === "/rest/v1/prefeitura_folha_nucleogov") {
    // A projeção retorna somente metadados públicos dos órgãos, sem o payload de pessoas.
    data = [
      { chave: "cobertura-2026-10-44", ano: 2026, mes: 10, tipo_folha: "MENSAL", orgao_id: "44", orgao_nome: "FUNPREPI" },
      { chave: "cobertura-2026-12-44", ano: 2026, mes: 12, tipo_folha: "MENSAL", orgao_id: "44", orgao_nome: "FUNPREPI" },
    ];
    const periods = [...(url.searchParams.get("or") ?? "").matchAll(/and\(ano\.eq\.(\d+),mes\.eq\.(\d+)\)/g)];
    if (periods.length) data = data.filter((row) => periods.some((period) => row.ano === Number(period[1]) && row.mes === Number(period[2])));
    for (const column of ["ano", "mes", "tipo_folha"]) {
      const filter = url.searchParams.get(column);
      if (filter?.startsWith("eq.")) data = data.filter((row) => String(row[column]) === filter.slice(3));
      if (filter?.startsWith("ilike.")) data = data.filter((row) => String(row[column]).toLowerCase() === filter.slice(6).toLowerCase());
    }
  }
  if (url.pathname === "/rest/v1/inmet_clima_diario") {
    data = [
      { data: "2026-11-03", temperatura_media: null, temperatura_max: null, temperatura_min: null, precipitacao_mm: null, umidade_media: null, vento_velocidade_max: null },
      { data: "2026-11-02", temperatura_media: 25.4, temperatura_max: 30, temperatura_min: 20, precipitacao_mm: 12.3, umidade_media: 70, vento_velocidade_max: 10 },
      { data: "2026-11-01", temperatura_media: null, temperatura_max: null, temperatura_min: null, precipitacao_mm: null, umidade_media: null, vento_velocidade_max: null },
    ];
  }
  if (url.pathname === "/rest/v1/classificados") {
    data = [{ id: "00000000-0000-4000-8000-000000000099", titulo: "Bicicleta de teste", bairro: "Centro", categoria: "outros", nome: "Anunciante teste", descricao: "Anúncio fictício usado somente nos testes locais.", preco: 450, preco_tipo: "fixo", fotos: [], status: "ativo", created_at: "2026-11-03T12:00:00Z", updated_at: "2026-11-03T12:00:00Z", expira_em: "2099-12-31T00:00:00Z", whatsapp: "5564999999999", visualizacoes: 0, denuncias: 0, whatsapp_clicks: 0 }];
  }
  const idFilter = url.searchParams.get("id");
  if (idFilter?.startsWith("gt.")) data = data.filter((row) => row.id > idFilter.slice(3));
  const order = url.searchParams.get("order")?.split(",") ?? [];
  data.sort((left, right) => {
    for (const rule of order) {
      const [column, direction] = rule.split(".");
      const a = left[column], b = right[column];
      const compared = a === b ? 0 : a == null ? 1 : b == null ? -1 : a < b ? -1 : 1;
      if (compared) return direction === "desc" ? -compared : compared;
    }
    return 0;
  });
  const count = data.length;
  const start = Number(url.searchParams.get("offset") ?? 0);
  const limit = Math.min(1000, Number(url.searchParams.get("limit") ?? 1000));
  data = data.slice(start, start + limit);
  response.setHeader("Content-Range", count ? `${start}-${start + data.length - 1}/${count}` : "*/0");
  response.end(request.method === "HEAD" ? undefined : JSON.stringify(request.headers.accept?.includes("application/vnd.pgrst.object+json") ? (data[0] ?? null) : data));
});
server.listen(4319, "127.0.0.1", () => {
  const next = spawn(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "4318"], { cwd: root, stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:4319", NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-test-fixture", NEXT_TELEMETRY_DISABLED: "1", PIRACANJUBA_E2E: "1", CAMARA_API_BASE_URL: "http://127.0.0.1:4319/camara-api/v2" } });
  const stop = () => { next.kill("SIGTERM"); server.close(); };
  process.on("SIGTERM", stop); process.on("SIGINT", stop);
  next.on("exit", (code) => { server.close(); process.exitCode = code ?? 1; });
});
