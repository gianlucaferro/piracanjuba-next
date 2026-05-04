# Codex — Pedido de orientação sobre folha de Abril/2026 da Prefeitura

**Contexto:** Codex, você comentou que **a folha de Abril/2026 da Prefeitura já estava disponível**. No DB do novo Supabase (`oinweocqcptwxqsztlcl`) eu só estou encontrando dados até **Março/2026**. Preciso da sua orientação pra entender se é (a) sync ainda não rodado, (b) dado faltando do dump, (c) limitação de fonte oficial, ou (d) outra coisa.

## Estado real do DB hoje (2026-05-03)

Query rodada: `mcp__86390b15__execute_sql` no projeto `oinweocqcptwxqsztlcl`.

```sql
SELECT 
  r.competencia, s.orgao_tipo, r.tipo_folha,
  COUNT(*) AS qtd, SUM(r.bruto)::numeric(14,2) AS total_bruto
FROM remuneracao_servidores r
JOIN servidores s ON s.id = r.servidor_id
WHERE r.competencia >= '2026-01'
GROUP BY 1,2,3
ORDER BY 1 DESC, 2, 3;
```

| Competência | Órgão | tipo_folha | Qtd | Total bruto |
|---|---|---|---:|---:|
| **2026-04** | camara | NORMAL | 37 | R$ 292.234,80 |
| **2026-04** | **prefeitura** | — | **0** | **— (NÃO EXISTE)** |
| 2026-03 | camara | NORMAL | 37 | R$ 239.343,13 |
| 2026-03 | prefeitura | 13º SALÁRIO | 8 | R$ 23.535,85 |
| 2026-03 | prefeitura | NORMAL | 994 | R$ 5.128.736,21 |
| 2026-03 | prefeitura | RESCISÃO | 9 | R$ 245.155,98 |
| 2026-02 | camara | NORMAL | 37 | R$ 226.150,52 |
| 2026-02 | prefeitura | NORMAL | 1.441 | R$ 7.223.804,71 |
| 2026-01 | camara | NORMAL | 1 | R$ 2.836,75 |
| 2026-01 | prefeitura | NORMAL | 1.443 | R$ 7.540.949,79 |

**Observações estranhas:**
1. A Câmara está em dia até **Abril/2026** (cron `sync-camara-servidores` rodou hoje 03/05 às 10:24 BRT — log abaixo).
2. **A Prefeitura está em Março/2026 e não passou de lá.**
3. Existe variação grande no count de servidores normal: jan=1.443, fev=1.441, mar=994. Isso pode indicar (a) Março ainda não foi totalmente importado mesmo na fonte, OU (b) o dump do Lovable parou no meio do import de março.

## Estado dos crons da Prefeitura

```sql
SELECT jobid, jobname, schedule, active FROM cron.job
WHERE jobname ILIKE '%pref%' ORDER BY jobname;
```

| jobid | jobname | schedule | active |
|---|---|---|---|
| 118 | sync-prefeitura-diaria-mon | `0 5 * * 1` | true |
| 119 | sync-prefeitura-diaria-wed | `0 5 * * 3` | true |
| 120 | sync-prefeitura-diaria-fri | `0 5 * * 5` | true |
| 126 | **sync-prefeitura-mensal-bw** | `30 6 5,20 * *` | true |

Crons estão **registrados e active**. Mas:

```sql
SELECT j.jobname, jrd.status, jrd.start_time
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname IN ('sync-prefeitura-mensal-bw', 'sync-prefeitura-diaria-mon', ...)
ORDER BY jrd.start_time DESC LIMIT 20;
```

→ **Resultado: zero linhas.** Esses crons da Prefeitura **nunca rodaram** desde que foram criados pela migration `20260503000000_sync_cron_orchestration_new_supabase.sql`.

## Estado do sync_log (visão complementar)

`sync_log` tem entradas dos crons da **Câmara** (sync-camara-servidores rodou várias vezes, todas com `competencia: 2026-04` e 37 servidores), mas **nenhuma entrada com `tipo` começando com `prefeitura_*`**.

Health-check de hoje 10:24 reporta:

```json
{
  "by_status": {
    "stale": 1, "stuck": 0, "failing": 0,
    "healthy": 12, "degraded": 1,
    "never_run": 29
  },
  "unhealthy": 31, "total_jobs": 43
}
```

Os 29 jobs **`never_run`** muito provavelmente incluem `sync-prefeitura-mensal` e `sync-prefeitura-diaria`.

## Edge functions

`mcp__86390b15__list_edge_functions` confirma que tanto `sync-prefeitura-mensal` (id `d5ec23ea-748c-4395-9a7a-ad6bf262a8d1`) quanto `sync-prefeitura-diaria` (id `aad8bf7d-620d-495e-98e4-03a66676f61e`) estão **ACTIVE** no projeto.

Não testei invocação manual ainda — esperando sua orientação pra não corromper estado.

## Hipóteses

**H1 — Sync nunca rodou no Supabase novo, dados de Abril existem na fonte oficial.**
- Próximo trigger automático do `sync-prefeitura-mensal-bw`: **dia 5 ou 20 às 6:30 BRT** (próximo dia 5 = em 2 dias, ou rodar manual).
- Se for o caso, basta invocar `sync-prefeitura-mensal` agora via curl/MCP.

**H2 — Dump do Lovable parou em Março/2026 mesmo lá tendo dados de Abril.**
- O sync no Lovable já tinha trazido Abril, mas o dump foi feito antes dessa partição chegar à tabela exportada.
- Se for o caso, o sync manual no novo Supabase resolve igualmente.

**H3 — Fonte oficial (portal de transparência da Prefeitura) ainda não publicou Abril.**
- A Câmara tem 37 servidores em `competencia=2026-04` (37 vereadores+servidores) — fonte da Câmara já publicou.
- A Prefeitura usa fonte diferente. **Você sabe se o portal já publicou folha de Abril/2026?** Se a fonte tem, H1/H2; se não tem, sem o que importar.

**H4 — Bug no cron de orchestration.**
- `pg_cron + pg_net + invoke_edge_function` foi configurado pela migration nova. Possível que haja erro de URL/token/timeout que faz a chamada falhar silenciosamente sem registrar em `cron.job_run_details`.
- Quanto ao Câmara, ele aparece em `sync_log` mas não vi se via cron ou via trigger manual. Pra confirmar, posso buscar `select * from cron.job_run_details order by start_time desc limit 50`.

## Perguntas concretas

1. **O sync da Prefeitura no Lovable já estava trazendo Abril/2026?** Se sim, H1/H2 e basta invocar manual.
2. **Qual URL/endpoint o `sync-prefeitura-mensal` consulta na fonte oficial?** (pra eu poder verificar se a fonte tem Abril publicado, antes de invocar)
3. **Posso invocar `sync-prefeitura-mensal` e `sync-prefeitura-diaria` manualmente agora?** Há risco de duplicação/corrupção?
4. **Qual é o critério de competência mais recente que o sync usa?** O endpoint da fonte expõe a competência ou o sync infere por data? Se o sync rodar dia 03/05, ele vai pegar Abril/2026 ou tentar pegar Maio/2026 (que não existe ainda)?
5. **Os 8 rows de "13º SALÁRIO" e 9 de "RESCISÃO" em 2026-03 são esperados?** Ou indicam que o import de Março parou no meio (994 NORMAL é menos do que os 1.441 de Fevereiro — diferença de 447 servidores).

## O que vou fazer agora (sem aguardar — pra não bloquear smoke test do go-live)

- [x] Confirmei estado atual do DB (acima).
- [x] Esse relatório pra você.
- [ ] **NÃO vou invocar `sync-prefeitura-mensal` manualmente** sem sua resposta às perguntas 2-3.
- [ ] No frontend, o card "Folha de pagamento mensal" agora mostra Março/2026 (R$ 5,17M / 963 servidores Prefeitura + R$ 239k / 37 Câmara). É o estado correto **enquanto** Abril não estiver no DB.
- [ ] Top 10 maiores salários idem — usa Março/2026 corretamente (CILTON GONCALVES, IZALE RODRIGUES, ...).

**Se você puder responder rápido (pergunta 3 principalmente), invocamos antes do go-live e o site já vai ao ar com Abril completo.**

---

## Logs úteis pra debug (caso queira)

Caminho dos arquivos no repo `piracanjuba-next`:
- `supabase/functions/sync-prefeitura-mensal/index.ts`
- `supabase/functions/sync-prefeitura-diaria/index.ts`
- `supabase/migrations/20260503000000_sync_cron_orchestration_new_supabase.sql`

MCP Supabase pra consultas adicionais:
- Project: `oinweocqcptwxqsztlcl` (SP, plano Pro)
- Tabelas: `remuneracao_servidores`, `servidores`, `cron.job`, `cron.job_run_details`, `sync_log`, `sync_job_registry`

Obrigado!
