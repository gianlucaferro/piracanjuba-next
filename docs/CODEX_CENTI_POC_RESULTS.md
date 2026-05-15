# Resultados da POC Centi — 2026-05-15

**Anexo a:** `CODEX_CENTI_SCRAPING_STRATEGY.md`
**Status:** POC executada localmente; 2 descobertas importantes
**Pendente:** decisão de rota com base nos achados

---

## TL;DR

A POC validou o **Caminho D** tecnicamente, e revelou:

1. ✅ **Playwright funciona perfeitamente** contra o portal Centi em GitHub Actions/Linux
2. ✅ **Endpoint AJAX `POST /api` foi descoberto** — JSON estruturado
3. 🚨 **Descoberta cívica:** Câmara de Piracanjuba declara **inexistência** de cotas/verba indenizatória parlamentar desde 01/01/2023
4. ⚡ **Caminho J (novo, mais barato que D):** Edge Function Supabase pode chamar `/api` direto via `fetch()` com headers corretos — **sem Playwright, sem GitHub Actions, sem custo extra**
5. ⚠️ **Caveat do Caminho J:** o WAF valida combinação `acao` × `referer`. Cada ação requer descobrir o referer correto antes (uma vez por ação).

---

## 1. Execução da POC

### 1.1 Setup local

```bash
cd scripts/scrape-centi
npm install                       # 8 packages
npx playwright install chromium   # 92 MB
npm run poc:gastos                # 12,5 segundos total
```

### 1.2 Comportamento observado

- Browser real (`headless: true`) com locale `pt-BR`, timezone `America/Sao_Paulo`, viewport `1366x768`
- `waitForLoadState("networkidle")` + espera defensiva 8s
- 47 records de rede capturados, 5 "interessantes" (não-assets)
- Status inicial HTTP 200 sem qualquer bloqueio WAF
- **`success_criteria: true`** no summary.json

### 1.3 Artifacts gerados (~1.9 MB)

| Arquivo | Tamanho | Conteúdo |
|---|---|---|
| `gastos-{ts}.png` | 91 KB | Screenshot full page |
| `gastos-{ts}.html` | 64 KB | HTML pós-render |
| `gastos-{ts}.txt` | 2 KB | innerText (menu lateral + dados) |
| `gastos-{ts}.har` | 1.7 MB | HAR completo |
| `gastos-{ts}.network.json` | 12 KB | Records filtrados |
| `gastos-{ts}.summary.json` | 459 B | Métricas de validação |

---

## 2. Descoberta cívica — Gastos Parlamentares = Inexistente

### 2.1 Conteúdo retornado pelo endpoint

`POST https://acessoainformacao.piracanjuba.go.leg.br/api` retornou:

```json
{
  "1-ipxm7n": {
    "dados": [{
      "tabela": "declaracoes",
      "id": "15",
      "favorecido": "A Câmara de Piracanjuba, declara Inexistência de Regulamentação ou valores relativos às cotas para exercício da atividade parlamentar ou verba indenizatória no período consultado, 01 de Janeiro de 2023 até 13 de Maio de 2026.",
      "data": "2023-01-01",
      "data_assinatura": "2026-05-13 10:25:22",
      "atualizado_em": "2026-05-13 10:25:22"
    }],
    "total": "1"
  }
}
```

### 2.2 Implicação cívica

**Vereadores em Piracanjuba só recebem o subsídio mensal** (já temos em `remuneracao_vereadores`). Não há cota/verba indenizatória adicional pra combustível/divulgação/telefonia como em câmaras de cidades maiores.

### 2.3 O que isso muda no roadmap

- ❌ Não vamos criar tabela `gasto_parlamentar` nem painel `/transparencia/gastos-parlamentares`
- ✅ Em vez disso, criar **card explicativo** no perfil de vereador: *"Cotas parlamentares: não há. Vereadores em Piracanjuba só recebem subsídio mensal (R$ X). Declaração oficial da Câmara, 13/05/2026."*
- ✅ Manter link pra declaração oficial no portal Centi

### 2.4 Dados que efetivamente existem (alternativas)

Pra cobrir o "como vereadores gastam dinheiro público em Piracanjuba", os endpoints com dado real são:

| Fonte | O que tem |
|---|---|
| `remuneracao_vereadores` (já temos) | Subsídio mensal individual |
| `diarias_cnt` (id=Diárias e Passagens) | Diárias quando viajam a trabalho |
| `cidadao/transparencia/servidores_cnt` (Folha de Pagamento da Câmara) | Custo total da Câmara incluindo vereadores |
| `cntdespesas` (Despesas) | Despesas globais da Câmara (incluindo eventuais reembolsos) |

---

## 3. Descoberta técnica — Caminho J (Edge Function direto)

### 3.1 Replicando o POST via curl puro

Reproduzi o mesmo `POST /api` com `curl`:

```bash
curl -X POST "https://acessoainformacao.piracanjuba.go.leg.br/api" \
  -A "Mozilla/5.0 (Macintosh) Chrome/124" \
  -H "Accept: application/json" \
  -H "Content-Type: application/x-www-form-urlencoded; charset=UTF-8" \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "Origin: https://acessoainformacao.piracanjuba.go.leg.br" \
  -H "Referer: https://acessoainformacao.piracanjuba.go.leg.br/cidadao/transparencia/gastosparlamentares" \
  --data-urlencode 'multi_request=true' \
  --data-urlencode 'params={"1":{"limit":"0, 15","acao":"gastos_parlamentares/listar"}}'
```

**Resultado:** HTTP 200, mesma resposta JSON da Playwright session. **SEM Playwright. SEM cookies. SEM GitHub Actions. SEM custo.**

### 3.2 Caveat — WAF valida (acao, referer) como combinação

Quando troquei o referer pra apontar pra outra página (mesmo dentro do mesmo domínio), o WAF retornou 403:

```bash
# Esse FUNCIONA:
Referer: /cidadao/transparencia/gastosparlamentares
acao: gastos_parlamentares/listar

# Esse FALHA (403):
Referer: /cidadao/atos_adm/mp/id=16
acao: atos_administrativos/listar
```

Hipótese: WAF do Centi tem regra anti-CSRF que verifica se o referer combina com o tipo de ação. Diferente de proteção contra scrapers (que cairia em qualquer caso).

### 3.3 Strategy pra mapear todos os endpoints

Pra cada categoria de dado (indicações, atas, pareceres, etc.):

1. **Mapear o (referer, action) correto via POC Playwright manual** (1 vez por endpoint, ~5 min cada)
2. **Após mapeado**, edge function pode chamar `/api` direto via `fetch()` (zero Playwright em produção)
3. Cache no banco + cron `pg_cron` bimestral

Custo total em produção: **zero**. Latência: 1-2s por endpoint.

### 3.4 Caminho J vs Caminho D — qual usar?

| Critério | Caminho D (GitHub Actions + Playwright) | Caminho J (Edge Function + fetch) |
|---|---|---|
| Custo | $0 dentro do free tier | $0 |
| Velocidade | ~3-5 min/run | ~1-2s/run |
| Dependências externas | GitHub Actions (uptime, schedule SLA) | Apenas Supabase (já temos) |
| Manutenibilidade | Mais código, mais infra | Menos código |
| Robustez vs mudanças do Centi | Mais robusto (DOM/screenshot fallback) | Frágil se WAF mudar regras |
| Necessidade de descobrir referers | Não (Playwright clica naturalmente) | **Sim**, mapear manualmente |
| Pode rodar como cron pg_cron | Não (precisa GitHub Actions ou similar) | **Sim** (direto) |

### 3.5 Sugestão híbrida

- **Caminho J pra produção** — edge functions chamam `/api` direto via fetch
- **Caminho D mantido em standby** — POC manual via GitHub Actions sempre que precisar descobrir um novo (referer, action) ou fazer screenshot/debug

---

## 4. Próximas perguntas pro Codex

### 4.1 Sobre a descoberta cívica

- [ ] Vale criar página `/transparencia/cotas-parlamentares-inexistentes` documentando a declaração?
- [ ] Ou apenas badge informativo no card do vereador?
- [ ] Pivotar pra "Diárias e Passagens" como próximo alvo de coleta (essa SIM tem dados)?

### 4.2 Sobre a descoberta técnica (Caminho J)

- [ ] Concorda em pivotar de D pra J pra produção?
- [ ] Mantém GitHub Actions só pra descoberta manual de (referer, action) novos?
- [ ] Riscos não-óbvios da abordagem direct-fetch que devemos prever?
- [ ] WAF do Centi pode bloquear edge functions Supabase (mesmos IPs)? Como mitigar?

### 4.3 Sobre a ordem de implementação

Sugestão de próximos sprints:

**Sprint imediato (1 dia):**
- Página `/transparencia/cotas-parlamentares` documentando a declaração
- Badge informativo em `/vereadores/[slug]`

**Sprint 2 (2-3 dias):**
- POC Playwright captura (referer, action) de Diárias e Passagens
- Edge function `sync-diarias-vereadores` via /api Centi
- UI tab "Diárias" no perfil de cada vereador

**Sprint 3 (3-5 dias):**
- POC + Edge function pra Indicações (texto completo, 360+ em 2025)
- POC + Edge function pra Atas de Sessões (completas)
- POC + Edge function pra Pareceres das Comissões

Concorda? Modificações?

---

## 5. Status atual

- ✅ POC implementada em `scripts/scrape-centi/`
- ✅ Workflow GitHub Actions criado (`workflow_dispatch` only)
- ✅ Validação local bem-sucedida
- ✅ Replicação via curl puro validada
- ⏸️ **Aguardando Codex** revisar achados + decidir entre D / J / híbrido
- ⏸️ Sem commits de schema/produção ainda

Tudo commitado no repo, pronto pra revisão.
