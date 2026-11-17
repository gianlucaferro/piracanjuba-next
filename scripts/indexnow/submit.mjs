// Avisa o IndexNow (Bing, Yandex e demais participantes) sobre as URLs do
// piracanjuba.ai que mudaram na implantação de produção. Roda no job indexnow do
// workflow Production smoke, depois que o job smoke passa, e também pelo
// workflow_dispatch. Desenho, limites e como simular: scripts/indexnow/README.md.
//
// Variáveis de ambiente (o workflow preenche):
//   GITHUB_TOKEN, GITHUB_REPOSITORY    leitura das implantações (deployments: read)
//   INDEXNOW_DEPLOYMENT_ID, _SHA, _CREATED_AT   implantação atual (evento deployment_status)
//   INDEXNOW_MANUAL_URLS               lista do workflow_dispatch; vazia = cálculo automático
//   INDEXNOW_DRY_RUN=true              só mostra o que seria enviado
//
// Código de saída 1 deixa o job indexnow vermelho (o job smoke não depende dele).
// Para repetir o envio da mesma implantação, "Re-run failed jobs" na execução
// original recalcula a mesma janela. 5xx e erro de rede têm até duas novas
// tentativas curtas (withRetry); 429 e demais 4xx não se repetem.
import { execFileSync } from "node:child_process";
import {
  INDEXNOW_ENDPOINT,
  KEY_LOCATION,
  SITEMAP_URL,
  buildPayload,
  buildRouteTable,
  candidatePreviousDeployments,
  changedRouteDirs,
  describeIndexNowStatus,
  hasSuccessStatus,
  isIndexNowSuccess,
  keyFileProblem,
  missingDynamicRoutes,
  parseManualUrls,
  parseSitemap,
  selectUrls,
  urlsChangedByLastmod,
  urlsForRouteDirs,
  withRetry,
} from "./indexnow-lib.mjs";

const env = process.env;
const dryRun = env.INDEXNOW_DRY_RUN === "true";
const USER_AGENT = "piracanjuba-indexnow (GitHub Actions)";
const SHA = /^[0-9a-f]{40}$/;
const MAX_DEPLOYMENT_PAGES = 3;

function notice(message) {
  console.log(`::notice title=IndexNow::${message}`);
}

function warning(message) {
  console.log(`::warning title=IndexNow::${message}`);
}

// fetch com novas tentativas para 5xx e erro de rede (ver withRetry). O prazo
// (AbortSignal.timeout) é novo a cada tentativa: um sinal já esgotado abortaria
// a tentativa seguinte na hora.
function fetchWithRetry(label, url, init, timeoutMs) {
  return withRetry(() => fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) }), {
    onRetry: ({ attempt, reason, delayMs }) =>
      console.log(`${label}: tentativa ${attempt} falhou (${reason}); nova tentativa em ${delayMs / 1000} s.`),
  });
}

async function github(path) {
  const repository = env.GITHUB_REPOSITORY;
  if (!repository || !env.GITHUB_TOKEN) throw new Error("GITHUB_REPOSITORY e GITHUB_TOKEN são obrigatórios no modo automático.");
  const response = await fetchWithRetry(
    `API do GitHub ${path}`,
    `https://api.github.com/repos/${repository}${path}`,
    { headers: { accept: "application/vnd.github+json", authorization: `Bearer ${env.GITHUB_TOKEN}`, "user-agent": USER_AGENT } },
    20_000,
  );
  if (!response.ok) throw new Error(`API do GitHub respondeu HTTP ${response.status} em ${path}`);
  return response.json();
}

async function listProductionDeployments() {
  const all = [];
  for (let page = 1; page <= MAX_DEPLOYMENT_PAGES; page++) {
    const batch = await github(`/deployments?environment=Production&per_page=30&page=${page}`);
    all.push(...batch);
    if (batch.length < 30) break;
  }
  return all;
}

async function succeeded(deployment) {
  return hasSuccessStatus(await github(`/deployments/${deployment.id}/statuses?per_page=100`));
}

async function firstSuccessful(candidates) {
  for (const candidate of candidates) {
    if (await succeeded(candidate)) return candidate;
  }
  return null;
}

// Implantação atual: a do evento (também num re-run, que reaproveita o payload
// original) ou, no workflow_dispatch sem URLs, a última de produção bem-sucedida.
// Por isso o dispatch vazio só refaz o envio da implantação mais recente; para
// uma mais antiga, o caminho é "Re-run failed jobs" na execução original.
async function currentDeployment(deployments) {
  if (env.INDEXNOW_DEPLOYMENT_ID) {
    const fromEvent = { id: env.INDEXNOW_DEPLOYMENT_ID, sha: env.INDEXNOW_DEPLOYMENT_SHA, created_at: env.INDEXNOW_DEPLOYMENT_CREATED_AT };
    if (fromEvent.sha && fromEvent.created_at) return fromEvent;
    return github(`/deployments/${env.INDEXNOW_DEPLOYMENT_ID}`);
  }
  const sorted = [...deployments].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return firstSuccessful(sorted);
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
}

function hasCommit(sha) {
  if (!SHA.test(sha ?? "")) return false;
  try {
    git(["cat-file", "-e", `${sha}^{commit}`]);
    return true;
  } catch {
    try {
      git(["fetch", "--no-tags", "--depth=1", "origin", sha]);
      git(["cat-file", "-e", `${sha}^{commit}`]);
      return true;
    } catch {
      return false;
    }
  }
}

// Leitura comum (o sitemap): segue redirecionamento, que aqui não traz risco.
async function fetchText(url) {
  const response = await fetchWithRetry(url, url, { headers: { "user-agent": USER_AGENT } }, 30_000);
  if (!response.ok) throw new Error(`${url} respondeu HTTP ${response.status}`);
  return response.text();
}

// Arquivo da chave: sem seguir redirecionamento, porque o IndexNow valida o
// keyLocation do payload, que precisa responder 200 na URL exata.
async function checkPublishedKey() {
  const response = await fetchWithRetry(
    KEY_LOCATION,
    KEY_LOCATION,
    { headers: { "user-agent": USER_AGENT }, redirect: "manual" },
    30_000,
  );
  let body = "";
  if (response.status === 200) {
    body = await response.text();
  } else {
    try {
      await response.body?.cancel();
    } catch {
      // Sem corpo para liberar.
    }
  }
  const problem = keyFileProblem(response.status, body, response.headers.get("location"));
  if (problem) throw new Error(`${problem}; envio cancelado.`);
}

async function automaticUrls(entries) {
  const deployments = await listProductionDeployments();
  const current = await currentDeployment(deployments);
  if (!current) {
    notice("Nenhuma implantação de produção bem-sucedida encontrada; nada enviado.");
    return null;
  }
  console.log(`Implantação atual: ${current.id} (${String(current.sha).slice(0, 7)}, ${current.created_at}).`);
  const previous = await firstSuccessful(candidatePreviousDeployments(deployments, current));
  if (!previous) {
    notice("Sem implantação de produção anterior identificável; nada enviado (o site inteiro não é reenviado).");
    return null;
  }
  console.log(`Implantação anterior: ${previous.id} (${previous.sha.slice(0, 7)}, ${previous.created_at}).`);

  let fromFiles = [];
  if (hasCommit(current.sha) && hasCommit(previous.sha)) {
    const changed = git(["diff", "--name-only", "--no-renames", previous.sha, current.sha]).split("\n").filter(Boolean);
    const routes = buildRouteTable(git(["ls-tree", "-r", "--name-only", current.sha, "--", "src/app"]).split("\n").filter(Boolean));
    const dirs = changedRouteDirs(changed, routes);
    fromFiles = urlsForRouteDirs(entries, dirs, routes);
    console.log(`Arquivos alterados: ${changed.length}; rotas tocadas diretamente: ${[...dirs].map((dir) => `/${dir}`).join(", ") || "nenhuma"}.`);
  } else {
    warning("Commit de uma das implantações indisponível no checkout; seguem só as URLs com lastmod novo.");
  }

  const byLastmod = urlsChangedByLastmod(entries, { after: new Date(previous.created_at), until: new Date(current.created_at) });
  for (const stamp of byLastmod.buildStamps) {
    console.log(`lastmod ${stamp.lastmod} repetido em ${stamp.count} URLs tratado como hora do build e ignorado.`);
  }
  console.log(`URLs por arquivo alterado: ${fromFiles.length}; por lastmod novo: ${byLastmod.urls.length}.`);
  return [fromFiles, byLastmod.urls];
}

async function main() {
  const manual = (env.INDEXNOW_MANUAL_URLS ?? "").trim();
  let sources;
  let entries = [];
  if (manual) {
    const parsed = parseManualUrls(manual);
    if (parsed.invalid.length) {
      throw new Error(`URLs recusadas (só https://piracanjuba.ai/...): ${parsed.invalid.join(" ")}`);
    }
    sources = [parsed.urls];
    console.log(`Envio manual: ${parsed.urls.length} URL(s).`);
  } else {
    entries = parseSitemap(await fetchText(SITEMAP_URL));
    console.log(`Sitemap de produção: ${entries.length} URLs.`);
    // Sitemap parcial (banco fora do ar na geração) não serve para calcular a
    // janela: falhar aqui deixa o job vermelho, e o re-run da execução recalcula
    // a mesma janela quando o sitemap voltar completo.
    const missing = missingDynamicRoutes(entries);
    if (missing.length) {
      throw new Error(
        `Sitemap de produção sem nenhuma URL ${missing.map((prefix) => `${prefix}<slug>`).join(", ")}; provável falha do banco na geração do sitemap, que fica em cache por até 1 hora. Nada enviado. Depois que o sitemap voltar completo, use "Re-run failed jobs" nesta execução.`,
      );
    }
    sources = await automaticUrls(entries);
    if (!sources) return;
  }

  // No manual, o operador decide (pode avisar uma página removida); no automático,
  // nunca sai URL fora do sitemap atual.
  const selection = selectUrls(sources, manual ? null : entries);
  if (selection.outside.length) console.log(`Fora do sitemap atual, não enviadas: ${selection.outside.length}.`);
  if (selection.truncated) warning(`${selection.truncated} URL(s) acima do limite de 10.000 ficaram para o próximo envio.`);
  if (selection.urls.length === 0) {
    notice("Nenhuma URL alterada nesta implantação; nada enviado.");
    return;
  }
  console.log(`URLs a enviar (${selection.urls.length}):`);
  for (const url of selection.urls) console.log(`  ${url}`);

  if (dryRun) {
    notice(`Simulação: ${selection.urls.length} URL(s) seriam enviadas; nada foi enviado.`);
    return;
  }

  // A chave precisa estar publicada no keyLocation antes do envio; sem ela, o
  // IndexNow recusa com 403.
  await checkPublishedKey();

  const response = await fetchWithRetry(
    "IndexNow",
    INDEXNOW_ENDPOINT,
    {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8", "user-agent": USER_AGENT },
      body: JSON.stringify(buildPayload(selection.urls)),
    },
    30_000,
  );
  const body = (await response.text()).slice(0, 500);
  const reason = describeIndexNowStatus(response.status);
  if (!isIndexNowSuccess(response.status)) {
    throw new Error(`IndexNow respondeu HTTP ${response.status}: ${reason}.${body ? ` Corpo: ${body}` : ""}`);
  }
  notice(`IndexNow respondeu HTTP ${response.status} (${reason}) para ${selection.urls.length} URL(s).`);
}

main().catch((error) => {
  console.log(`::error title=IndexNow::${error.message}`);
  process.exitCode = 1;
});
