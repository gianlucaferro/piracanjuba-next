const target = process.argv[2] ?? "https://piracanjuba.ai";
const base = new URL(target);
if (base.protocol !== "https:" && base.hostname !== "127.0.0.1") throw new Error("Destino exige HTTPS.");
const routes = ["/", "/horarios-onibus", "/plantao-farmacias", "/prefeitura/servidores", "/camara/servidores", "/prefeitura/contratos", "/grupos-economicos", "/acompanhar", "/coleta-lixo", "/contatos", "/saude", "/educacao", "/clima", "/compra-e-venda", "/zap-pba", "/vereadores", "/sitemap.xml", "/robots.txt"];
let failures = 0;
for (const route of routes) {
  try {
    const response = await fetch(new URL(route, base), { signal: AbortSignal.timeout(30_000) });
    const final = new URL(response.url);
    if (final.origin !== base.origin || final.pathname.replace(/\/$/, "") !== route.replace(/\/$/, "")) throw new Error("Redirecionamento inesperado para outra rota ou origem");
    const text = await response.text();
    if (!response.ok || /Application error:|Internal Server Error|Vercel Authentication/.test(text) || (route !== "/robots.txt" && text.length < 100)) throw new Error(`HTTP ${response.status}, conteúdo inesperado`);
    console.log(`OK ${route}: ${response.status}`);
  } catch (error) { failures++; console.error(`FAIL ${route}: ${error.message}`); }
}
process.exitCode = failures ? 1 : 0;
