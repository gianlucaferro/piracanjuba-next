import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const server = createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:4319");
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "*");
  response.setHeader("Access-Control-Expose-Headers", "Content-Range");
  response.setHeader("Content-Type", "application/json");
  if (request.method === "OPTIONS") { response.writeHead(204); response.end(); return; }
  if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405); response.end('{"error":"fixture read-only"}'); return; }
  let data = [];
  if (url.pathname === "/rest/v1/servidores") {
    // A fixture inclui mais de mil registros e órgãos distintos para detectar truncamento e mistura.
    const orgao = url.searchParams.get("orgao_tipo")?.replace("eq.", "");
    const organs = orgao ? [orgao] : ["prefeitura", "camara"];
    data = organs.flatMap((type) => Array.from({ length: type === "prefeitura" ? 1002 : 32 }, (_, i) => ({ id: `${type}-${i}`, nome: `${type === "prefeitura" ? "PREF" : "CAM"} Servidor ${String(i + 1).padStart(4, "0")}`, cargo: type === "prefeitura" ? "Professor" : "Assessor", orgao_tipo: type, secretaria_id: null, updated_at: "2026-11-03T12:00:00Z" })));
    const search = url.searchParams.get("nome")?.replace(/^ilike\./, "").replaceAll("%", "").toLowerCase();
    if (search) data = data.filter((row) => row.nome.toLowerCase().includes(search));
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
  const next = spawn(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "4318"], { cwd: root, stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:4319", NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-test-fixture", NEXT_TELEMETRY_DISABLED: "1" } });
  const stop = () => { next.kill("SIGTERM"); server.close(); };
  process.on("SIGTERM", stop); process.on("SIGINT", stop);
  next.on("exit", (code) => { server.close(); process.exitCode = code ?? 1; });
});
