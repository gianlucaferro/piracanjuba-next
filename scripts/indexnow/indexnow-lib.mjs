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

// Arquivos cujo conteúdo é o conteúdo publicado de páginas que a subida de pasta
// (routeDirForChangedFile) não alcança: mudou o arquivo, a página mudou. O valor é
// a lista de pastas de rota dentro de src/app. Entram aqui:
// - arquivos de dados de src/data com página própria (texto publicado);
// - helpers de src/app usados por uma page filha dinâmica, como os de
//   src/app/vereadores usados por vereadores/[slug]: a subida de pasta para na
//   page pai e não chega à filha. A subida continua valendo, então
//   tratamento.ts leva também /vereadores, que não o usa; o envio a mais é
//   inofensivo.
// Os *Api.ts ficam de fora de propósito: são código de busca, como um componente
// compartilhado, e não o texto publicado. Arquivo novo nesses casos entra aqui.
export const DATA_FILE_ROUTES = Object.freeze({
  "src/data/horariosOnibus.ts": ["horarios-onibus"],
  "src/data/horariosOnibus-registros.json": ["horarios-onibus"],
  "src/data/plantaoFarmacias.ts": ["plantao-farmacias"],
  "src/data/naMidia.ts": ["na-midia"],
  "src/data/notaTransparencia.ts": ["nota-pba"],
  "src/data/paginaEmpresa.ts": ["anuncie"],
  "src/data/empresas.ts": ["[empresa]"],
  "src/data/empresas-slugs.ts": ["[empresa]"],
  "src/data/hotel-via-sul.ts": ["hotel", "zap-pba"],
  "src/data/telefones.ts": ["contatos", "seguranca", "beneficios-sociais"],
  "src/app/vereadores/tratamento.ts": ["vereadores/[slug]"],
  "src/app/vereadores/remuneracao.ts": ["vereadores", "vereadores/[slug]"],
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

// Prefixos de rotas dinâmicas que sempre têm linhas no banco (a Câmara sempre tem
// vereadores). O src/app/sitemap.ts publica só as rotas fixas, com HTTP 200, quando
// a consulta ao Supabase falha, e esse sitemap fica em cache por até uma hora.
// Sem nenhuma URL desses prefixos, o sitemap saiu parcial e a janela da
// implantação não pode ser calculada com ele.
export const REQUIRED_DYNAMIC_PREFIXES = Object.freeze(["/vereadores/"]);

// Prefixos de REQUIRED_DYNAMIC_PREFIXES sem nenhuma URL do tipo <prefixo><slug>
// no sitemap. Lista vazia: o sitemap está completo para esse critério.
export function missingDynamicRoutes(entries, prefixes = REQUIRED_DYNAMIC_PREFIXES) {
  const pathnames = entries.map((entry) => sameOriginUrl(entry.loc)?.pathname).filter(Boolean);
  return prefixes.filter(
    (prefix) =>
      !pathnames.some((pathname) => {
        if (!pathname.startsWith(prefix)) return false;
        const rest = pathname.slice(prefix.length).replace(/\/$/, "");
        return rest.length > 0 && !rest.includes("/");
      }),
  );
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

// Folga do limite inferior da janela por lastmod. O src/app/sitemap.ts fica em
// cache por até 1 hora (revalidate = 3600), então o sitemap lido no envio da
// implantação anterior podia estar até 1 hora atrás do banco e não trazer as
// mudanças desse intervalo; sem folga, elas cairiam antes do limite inferior da
// janela seguinte e não sairiam em envio nenhum. 2 horas cobrem o cache com sobra
// (sitemap vencido servido enquanto se regenera, duração do build). O custo é
// reenviar as poucas URLs com lastmod real nessas 2 horas, que o envio anterior
// pode já ter mandado; a hora do build repetida continua descartada, então o site
// inteiro não volta.
export const LASTMOD_OVERLAP_MS = 2 * 60 * 60 * 1000;

// Janela do lastmod: da criação da implantação anterior, menos a folga, até a
// criação da atual.
export function lastmodWindow(previous, current, overlapMs = LASTMOD_OVERLAP_MS) {
  return { after: new Date(Date.parse(previous.created_at) - overlapMs), until: new Date(current.created_at) };
}

// URLs cujo lastmod caiu depois de after e até until (a janela de lastmodWindow).
// Um mesmo instante repetido em BUILD_STAMP_MIN_REPEAT URLs ou mais é tratado como
// hora do build e descartado, para não reenviar o site inteiro a cada deploy.
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

// Conferência do arquivo da chave antes do envio. O keyLocation do payload precisa
// responder 200 na URL exata, sem redirecionamento (o submit.mjs busca com
// redirect "manual"), e conter a chave. Devolve o motivo para cancelar, ou null.
// Status 0 é o redirecionamento opaco que o fetch pode devolver no modo manual.
export function keyFileProblem(status, body, location = null) {
  if (status === 0 || (status >= 300 && status < 400)) {
    const destino = location ? ` para ${location}` : "";
    return `${KEY_LOCATION} redireciona (HTTP ${status}${destino}); o keyLocation precisa responder 200 sem redirecionamento`;
  }
  if (status !== 200) return `${KEY_LOCATION} respondeu HTTP ${status}`;
  if (String(body ?? "").trim() !== INDEXNOW_KEY) return `${KEY_LOCATION} não contém a chave`;
  return null;
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

// Página da lista de implantações: 100 é o máximo da API. O limite de segurança
// (20 páginas, 2.000 implantações) interrompe a busca, e quem chama trata o limite
// como falha.
export const DEPLOYMENTS_PER_PAGE = 100;
export const MAX_DEPLOYMENT_PAGES = 20;

function newestFirst(deployments) {
  return [...deployments].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

// Busca, página a página e só até onde precisa, a primeira implantação que select
// deixa passar e que deu certo (succeeded). A API de deployments do GitHub lista da
// mais nova para a mais antiga; select ordena dentro da página (padrão: da mais
// nova para a mais antiga). fetchPage(n) devolve a página n, a partir de 1, com até
// perPage itens; página incompleta é a última. Devolve { deployment, limitReached }:
// deployment null com limitReached false quer dizer que a lista acabou sem achar;
// limitReached true quer dizer que maxPages páginas cheias foram lidas sem achar,
// e aí não dá para concluir que a implantação não existe.
export async function findSuccessfulDeployment({
  fetchPage,
  succeeded,
  select = newestFirst,
  perPage = DEPLOYMENTS_PER_PAGE,
  maxPages = MAX_DEPLOYMENT_PAGES,
}) {
  for (let page = 1; page <= maxPages; page++) {
    const batch = await fetchPage(page);
    for (const deployment of select(batch)) {
      if (await succeeded(deployment)) return { deployment, limitReached: false };
    }
    if (batch.length < perPage) return { deployment: null, limitReached: false };
  }
  return { deployment: null, limitReached: true };
}

// --- Novas tentativas --------------------------------------------------------------

// Espera antes de cada nova tentativa: até duas a mais, curtas, para caber no
// tempo do passo. Valem só para falha passageira (5xx e erro de rede).
export const RETRY_DELAYS_MS = Object.freeze([5_000, 15_000]);

// 5xx é falha do servidor e pode passar. 429 nunca é repetido: o IndexNow trata
// excesso de requisições como spam. Os demais 4xx são definitivos.
export function isRetryableStatus(status) {
  return status >= 500 && status <= 599;
}

// Erro de rede do fetch do Node ("fetch failed": DNS, conexão recusada ou
// derrubada antes da resposta; "terminated": conexão caiu no meio do corpo, depois
// dos cabeçalhos) ou tempo esgotado do AbortSignal.timeout, que também interrompe a
// leitura do corpo. Formatos conferidos no Node 26.7.0 em 2026-11-17.
export function isNetworkError(error) {
  if (!error || typeof error !== "object") return false;
  if (error.name === "TimeoutError") return true;
  return error.name === "TypeError" && (error.message === "fetch failed" || error.message === "terminated");
}

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Executa attempt() (uma chamada de fetch, ou fetch e leitura do corpo em
// readWithRetry) e repete com espera quando a resposta é
// 5xx ou quando o fetch lança erro de rede. Esgotadas as tentativas, devolve a
// última resposta ou lança o último erro, para quem chamou decidir. Qualquer outro
// erro sobe na hora. sleep e onRetry são injetáveis para o teste.
export async function withRetry(attempt, { delaysMs = RETRY_DELAYS_MS, sleep = sleepMs, onRetry = () => {} } = {}) {
  for (let index = 0; ; index++) {
    let reason;
    try {
      const response = await attempt();
      if (!isRetryableStatus(response.status) || index >= delaysMs.length) return response;
      reason = `HTTP ${response.status}`;
      // Libera a conexão da resposta descartada.
      try {
        await response.body?.cancel();
      } catch {
        // Corpo já consumido ou inexistente.
      }
    } catch (error) {
      if (!isNetworkError(error) || index >= delaysMs.length) throw error;
      reason = error.message;
    }
    onRetry({ attempt: index + 1, reason, delayMs: delaysMs[index] });
    await sleep(delaysMs[index]);
  }
}

// Leitura com novas tentativas: cada tentativa faz o fetch (doFetch, com prazo novo)
// e lê o corpo inteiro (readBody, padrão texto). O fetch resolve quando chegam os
// cabeçalhos, e o corpo pode cair ou estourar o prazo depois; com a leitura dentro
// da tentativa, essa falha também ganha as novas tentativas de withRetry, com a
// mesma regra de status (5xx sim, 429 e demais 4xx não). O corpo de um 5xx também é
// lido, o que libera a conexão antes da tentativa seguinte. Devolve
// { status, ok, headers, text }. Se a leitura do corpo falhar numa resposta que já é
// definitiva (fora de 2xx e de 5xx, como 429 e 404), o status vale e o texto fica
// vazio: a falha de leitura não pode transformar um 4xx em nova tentativa.
export function readWithRetry(doFetch, { readBody = (response) => response.text(), ...options } = {}) {
  return withRetry(async () => {
    const response = await doFetch();
    let text;
    try {
      text = await readBody(response);
    } catch (error) {
      if (!response.ok && !isRetryableStatus(response.status)) {
        return { status: response.status, ok: response.ok, headers: response.headers, text: "" };
      }
      throw error;
    }
    return { status: response.status, ok: response.ok, headers: response.headers, text };
  }, options);
}
