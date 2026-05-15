# scrape-centi — coleta por browser renderizado do portal LAI Centi

POC e (futuramente) scrapers de produção pros endpoints do portal
`https://acessoainformacao.piracanjuba.go.leg.br/` (NucleoGov SaaS) que
NÃO expõem dados via WP REST API.

**Background:** ver `docs/CODEX_CENTI_SCRAPING_STRATEGY.md` na raiz do repo
pra contexto técnico, alternativas avaliadas e revisão Codex.

## Estado atual

| Item | Status |
|---|---|
| POC gastos parlamentares | ✅ implementado (manual) |
| Workflow GitHub Actions | ✅ `scrape-centi-poc.yml` (`workflow_dispatch` only) |
| Ingest Edge Function | ⏸️ depende de POC validar primeiro |
| Schema banco | ⏸️ depende de POC mostrar estrutura real |
| Schedule cron | ⏸️ depende de POC validar |

## Rodando localmente

```bash
cd scripts/scrape-centi
npm install
npx playwright install chromium
npm run poc:gastos
```

Outputs em `out/`:
- `gastos-{ts}.png` — screenshot full page
- `gastos-{ts}.html` — HTML final renderizado
- `gastos-{ts}.txt` — `document.body.innerText`
- `gastos-{ts}.har` — network capture (XHR/fetch/assets)
- `gastos-{ts}.network.json` — lista filtrada de responses
- `gastos-{ts}.summary.json` — métricas de validação (success_criteria)

## Rodando no GitHub Actions

1. Repo → Actions → **scrape-centi-poc**
2. **Run workflow** → branch `main` → Run
3. Aguardar ~3-5 min
4. Baixar artifact `scrape-centi-poc-{run_id}` (retenção 7 dias)
5. Validar:
   - PNG mostra dados reais de gastos por vereador? OU
   - `summary.json` tem `success_criteria: true`?
   - `network.json` lista endpoints internos com `application/json`?

## Critérios de aceite (POC)

A POC é considerada **validada** se pelo menos um for verdadeiro:

- [ ] Screenshot mostra tabela de gastos com valores R$ por vereador
- [ ] `innertext` contém padrões `R$ X.XXX,XX` repetidos
- [ ] `network.json` tem responses `application/json` com payload > 1 KB
- [ ] `summary.json.success_criteria` é `true`

Se NÃO validar:
- Confirmar com Codex próximos passos (engenharia reversa do JS controller,
  acesso oficial via convênio Câmara, ou fallback caminho A deep-link)

## Princípios do código (orientações Codex)

1. **Playwright puro**, sem stealth-plugin
2. **Browser real** (`headless: true` ainda, mas Chromium completo)
3. **locale pt-BR + timezone Sao_Paulo + viewport 1366x768 fixo**
4. **`waitForLoadState("networkidle")` + espera defensiva 8s**
5. **Captura XHR via `page.on("response")`** — preferir camada de rede
6. **Sessão limpa por run** (sem persistência de cookies entre execuções)
7. **Não commitar dados brutos** no repo (artifacts retention 7 dias)

## Próximos passos (após POC validar)

1. Identificar endpoints XHR internos do Centi pelo `network.json`
2. Decidir: extrair via XHR direto (preferido) ou DOM scraping (fallback)
3. Schema final em `supabase/migrations/`
4. Edge function `ingest-centi-scrape` com auth HMAC via `CENTI_INGEST_SECRET`
5. Workflow de produção com schedule `37 7 5,10,15,20 * *`
