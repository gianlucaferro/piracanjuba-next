// Lógica pura do envio ao IndexNow do piracanjuba.ai: sem rede, sem disco e sem
// git, para ser testada em tests/indexnow.test.mjs. Quem busca os dados e envia é
// scripts/indexnow/submit.mjs. As escolhas de desenho estão no README.md desta pasta.

// Chave IndexNow do piracanjuba.ai. Não é segredo: o protocolo exige que ela fique
// publicada em https://piracanjuba.ai/<chave>.txt (public/<chave>.txt). O Bing
// aceitou esta chave para o piracanjuba.ai (api.indexnow.org respondeu 200 em
// 2026-11-17), então ela fica amarrada a este domínio.
export const INDEXNOW_KEY = "46a581837ee2463ea50d40b6895646bc";
export const SITE_HOST = "piracanjuba.ai";
export const SITE_ORIGIN = `https://${SITE_HOST}`;
export const KEY_LOCATION = `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`;
export const SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml`;
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
// Limite do protocolo: até 10.000 URLs por envio (indexnow.org/documentation).
export const MAX_URLS = 10_000;
// Um mesmo lastmod repetido em tantas URLs é a hora do build, não uma mudança real
// (achado IDX-06: 57 de 76 URLs com o mesmo instante do deploy).
export const BUILD_STAMP_MIN_REPEAT = 10;

const PAGE_FILE = /^page\.(tsx|ts|jsx|js|mdx)$/;
const APP_DIR = "src/app/";

// Arquivos de dados cujo conteúdo é o conteúdo da própria página: mudou o arquivo,
// a página mudou. O valor é a pasta da rota dentro de src/app. Os *Api.ts ficam de
// fora de propósito: são código de busca, como um componente compartilhado, e não
// o texto publicado. Arquivo de dados novo com página própria entra aqui.
export const DATA_FILE_ROUTES = Object.freeze({
  "src/data/horariosOnibus.ts": ["horarios-onibus"],
  "src/data/horariosOnibus-registros.json": ["horarios-onibus"],
  "src/data/plantaoFarmacias.ts": ["plantao-farmacias"],
  "src/data/naMidia.ts": ["na-midia"],
  "src/data/notaTransparencia.ts": ["nota-pba"],
  "src/data/paginaEmpresa.ts": ["anuncie"],
  "src/data/empresas.ts": ["[empresa]"],
  "src/data/empresas-slugs.ts": ["[empresa]"],
});

// --- Rotas do App Router -----------------------------------------------------

function parseSegment(part) {
  let match = part.match(/^\[\[\.\.\.([^\]]+)\]\]$/);
  if (match) return { kind: "optional-catchall", name: match[1] };
  match = part.match(/^\[\.\.\.([^\]]+)\]$/);
  if (match) return { kind: "catchall", name: match[1] };
  match = part.match(/^\[([^\]]+)\]$/);
  if (match) return { kind: "dynamic", name: match[1] };
  return { kind: "static", name: part };
}

// Pasta da rota (relativa a src/app, "" para a raiz) para a lista de segmentos da
// URL. Devolve null para o que não vira rota pública: pasta privada (_pasta),
// slot paralelo (@slot) e rota interceptada ((.)pasta). Grupo (pasta) some da URL.
export function parseRouteDir(dir) {
  const segments = [];
  for (const part of dir.split("/").filter(Boolean)) {
    if (/^\([^()]+\)$/.test(part) && !part.startsWith("(.")) continue;
    if (part.startsWith("_") || part.startsWith("@") || part.startsWith("(")) return null;
    segments.push(parseSegment(part));
  }
  return { dir, segments };
}

// Recebe caminhos do repositório (como "src/app/agro/page.tsx") e devolve as rotas
// que têm page, que são as únicas que viram URL.
export function buildRouteTable(repoFiles) {
  const routes = [];
  const seen = new Set();
  for (const file of repoFiles) {
    if (!file.startsWith(APP_DIR)) continue;
    const parts = file.slice(APP_DIR.length).split("/");
    const base = parts.pop();
    if (!PAGE_FILE.test(base)) continue;
    const dir = parts.join("/");
    if (seen.has(dir)) continue;
    const route = parseRouteDir(dir);
    if (!route) continue;
    seen.add(dir);
    routes.push(route);
  }
  return routes;
}

function decodeSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

// Peso de cada segmento na escolha da rota, como no Next: segmento fixo vence
// dinâmico, que vence catch-all, que vence catch-all opcional.
function rankRoute(segments, parts) {
  const rank = [];
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment.kind === "catchall" || segment.kind === "optional-catchall") {
      if (i !== segments.length - 1) return null;
      if (segment.kind === "catchall" && parts.length - i < 1) return null;
      rank.push(segment.kind === "catchall" ? 2 : 3);
      return rank;
    }
    if (i >= parts.length) return null;
    if (segment.kind === "static") {
      if (segment.name !== parts[i]) return null;
      rank.push(0);
    } else {
      rank.push(1);
    }
  }
  return segments.length === parts.length ? rank : null;
}

function compareRank(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

// Pasta da rota que atende o caminho da URL, ou null se nenhuma atende.
export function resolveRoute(pathname, routes) {
  const parts = pathname.split("/").filter(Boolean).map(decodeSegment);
  let best = null;
  for (const route of routes) {
    const rank = rankRoute(route.segments, parts);
    if (!rank) continue;
    if (!best || compareRank(rank, best.rank) < 0) best = { dir: route.dir, rank };
  }
  return best ? best.dir : null;
}

// --- Arquivos alterados para rotas -------------------------------------------

// Rota tocada diretamente por um arquivo alterado: a pasta de rota mais próxima
// que contém o arquivo. Na raiz de src/app só a própria page conta, porque layout,
// globals.css, sitemap e robots valem para o site inteiro. Componentes de
// src/components e libs de src/lib não disparam envio (ver README.md).
export function routeDirForChangedFile(file, routeDirs) {
  if (!file.startsWith(APP_DIR)) return null;
  const parts = file.slice(APP_DIR.length).split("/");
  const base = parts.pop();
  if (parts.length === 0) return PAGE_FILE.test(base) && routeDirs.has("") ? "" : null;
  while (parts.length > 0) {
    const dir = parts.join("/");
    if (routeDirs.has(dir)) return dir;
    parts.pop();
  }
  return null;
}

export function changedRouteDirs(changedFiles, routes) {
  const routeDirs = new Set(routes.map((route) => route.dir));
  const touched = new Set();
  for (const file of changedFiles) {
    const dir = routeDirForChangedFile(file, routeDirs);
    if (dir !== null) touched.add(dir);
    for (const dataDir of DATA_FILE_ROUTES[file] ?? []) {
      if (routeDirs.has(dataDir)) touched.add(dataDir);
    }
  }
  return touched;
}

// URLs do sitemap atendidas pelas rotas tocadas. Uma page dinâmica alterada (por
// exemplo camara/[aba]) leva todas as URLs que ela atende no sitemap.
export function urlsForRouteDirs(entries, dirs, routes) {
  if (dirs.size === 0) return [];
  const urls = [];
  for (const entry of entries) {
    const url = sameOriginUrl(entry.loc);
    if (!url) continue;
    const dir = resolveRoute(url.pathname, routes);
    if (dir !== null && dirs.has(dir)) urls.push(entry.loc);
  }
  return urls;
}

// --- Sitemap -------------------------------------------------------------------

function decodeXml(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function tagText(block, tag) {
  const match = block.match(new RegExp(`<${tag}>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*</${tag}>`));
  return match ? decodeXml(match[1].trim()) : null;
}

// Lê um <urlset> e devolve [{ loc, lastmod }]. Um índice de sitemaps não tem
// <url>, então volta vazio, e o envio automático não manda nada.
export function parseSitemap(xml) {
  const entries = [];
  for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = tagText(match[1], "loc");
    if (!loc) continue;
    entries.push({ loc, lastmod: tagText(match[1], "lastmod") });
  }
  return entries;
}

function sameOriginUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.origin !== SITE_ORIGIN || url.username || url.password) return null;
  return url;
}

// URLs cujo lastmod caiu depois da implantação anterior e até a atual. Um mesmo
// instante repetido em BUILD_STAMP_MIN_REPEAT URLs ou mais é tratado como hora do
// build e descartado, para não reenviar o site inteiro a cada deploy.
export function urlsChangedByLastmod(entries, { after, until, minRepeat = BUILD_STAMP_MIN_REPEAT }) {
  const afterMs = after.getTime();
  const untilMs = until.getTime();
  const times = entries.map((entry) => (entry.lastmod ? Date.parse(entry.lastmod) : Number.NaN));
  const counts = new Map();
  for (const time of times) {
    if (!Number.isNaN(time)) counts.set(time, (counts.get(time) ?? 0) + 1);
  }
  const buildStamps = new Set([...counts].filter(([, count]) => count >= minRepeat).map(([time]) => time));
  const urls = [];
  entries.forEach((entry, index) => {
    const time = times[index];
    if (Number.isNaN(time) || buildStamps.has(time)) return;
    if (time > afterMs && time <= untilMs) urls.push(entry.loc);
  });
  return {
    urls,
    buildStamps: [...buildStamps].map((time) => ({ lastmod: new Date(time).toISOString(), count: counts.get(time) })),
  };
}

// Junta as fontes, tira repetidas e respeita o limite do protocolo. Com o sitemap
// (envio automático), mantém só URLs do próprio site presentes nele; sem o sitemap
// (envio manual, já validado por parseManualUrls), não filtra.
export function selectUrls(sources, sitemapEntries = null) {
  const inSitemap = sitemapEntries ? new Set(sitemapEntries.map((entry) => entry.loc).filter((loc) => sameOriginUrl(loc))) : null;
  const chosen = [];
  const seen = new Set();
  const outside = [];
  for (const url of sources.flat()) {
    if (seen.has(url)) continue;
    seen.add(url);
    if (inSitemap && !inSitemap.has(url)) {
      outside.push(url);
      continue;
    }
    chosen.push(url);
  }
  return {
    urls: chosen.slice(0, MAX_URLS),
    outside,
    truncated: Math.max(0, chosen.length - MAX_URLS),
  };
}

// --- Envio manual ----------------------------------------------------------------

// Lê a lista do workflow_dispatch (separada por espaço, vírgula ou quebra de
// linha). Só aceita https://piracanjuba.ai/..., sem usuário, senha ou porta; o
// fragmento (#) é descartado porque não muda a página.
export function parseManualUrls(text) {
  const urls = [];
  const invalid = [];
  const seen = new Set();
  for (const raw of (text ?? "").split(/[\s,]+/).filter(Boolean)) {
    const url = sameOriginUrl(raw);
    if (!url || url.port) {
      invalid.push(raw);
      continue;
    }
    url.hash = "";
    const normalized = url.toString();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
  }
  return { urls, invalid };
}

// --- Protocolo -------------------------------------------------------------------

export function buildPayload(urls) {
  return { host: SITE_HOST, key: INDEXNOW_KEY, keyLocation: KEY_LOCATION, urlList: urls };
}

export function isIndexNowSuccess(status) {
  return status === 200 || status === 202;
}

// Significado dos códigos segundo indexnow.org/documentation, conferido em 2026-11-17.
export function describeIndexNowStatus(status) {
  const reasons = {
    200: "URLs recebidas",
    202: "URLs recebidas, validação da chave pendente",
    400: "requisição em formato inválido",
    403: "chave recusada (arquivo da chave ausente, conteúdo diferente ou chave amarrada a outro site)",
    422: "URLs fora do host ou chave fora do formato do protocolo",
    429: "excesso de requisições (o IndexNow trata como spam)",
  };
  return reasons[status] ?? "resposta inesperada";
}

// --- Implantações do GitHub ------------------------------------------------------

// Candidatas a implantação anterior: outras implantações criadas antes da atual,
// da mais recente para a mais antiga. Quem confere se cada uma deu certo é o
// submit.mjs, pelos status de cada uma.
export function candidatePreviousDeployments(deployments, current) {
  const currentMs = Date.parse(current.created_at);
  return deployments
    .filter((deployment) => String(deployment.id) !== String(current.id) && Date.parse(deployment.created_at) < currentMs)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function hasSuccessStatus(statuses) {
  return statuses.some((status) => status.state === "success");
}
