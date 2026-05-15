# Estratégia de coleta de dados do Centi pós-migração da Câmara

**Para:** Codex (revisão técnica)
**De:** Piracanjuba.AI (Gianluca + Claude)
**Data:** 2026-05-15
**Decisão pedida:** confirmar a estratégia mais eficiente e barata pra superar o WAF do Centi/NucleoGov sem custos novos recorrentes.

---

## 1. Contexto

### 1.1 O que mudou
A Câmara Municipal de Piracanjuba migrou em maio/2026 de:

- **Antigo:** `acessoainformacao.camaradepiracanjuba.go.gov.br` (WordPress próprio, fácil scraping)
- **Novo:** `piracanjuba.go.leg.br` (WordPress Interlegis) + portal LAI Centi em `acessoainformacao.piracanjuba.go.leg.br` (SPA Centi/NucleoGov com WAF)

O domínio antigo ficou parcialmente sequestrado (DNS redireciona pra "ABC Imóveis", cert SSL expirado) — disso já cuidamos (migração das URLs em 5 edge functions + atualização de `vereadores.fonte_url` + fotos rebaixadas via Wayback e hospedadas no Supabase Storage do Piracanjuba.AI).

### 1.2 Por que isso é problema só agora
Até maio/26 os dados de transparência (gastos parlamentares, atas detalhadas, indicações texto-completo etc.) eram acessíveis no WordPress legado em **páginas HTML simples**, scrapeáveis com `fetch + regex`. As edge functions Supabase `sync-projetos`, `sync-atuacao`, `sync-presenca-sessoes`, `sync-votacoes` funcionavam direto.

Na migração nova:
- Conteúdo **institucional** (vereadores, comissões, sessões, vídeos) ficou no WordPress novo, com **WP REST API** estruturada (`/wp-json/wp/v2/vereador`, etc) — **MELHOR** que antes, sem WAF.
- Conteúdo **de transparência granular** (gastos parlamentares, indicações com texto, pareceres, atos administrativos detalhados) saiu do WordPress e foi pro portal LAI **Centi**, que é uma SPA com WAF agressivo.

Resultado: alguns dados que tínhamos via fetch agora exigem renderização de JS + bypass de WAF.

---

## 2. Diagnóstico do bloqueio Centi

### 2.1 Comportamento observado

Testes feitos contra `https://acessoainformacao.piracanjuba.go.leg.br/cidadao/transparencia/gastosparlamentares`:

| Cliente | Resultado |
|---|---|
| WebFetch (LLM tool) | HTTP 403 |
| `curl` sem headers | HTTP 403 |
| `curl` com `User-Agent: Mozilla` simples | HTTP 200, mas só HTML esqueleto SPA (sem dados) |
| `curl` com headers Chrome completos (UA + Accept-Language + Accept-Encoding + Referer + Sec-Fetch-*) | HTTP 200, **HTML esqueleto SPA** (52 KB), mas sem dados de gastos |
| `curl` no JS controller específico `/res/js/cidadao/controller/gasto_parlamentar/gastos_parlamentares.js` | HTTP 403 (mesmo com headers Chrome) |
| `curl` em endpoints REST chutados (`/lista`, `/dados`, `/agentes`) | 403 / 404 |

### 2.2 Arquitetura do Centi

- Stack: **NucleoGov SaaS** (provedor de portais LAI pra prefeituras/câmaras GO). Subdomínio dedicado por cliente.
- Frontend: SPA carregada via `require.js` boot script
- HTML inicial: esqueleto + carrega `boot.js` (274 KB) → boot.js carrega `controllers/[modulo].js` → controller faz XHR JSON internos
- WAF: AWS ELB (`server: awselb/2.0`) na frente de tudo + provável WAF Cloudflare (404 personalizado nas tentativas)
- **Hipótese forte:** WAF do Centi tem regra que libera o boot inicial pra qualquer browser (UA + headers), mas só libera os JS de controller específicos pra requisições que tenham cookies de sessão válidos (gerados pelo boot.js executando no DOM real)

### 2.3 O que precisaria pra extrair dados
Pelos menos uma das três:

1. **Sessão de browser real:** cookies + execução JS → AJAX libera
2. **Engenharia reversa total:** ler o JS controller (precisa do 403 resolvido), descobrir os endpoints AJAX, replicar com Authorization headers/cookies
3. **API oficial do Centi:** existe um link no portal "Acesso automatizado (API)" → `https://acessoainformacao.piracanjuba.go.leg.br/cidadao/outras_informacoes/acesso_automatizado`. Provavelmente é documentação descritiva, não API REST aberta. **Precisa de credenciais** da Câmara (`Authorization: APIKey ...`).

A opção 3 seria ideal mas exige convênio formal com a Câmara — fora do alcance imediato.

---

## 3. Caminhos avaliados

### 3.1 Caminho A — Deep-link (sem coleta)

- **Como funciona:** botão no perfil do vereador → abre página oficial Centi com filtro
- **Custo:** $0
- **Esforço:** 1-2 h
- **Restrições:** Piracanjuba.AI não tem os dados pra fazer gráficos/rankings/cruzamentos
- **Veredicto:** funciona como fallback/MVP, mas não cumpre o objetivo de "transparência aumentada"

### 3.2 Caminho B — Apify (Browser scraping SaaS)

- **Como funciona:** Apify renderiza JS, bypassa WAF, retorna JSON estruturado. Já temos MCP configurado.
- **Custo Apify free tier:** $5 de créditos grátis no primeiro mês (~1.800 scrapes simples). **Depois:** $39/mês mínimo
- **Esforço:** 3-5 dias
- **Restrições:** custo recorrente após período free; latência ~30s/scrape
- **Veredicto:** rejeitado pelo critério "sem custos novos"

### 3.3 Caminho C — VPS dedicado com Puppeteer

- **Como funciona:** VPS roda servidor Express + Puppeteer; edge function Supabase chama via webhook
- **Custo:** $5-10/mês (VPS novo) OU $0 se aproveitar VPS Hetzner do Trasparenza
- **Esforço:** 5-7 dias
- **Restrições:** Trasparenza VPS já está dedicado, não pode misturar; VPS novo é custo recorrente
- **Veredicto:** rejeitado pelo critério "sem custos novos / sem usar VPS Trasparenza"

### 3.4 Caminho D — GitHub Actions com Playwright/Puppeteer ⭐ **PROPOSTO**

- **Como funciona:** workflow `.github/workflows/scrape-centi.yml` rodando em cron mensal. Runner GitHub-hosted (ubuntu-latest) executa script Node/Python com Playwright, scrapa dados, faz POST autenticado pra edge function Supabase ou commit JSON no repo.
- **Custo:** $0 dentro do free tier
  - Repos **públicos:** **runners ilimitados, ilimitado**
  - Repos **privados:** 2.000 minutos/mês free (1 scrape mensal = ~3 min → consome 0.15% da quota)
- **Esforço:** 2-3 dias
- **Confiabilidade:** alta — GitHub-hosted runners executam Chrome/Playwright nativo, sem WAF de Cloudflare bloqueando IP de runner GitHub (datacenter Azure)
- **Veredicto:** ✅ atende todos os critérios — sem custo, sem VPS novo, sem usar VPS Trasparenza

### 3.5 Caminho E — Cloudflare Workers Browser Rendering

- **Como funciona:** Cloudflare oferece serviço de browser rendering nativo no Workers (Puppeteer-compatible API). Cron triggers do CF Workers chamam endpoint, fazem scrape, salvam JSON.
- **Custo:** Free tier limita a 10 minutos de browser/dia. 1 scrape mensal cabe folgado.
- **Esforço:** 3-4 dias
- **Restrições:** API de Browser Rendering ainda em beta. Requires Workers Paid Plan ($5/mês) pra produção (mesmo com free tier de browser time).
- **Veredicto:** **inviável** — exige Workers Paid Plan ($5/mês mínimo)

### 3.6 Caminho F — Vercel Functions (existente)

- **Como funciona:** Vercel hospedará o Piracanjuba.AI já. Tem suporte a Playwright em **Edge Functions Pro** com `@sparticuz/chromium`. Cron pode disparar via API route.
- **Custo:** Vercel Hobby (plano gratuito) **NÃO permite Cron Jobs** com mais de 1 frequência/dia + limita Edge Function a 60s. Vercel Pro = $20/usuário/mês.
- **Restrições:** Hobby limita memória (1GB) e tempo (60s) — pra Playwright costuma estourar
- **Veredicto:** ✅ **viável só se Piracanjuba.AI já está em plano Pro**. **Inviável** se está em Hobby.

### 3.7 Caminho G — Supabase Edge Functions (Deno) com Playwright?

- **Status técnico:** **Não suportado.** Deno não tem suporte nativo a Playwright/Puppeteer em runtime Supabase Edge (limitação do isolate Deno).
- **Veredicto:** inviável tecnicamente

### 3.8 Caminho H — APIs alternativas de bypass com free tier

| Serviço | Free tier | Funciona com WAF Centi? |
|---|---|---|
| ScraperAPI | 1.000 req/mês free | ❓ provavelmente sim (rotação proxies + browser) |
| ZenRows | 1.000 créditos free trial | ❓ similar |
| Bright Data | 7 dias trial | ❓ |
| ScrapingBee | 1.000 créditos free trial | ❓ |
| Apify | $5 créditos free trial | ❓ provavelmente sim |

**Restrição:** todos têm **free trial limitado**, não free tier perpétuo. Após o trial, exigem assinatura mensal. **Rejeitados** pelo critério "sem custo recorrente novo".

### 3.9 Caminho I — Bypass WAF via engenharia reversa pura

- **Como funciona:** Estudar o JS do Centi, descobrir endpoints AJAX reais, replicar fluxo de autenticação interno (cookies, tokens)
- **Custo:** $0
- **Esforço:** 5-10 dias por endpoint, com risco alto de não conseguir
- **Manutenção:** alta — Centi atualiza JS sem aviso, quebra scraper
- **Veredicto:** ⚠️ último recurso. Esforço desproporcional ao retorno.

---

## 4. Recomendação: Caminho D (GitHub Actions + Playwright)

### 4.1 Arquitetura proposta

```
┌──────────────────────────────────────────────────────────────┐
│  GitHub repo: gianlucaferro/piracanjuba-next                 │
│                                                              │
│  .github/workflows/scrape-centi-monthly.yml                  │
│    schedule: '0 7 5 * *'  # dia 5 do mes, 07:00 UTC          │
│    runs-on: ubuntu-latest                                    │
│    secrets:                                                  │
│      - SUPABASE_SERVICE_ROLE_KEY (via op:// ou GH secret)    │
│      - SUPABASE_PROJECT_REF (oinweocqcptwxqsztlcl)           │
│                                                              │
│  scripts/scrape-centi/                                       │
│    package.json                                              │
│    scrape-gastos-parlamentares.ts (Playwright)               │
│    scrape-indicacoes.ts                                      │
│    scrape-atas-completas.ts                                  │
│    scrape-pareceres-comissoes.ts                             │
│    util/centi-session.ts (helper de sessao reutilizavel)     │
└──────────────────────────────────────────────────────────────┘
            │
            │ POST com Authorization Bearer SERVICE_ROLE
            ▼
┌──────────────────────────────────────────────────────────────┐
│  Supabase Edge Function: ingest-centi-scrape                 │
│    - Valida assinatura                                       │
│    - Upsert em tabelas: gasto_parlamentar, indicacao_centi,  │
│      ata_completa, parecer_comissao                          │
│    - Log em sync_log com counts                              │
└──────────────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────────┐
│  Postgres Supabase Piracanjuba.AI                            │
│    tabelas + RLS publico (read-only)                         │
└──────────────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────────┐
│  Next.js /vereadores/[slug] + /transparencia/*               │
│    fetch via createPublicSupabaseClient + view publica       │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Quanto consumo de free tier

GitHub Actions free tier (repo privado):
- 2.000 minutos/mês free
- Cada scrape Playwright: ~3-5 min (browser cold start + page load + extração + POST)
- 1 scrape mensal de gastos: **3-5 min/mês** = **0.15-0.25% da quota**

Mesmo expandindo pra 10 scrapes mensais (gastos + indicações + atas + pareceres + etc), uso ficaria em ~30-50 min/mês = **1.5-2.5% da quota**.

**Quota free tier de GitHub Actions sobra de qualquer jeito.**

Caso queira ainda mais margem: **tornar o repo público** (já é hoje? verificar) → minutos **ilimitados**.

### 4.3 Por que GitHub Actions resolve o WAF

WAF do Centi parece bloquear:
- IPs de datacenter de scrapers conhecidos (Apify, ScraperAPI)
- User-Agents não-browser

GitHub Actions runners rodam em datacenter Azure com IPs **rotativos e não classificados como scrapers**. UAs reais via Playwright (Chromium real, não headless detectável fácil). **Probabilidade alta de funcionar** sem cair em fingerprinting.

Se mesmo assim WAF bloquear: usar `playwright-extra` + `puppeteer-extra-plugin-stealth` (gratuito, evita detecção comum). Solução conhecida em milhares de scrapers.

### 4.4 Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| WAF do Centi detectar Playwright headless | Média | stealth-plugin + viewport real + interações humanas (scroll, hover) |
| Estrutura HTML do Centi mudar | Alta (semestre) | testes E2E + alertas no workflow failure |
| GitHub Actions free tier mudar regras | Baixa | migrar pra repo público se necessário (já é open-source civic) |
| Secrets exposed | Baixa | Service Role só em GitHub Secrets; rotação a cada 6 meses |
| LGPD: dados de gastos individuais | Baixa-Média | dados são públicos por força de lei (Lei 12.527 + Lei 13.460); manter botão de "contestar" |

### 4.5 Plano de implementação

**Fase 1 — POC (1 dia)**
- [ ] Criar `.github/workflows/scrape-centi-test.yml` que roda manual (`workflow_dispatch`)
- [ ] Playwright script simples que abre página de gastos parlamentares
- [ ] Tirar screenshot + dumpar `document.body.innerText` como artifact
- [ ] **Critério de sucesso:** screenshot mostra os dados reais de gastos (validar visualmente)

**Fase 2 — MVP gastos parlamentares (2 dias)**
- [ ] Schema: tabela `gasto_parlamentar` (vereador, competencia, categoria, valor, fornecedor, descricao)
- [ ] Edge function `ingest-centi-scrape` (recebe POST com array JSON, valida service role, upsert)
- [ ] Workflow `scrape-gastos-mensal.yml` agendado dia 5 às 07:00 UTC
- [ ] Componente `GastosPanel.tsx` + tab em `/vereadores/[slug]`
- [ ] Página `/transparencia/gastos-parlamentares` (ranking + gráficos)

**Fase 3 — Expansão (3-5 dias)**
- [ ] Script genérico `util/centi-session.ts` (reaproveita sessão Playwright)
- [ ] Scrapers adicionais: indicações texto-completo, atas detalhadas, pareceres
- [ ] Página `/transparencia/atos-completos` consolidando tudo

### 4.6 Sinais de retorno esperados

Após Fase 2 ir ao ar:
- **Gastos parlamentares**: tabela com R$ X total ano-corrente por vereador, top 3 categorias por vereador, fornecedores recorrentes
- **Visualizações novas**:
  - Heatmap mensal de gastos por vereador
  - Pizza de categorias (combustível, alimentação, divulgação)
  - Ranking "quem mais gasta da cota mensal"
  - Lista "fornecedores que mais recebem"
- **Potencial editorial**: matéria de jornalismo local cobrindo padrões anômalos (vereador X gasta 90% em combustível, vereador Y só usa 10% da cota etc.)

---

## 5. Perguntas pro Codex revisar

1. **Validação técnica do Caminho D:** GitHub Actions com Playwright é viável pra esse caso de WAF Cloudflare-style do Centi/NucleoGov? Tem caso prático conhecido em civic tech BR?
2. **Stealth recomendado:** `playwright-extra + stealth` ou `playwright` puro + emulação manual de tráfego humano? Qual evita melhor detecção?
3. **Cookies/sessão persistente:** vale persistir cookies do Centi entre runs (via artifacts ou storage) ou cada run abre sessão limpa?
4. **Frequência de scrape:** cron mensal é OK pra gastos parlamentares (Câmara publica competência fechada do mês anterior)? Ou bi-mensal pra economizar quota mesmo sendo abundante?
5. **Fallback se Playwright falhar:** Caminho A (deep-link) como degraded mode automático ou implementação separada?
6. **LGPD/jurídico:** vereador é figura pública na função, dados de gastos são protegidos pelo princípio da publicidade (CF art. 37 + Lei 12.527). Concorda que não há risco LGPD em expor esses dados consolidados?
7. **Manutenibilidade:** se Centi mudar HTML, é melhor ter (a) seletores robustos baseados em texto/estrutura semântica ou (b) seletores CSS específicos com fallbacks?
8. **Outras opções gratuitas que esquecemos?** Vercel Functions Cron (Hobby tem limitações conhecidas), Render Cron Job free tier ($0 mas 750h/mês cap), Fly.io free tier (3 VMs grátis até X RAM)? Algum deles seria melhor que GitHub Actions?

---

## 6. Status atual e próximos passos

- ✅ **Domínios migrados** das 5 edge functions afetadas
- ✅ **Fotos vereadores** rebaixadas + hospedadas no Supabase Storage do Piracanjuba.AI (não dependem mais do site da Câmara)
- ✅ **Mapeamento completo** dos 72 pontos de dados expostos pelo Centi (catálogo em `INTEGRACOES_DADOS_PUBLICOS.md` parcial)
- 🟡 **Aguardando** decisão Codex sobre Caminho D vs alternativas
- ⏸️ Pause em features novas até definir estratégia de coleta

**Custo total atual do projeto Piracanjuba.AI por mês**:
- Vercel Hobby: $0
- Supabase: $10 (Compute Micro do plano Pro)
- Resend: $0 (3.000 emails/mês free)
- Hostinger Email: ~R$ 8 (Starter plan)
- **Total: ~R$ 60/mês**

Sem novos custos é o objetivo de manter abaixo de **R$ 100/mês** durante a fase de adoção do projeto.

---

## 7. Decisão pedida

Codex, sua opinião sobre:

- [ ] Caminho D (GitHub Actions + Playwright) é a melhor solução zero-custo?
- [ ] Existe alternativa gratuita robusta que esquecemos?
- [ ] Riscos de manutenção são aceitáveis?
- [ ] Plano de implementação em 3 fases faz sentido?
- [ ] Resposta às 8 perguntas da seção 5

Aguardamos para implementar.

---

**Anexos**

- Repo: `https://github.com/gianlucaferro/piracanjuba-next`
- Supabase Project: `oinweocqcptwxqsztlcl` (sa-east-1)
- Endpoints Centi mapeados: `INTEGRACOES_DADOS_PUBLICOS.md` (em progresso)
- WP REST API Câmara: `https://piracanjuba.go.leg.br/wp-json/wp/v2/`
- Portal LAI Centi: `https://acessoainformacao.piracanjuba.go.leg.br/`
