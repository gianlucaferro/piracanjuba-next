# Pedido de Auditoria — Codex

**Projeto:** Piracanjuba.ai — migração de Lovable (React + Vite + Supabase Lovable Cloud) para Next.js 16 (App Router) + Vercel + Supabase próprio.
**Status:** Migração funcional, mas usuário reporta divergências de paridade entre o site pré-migração (produção Lovable) e a versão Next.
**Pedido:** Auditoria sistemática de paridade Lovable vs Next — encontrar e corrigir TODA divergência de comportamento, dados ou layout.

---

## Contexto técnico

| Item | Lovable (origem) | Next.js (destino) |
|---|---|---|
| Framework | React 18 + Vite | **Next.js 16 App Router (Turbopack)** — ATENÇÃO: API/conventions diferentes do Next 14/15 |
| DB | Supabase Lovable Cloud `uulpqmylqnonbxozdbtb` (read-only — dump congelado) | Supabase próprio `oinweocqcptwxqsztlcl` (29.381 rows restauradas + 50 storage objects) |
| Hosting | Lovable (Cloudflare edge) | Vercel (`piracanjuba-next` em `gianlucaferros-projects`) |
| Auth | Lovable Cloud | Supabase nativo (Google OAuth + email/password) — sem Apple |
| Email | — | Resend `contato@ferrolabs.com.br`, domínio `piracanjuba.ai` (DKIM/SPF via Hostinger) |
| AI Gateway | Lovable AI Gateway | Gemini direto (chat: OpenAI-compat; áudio: `generateContent`) |
| Cron jobs | Lovable infra | `pg_cron + pg_net` com `invoke_edge_function(timeout_milliseconds := 60000)` |

Local: `/Users/gianlucaferro/Desktop/Claude Code/piracanjuba-next`

⚠️ **AVISO IMPORTANTE — Next.js 16:** Esta versão tem breaking changes vs Next 14/15. Antes de escrever qualquer código, leia `node_modules/next/dist/docs/`. Não confie na sua memória sobre App Router.

---

## Bug raiz que o usuário acabou de reportar (e foi corrigido como prova de conceito)

### Sintoma
Aba "Visão Geral" da Prefeitura mostrava o card **"Top 10 maiores salários"** com servidores que **eram da Câmara**, não da Prefeitura.

### Causa
Em `src/components/prefeitura/PrefeituraDestaques.tsx#fetchTopSalarios`, a função primeiro buscava a **última competência disponível em `remuneracao_servidores` globalmente**, depois consultava o top 10 dessa competência. Resultado:

- Competência `2026-04` tinha **37 rows** em `remuneracao_servidores` — match exato com a quantidade de servidores da Câmara (37 vereadores/servidores).
- A Prefeitura ainda não tinha publicado a competência `2026-04` (último import: `2026-03`).
- Top 10 acabou sendo **100% Câmara** porque a query não filtrava `orgao_tipo='prefeitura'`.

### Fix aplicado
PostgREST inner-join embed via FK, filtrando ANTES de pegar latestComp:

```ts
const { data: latestRow } = await supabase
  .from("remuneracao_servidores")
  .select("competencia, servidores!inner(orgao_tipo)")
  .eq("servidores.orgao_tipo", "prefeitura")  // <-- ESTE filtro
  .order("competencia", { ascending: false })
  .limit(1)
  .maybeSingle();
```

Aplicado nas 3 queries da função: `latestRow`, `allRem` (mediana), `remuneracoes` (top 10).

### Validação SQL feita manualmente
- `2026-04`: 37 rows (Câmara) — pôde por descalço
- `2026-03`: ~1.300 rows com Prefeitura (correto após fix)
- Top 10 esperado da Prefeitura em 2026-03: CILTON GONCALVES DE SOUZA (MOTORISTA, R$ 130.989,55), IZALE RODRIGUES (PROFESSOR P-IV, R$ 81.972,32), ...

---

## Pedido ao Codex — escopo da auditoria

### 1. Detectar e corrigir todos os pontos com o mesmo padrão de bug

**Padrão a procurar:** qualquer query que envolva `remuneracao_servidores` SEM filtro explícito de `orgao_tipo` (ou via embed `servidores!inner(...)` ou via lista de IDs pré-filtrada).

**Pontos já mapeados (mas que precisam ser **revisados e refatorados** para o padrão `orgao_tipo`):**

| Arquivo:linha | Função | Pattern atual | Risco |
|---|---|---|---|
| `src/components/prefeitura/PrefeituraDestaques.tsx:160-197` | `fetchFolhaTotal` | Usa `fonte_url ILIKE '%camara%'` para distinguir Pref/Cam | ⚠️ Frágil. Servidor sem `fonte_url` ou com URL diferente vaza. Padronizar para `servidores.orgao_tipo` |
| `src/data/camaraApi.ts:130-161` | `fetchCamaraCustoTotal` | Usa `fonte_url ILIKE '%camara%'` + `.in("servidor_id", ids)` | ⚠️ Mesmo problema. Bug latente: latestComp pode ser de outro órgão (mesmo argumento que o fix anterior) |
| `src/components/prefeitura/PrefeituraClient.tsx:1318-1329` | `useQuery(["last-competencia"])` | latestComp de `remuneracao_servidores` SEM filtro | ⚠️ Mostrado no painel admin. Pode mostrar "Última competência: 2026-04" enquanto Prefeitura está em 2026-03 |
| `src/data/prefeituraApi.ts:131-159` | `fetchExecutivoRemuneracao` | Não filtra `orgao_tipo` no servidor — encontra qualquer match `nome ILIKE %nome%` | ⚠️ Pode pegar servidor da Câmara homônimo |
| `src/data/prefeituraApi.ts:181-244` | `fetchSecretariosRemuneracao` | Mesma vulnerabilidade homônimo | ⚠️ |

**Padrão correto a aplicar:**
```ts
.select("...,servidores!inner(orgao_tipo,nome,cargo)")
.eq("servidores.orgao_tipo", "prefeitura")  // ou "camara"
```

ou (segunda alternativa, quando o embed for inviável):
```ts
const { data: srvIds } = await supabase
  .from("servidores")
  .select("id")
  .eq("orgao_tipo", "prefeitura");
// pré-filtrar IDs e usar .in("servidor_id", ids) em batches de até 1000
```

⚠️ A coluna `servidores.fonte_url` **NÃO** deve ser usada como discriminador — ela é frágil (URL pode mudar, nem todo servidor tem). Sempre `orgao_tipo`.

---

### 2. Verificar paridade visual de TODAS as abas da Prefeitura e da Câmara

Comparar com o site Lovable em produção (estado pré-migração) e relatar divergências.

**Abas Prefeitura** (`/prefeitura?tab=...`):
- [ ] visao-geral (cards: despesa, folha, top 10 salários, fornecedores, comparativo)
- [ ] saude (todas sub-abas: indicadores, financeiro, atendimentos, etc)
- [ ] educacao
- [ ] social
- [ ] impostos
- [ ] agro
- [ ] seguranca
- [ ] servidores
- [ ] contratos (⚠️ usuário reportou: precisam mostrar **aditivos** e **risco com bolinhas vermelhas**)
- [ ] obras
- [ ] licitacoes
- [ ] decretos
- [ ] portarias
- [ ] secretarias

**Abas Câmara** (`/camara?tab=...`):
- [ ] visao-geral
- [ ] vereadores
- [ ] servidores
- [ ] contratos (idem aditivos + risco)
- [ ] projetos
- [ ] atuacao-parlamentar
- [ ] atos
- [ ] despesas
- [ ] receitas
- [ ] diarias
- [ ] licitacoes

**Para cada aba:** abrir `https://piracanjuba-next-kiukrzkse-gianlucaferros-projects.vercel.app/prefeitura?tab=X` (e Lovable equivalente) e validar:
1. A aba renderiza?
2. Todos os cards/tabelas/gráficos aparecem?
3. Os dados batem com o Lovable?
4. Filtros e ordenação funcionam?
5. Compartilhamento WhatsApp gera URL correta?

---

### 3. Funcionalidades específicas que o usuário marcou como CRÍTICAS

3.1. **Página do Administrador** (`/admin`) — todas operações: imports manuais, sync logs, gestão de classificados, ads. Validar que cada botão dispara a edge function correta e o resultado aparece no log.

3.2. **Banners/Anúncios** (componente `AdBanner` em `/`) — busca em `anuncios` table, deve renderizar imagem + link + tracking de impressões/cliques.

3.3. **AI Summaries** (resumos por IA de notícias, contratos, contas públicas) — chamam edge functions Gemini. Verificar se logs do `pg_cron` mostram execução periódica e se as colunas `*_resumo_ia` da DB estão sendo preenchidas.

3.4. **Contratos com aditivos** — tabela `contratos_aditivos` precisa carregar e ser exibida abaixo do contrato pai.

3.5. **Risco dos contratos (bolinhas vermelhas)** — coluna `contratos.risco_score` (ou similar) deve mapear para indicador visual: 🟢 baixo, 🟡 médio, 🔴 alto. Confirmar que Lovable usava limites: `< 33` verde, `< 66` amarelo, `>= 66` vermelho (validar contra Lovable real).

3.6. **Links externos** — TODOS os links em:
- WhatsApp Compra/Venda PBA
- ZAP PBA
- Farmácias de Plantão (rotacionado por dia)
- Contatos Úteis (delegacia, hospital, etc)
- Header da Torre do Relógio (imagem)

devem funcionar e abrir corretamente. Usuário reclamou que estava aparecendo errado pós-migração.

3.7. **Header com imagem da Torre do Relógio** — usuário reportou que sumiu. Verificar `src/components/Hero*.tsx` ou `src/app/layout.tsx`.

---

### 4. Crons + Edge Functions — verificar execução real

Conectar no Supabase via `mcp__86390b15__execute_sql` e rodar:

```sql
-- Ver últimas execuções de cron
SELECT jobname, status, return_message, start_time, end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 50;

-- Ver jobs ativos
SELECT jobid, jobname, schedule, command, active
FROM cron.job;
```

Verificar:
- [ ] `sync-prefeitura-mensal` (mensal, dia 5) — funcionou no último dia 5?
- [ ] `sync-prefeitura-diaria` (diária, 4h da manhã) — funcionou hoje?
- [ ] `sync-camara-*` — análogos
- [ ] `sync-noticias` — funciona com Gemini?
- [ ] `sync-health-check` — bate em 60s, não estoura timeout?
- [ ] `gerar-resumos-ia-*` — todos populando colunas `*_resumo_ia`?

Se algum cron está falhando, pegar o `return_message` e investigar a edge function correspondente em `supabase/functions/<nome>/index.ts`.

---

### 5. Email transacional — testar fluxo completo

Verificar que:
- [ ] Domínio `piracanjuba.ai` está **verified** no Resend (DNS já configurado em ~03/05)
- [ ] Edge function `send-email-hook` (Send Email Hook do Supabase) responde 200 com `v1,whsec_…` HMAC
- [ ] Templates renderizam com layout do MasterEmail (header gradient + footer Ferro Labs)
- [ ] Signup → email com link verifica + abre `/auth/callback` → user logado
- [ ] Magic link → idem
- [ ] Reset password → idem
- [ ] Email change confirmation → idem

Templates em `supabase/functions/_shared/email-templates/*.tsx`.

---

### 6. Auth — validar todos os fluxos

- [ ] Email/password signup
- [ ] Email/password login
- [ ] Reset password
- [ ] Google OAuth (provider configurado em Supabase Dashboard com client_id da conta `contatoferrolabs@gmail.com`)
- [ ] Logout

Não tem Apple OAuth (decisão do usuário). Usuários Apple usam reset password.

---

### 7. SSR/Hydration — flags críticas no Next 16

Confirmar que:
- [ ] `src/app/camara/page.tsx` tem `export const dynamic = "force-dynamic"` (necessário p/ `useSearchParams` no client)
- [ ] `src/app/prefeitura/page.tsx` idem
- [ ] Componentes que tocam `window` estão envolvidos por wrapper com `dynamic(import, { ssr: false })`:
  - `ClassificadosWrapper`, `AnuncioDetalheWrapper`, `AdminWrapper`
- [ ] `next.config.ts` tem `typescript: { ignoreBuildErrors: true }` (workaround temporário p/ shadcn @base-ui — TODO: remover)
- [ ] `images.remotePatterns` cobre `oinweocqcptwxqsztlcl.supabase.co` (atual) + `uulpqmylqnonbxozdbtb.supabase.co` (legado, p/ imagens migradas)

---

### 8. Layout Tailwind 4 — atributo selectors

Bug já resolvido em `src/components/ui/tabs.tsx`:
- Tailwind 4 não reconhece `data-horizontal:flex-col`
- Padrão correto: `data-[orientation=vertical]:flex-row` (com colchetes)

Verificar se há outros lugares com esse padrão antigo de Radix v1 / Tailwind v3 que ainda usam `data-state-` ou `data-orientation` sem colchetes.

```bash
grep -rn "data-horizontal\|data-vertical\|data-orientation:\|data-state:" src/ --include="*.tsx"
```

---

### 9. Performance — Vercel build

Atual: build OK em ~30s. Mas o `ignoreBuildErrors` esconde divergências de tipo do shadcn. Após paridade, **reabilitar type-check** e corrigir os erros (a maioria é divergência de signature do `@base-ui/react` Select — `value: string | null` vs `string | undefined`).

---

### 10. Smoke tests recomendados (rodar em sequência)

1. Abrir `/` → Hero com Torre do Relógio + header completo
2. Click em Prefeitura → tabs aparecem e clicáveis
3. Click em "Visão Geral" → todos os cards renderizam
4. **Top 10 maiores salários: nomes esperados (CILTON GONCALVES, IZALE RODRIGUES, ...)** ← validar fix anterior
5. Click em "Contratos" → lista carrega + filtros + bolinhas de risco
6. Click em um contrato → modal/detalhe abre com aditivos
7. Idem para todas as abas (item 2 desta lista)
8. Click em Câmara → mesma rotina
9. Página /classificados → lista + criar novo (logado)
10. Página /admin (logado como admin) → todas operações

---

## Como entregar a auditoria

Para cada item encontrado:
1. **Sintoma** — o que está diferente do Lovable
2. **Causa** — onde no código (arquivo:linha)
3. **Fix proposto** — diff ou código pronto
4. **Validação** — query SQL ou screenshot que prova o fix

Saída esperada: PR ou patch único com todas correções e relatório de mudanças.

---

## Arquivos-chave para começar

```
src/
├── app/
│   ├── page.tsx                          # Home
│   ├── prefeitura/page.tsx               # Prefeitura wrapper
│   ├── camara/page.tsx                   # Câmara wrapper
│   ├── admin/page.tsx                    # Admin
│   └── auth/callback/route.ts            # OAuth handler
├── components/
│   ├── prefeitura/
│   │   ├── PrefeituraClient.tsx          # 1500+ linhas — mestre da Prefeitura
│   │   ├── PrefeituraDestaques.tsx       # ⚠️ contém o bug fixado + outros padrões frágeis
│   │   └── tabs/                         # Cada aba
│   ├── camara/
│   │   ├── CamaraClient.tsx
│   │   └── tabs/
│   └── ui/
│       └── tabs.tsx                      # Tailwind 4 fix aplicado
├── data/
│   ├── prefeituraApi.ts                  # ⚠️ funções com homônimo
│   └── camaraApi.ts                      # ⚠️ usa fonte_url
└── lib/supabase/
    ├── client.ts                          # createBrowserSupabaseClient
    └── types.ts                           # Schema gerado

supabase/
├── functions/
│   ├── _shared/email-templates/          # MasterEmail + 6 auth templates
│   ├── send-email-hook/                  # Resend hook
│   ├── sync-*/                            # Cron jobs
│   └── gerar-resumos-ia-*/                # Gemini AI
└── migrations/
```

---

## Notas finais

- **NÃO confiar em memória** sobre Next 14/15 — Next 16 mudou conventions. Ler `node_modules/next/dist/docs/`.
- **NÃO usar `fonte_url ILIKE`** para distinguir órgão — sempre `orgao_tipo`.
- **NÃO refatorar prematuramente** — focar em paridade. Melhorias arquiteturais ficam para depois.
- **Coverage:** o site precisa estar **100% fiel ao Lovable pré-migração**, este é o único critério de pronto.

Obrigado, Codex.
