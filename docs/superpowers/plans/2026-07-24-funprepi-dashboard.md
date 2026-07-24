# FUNPREPI Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar uma aba FUNPREPI verificável dentro de Prefeitura, com situação da dívida, despesas, gráficos, contratos, indícios, cobertura do sync e identificação dos cargos atuais de dois doadores.

**Architecture:** Uma migration cria referências históricas, evidências documentais e a função pública `funprepi_dashboard()`, que agrega somente o órgão 44 sem expor payload bruto. Um módulo de dados tipado consome a função via Supabase, e um componente cliente isolado renderiza indicadores e gráficos com Recharts. A navegação existente recebe a nova rota, enquanto a lista do TSE mantém os dados originais e aplica descrições de cargo apenas na apresentação.

**Tech Stack:** PostgreSQL e Supabase, Next.js 16.2 App Router, React 19, TypeScript 5, TanStack Query, Recharts 3, Tailwind CSS 4, Node 26 test runner.

## Global Constraints

- A aba FUNPREPI fica imediatamente entre Servidores e Despesas.
- O painel consulta somente registros com `orgao_id = 44`.
- O saldo atual da dívida permanece “Saldo atual não publicado em fonte oficial” até existir documento oficial com valor e data-base.
- Déficit atuarial, dívida, folha de benefícios e plano de amortização são conceitos distintos.
- O exercício corrente aparece como parcial.
- O próprio FUNPREPI não entra no ranking de fornecedores externos.
- Indícios sempre aparecem acompanhados de limitação e aviso de que não constituem prova.
- Nenhum CPF integral, beneficiário individual ou `raw_payload` é exposto.
- Antonino Inocêncio de Lima recebe a descrição “atual secretário de Finanças do município”.
- Wilson Rodrigues de Lima recebe a descrição “atual secretário de Obras e Serviços Públicos do município”.
- Os registros importados do TSE não são alterados.
- A entrega deve passar por lint, build, testes aplicáveis e validação visual em 1440 pixels e largura móvel.

---

### Task 1: Agregação canônica e reconciliação histórica

**Files:**
- Create: `supabase/migrations/20260724190000_funprepi_dashboard.sql`
- Create: `supabase/tests/funprepi_dashboard.sql`

**Interfaces:**
- Consumes: `public.prefeitura_empenhos`, `public.prefeitura_contratos`, `public.indicio_contratacao`, `public.fornecedores_cnpj`.
- Produces: `public.funprepi_referencia_anual`, `public.funprepi_evidencias`, `public.funprepi_dashboard() returns jsonb`.

- [ ] **Step 1: Escrever o teste SQL de contrato**

O teste deve iniciar uma transação, chamar a função e falhar antes da migration:

```sql
begin;

do $$
declare
  painel jsonb;
begin
  select public.funprepi_dashboard() into painel;

  if painel->>'divida_status' is distinct from 'nao_publicada' then
    raise exception 'status da divida incorreto: %', painel;
  end if;

  if (painel->>'orgao_id')::integer <> 44 then
    raise exception 'painel consultou orgao diferente de 44';
  end if;

  if jsonb_array_length(painel->'serie_anual') = 0 then
    raise exception 'serie anual vazia';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(painel->'fornecedores_externos') item
    where upper(item->>'nome') like '%FUNDO DE PREVIDENCIA SOCIAL DE PIRACANJUBA%'
  ) then
    raise exception 'o proprio fundo apareceu como fornecedor externo';
  end if;
end;
$$;

rollback;
```

- [ ] **Step 2: Executar o teste e confirmar a falha**

Run:

```bash
npx supabase test db supabase/tests/funprepi_dashboard.sql
```

Expected: falha informando que `public.funprepi_dashboard()` não existe.

- [ ] **Step 3: Criar tabelas de referência e evidência**

A migration deve:

```sql
create table if not exists public.funprepi_referencia_anual (
  ano integer primary key check (ano between 2000 and 2100),
  periodo_fim date not null,
  quantidade_empenhos integer not null check (quantidade_empenhos >= 0),
  valor_pago numeric not null check (valor_pago >= 0),
  fonte_url text not null,
  verificado_em date not null
);

create table if not exists public.funprepi_evidencias (
  chave text primary key,
  titulo text not null,
  tipo text not null,
  data_referencia date,
  valor numeric,
  unidade text,
  situacao text not null,
  descricao text not null,
  orgao_emissor text not null,
  fonte_url text not null,
  verificado_em date not null,
  updated_at timestamptz not null default now()
);

alter table public.funprepi_referencia_anual enable row level security;
alter table public.funprepi_evidencias enable row level security;

create policy funprepi_referencia_select_public
on public.funprepi_referencia_anual for select
to anon, authenticated using (true);

create policy funprepi_evidencias_select_public
on public.funprepi_evidencias for select
to anon, authenticated using (true);
```

Popular a referência anual com as contagens e valores pagos verificados no portal histórico entre 2011 e junho de 2026. Popular a evidência `tcm-acordao-15-2019` sem valor financeiro, com situação `deficit_atuarial_confirmado`.

- [ ] **Step 4: Criar a função `funprepi_dashboard()`**

A função deve usar CTEs para classificar os empenhos:

```sql
case
  when upper(coalesce(elemento, '') || ' ' || coalesce(historico, ''))
    like '%APOSENTADOR%' then 'aposentadorias'
  when upper(coalesce(elemento, '') || ' ' || coalesce(historico, ''))
    like '%PENS%O%' then 'pensoes'
  when upper(coalesce(elemento, '') || ' ' || coalesce(historico, ''))
    ~ '(TARIFA|BANCARI)' then 'tarifas'
  when upper(coalesce(fornecedor_nome, ''))
    like '%FUNDO DE PREVIDENCIA SOCIAL DE PIRACANJUBA%' then 'outros'
  else 'fornecedor_externo'
end
```

O JSON retornado deve possuir:

```ts
{
  orgao_id: 44;
  divida_status: "nao_publicada";
  atualizado_em: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  resumo: {
    empenhos: number;
    empenhado: number;
    anulado: number;
    liquidado: number;
    pago: number;
    saldo_pagar: number;
  };
  serie_anual: Array<{
    ano: number;
    periodo_fim_referencia: string;
    empenhos_novo: number;
    empenhos_referencia: number;
    pago_novo: number;
    pago_referencia: number;
    status: "reconciliado" | "parcial" | "divergente" | "ausente";
  }>;
  serie_mensal: Array<{
    mes: number;
    aposentadorias: number;
    pensoes: number;
    tarifas: number;
    fornecedores_externos: number;
    outros: number;
  }>;
  composicao: Array<{ categoria: string; valor: number; empenhos: number }>;
  fornecedores_externos: Array<{
    nome: string;
    documento: string | null;
    valor_pago: number;
    empenhos: number;
    primeiro_ano: number;
    ultimo_ano: number;
  }>;
  contratos: Array<Record<string, unknown>>;
  indicios: Array<Record<string, unknown>>;
  evidencias: Array<Record<string, unknown>>;
}
```

Conceder somente `execute` para `anon` e `authenticated`. Revogar de `public`.

- [ ] **Step 5: Incluir 2011 na fila de backfill**

Inserir quatro janelas trimestrais de 2011 em `prefeitura_empenhos_backfill_fila`, com `on conflict` idempotente e prioridade 110, sem disparar chamadas concorrentes manualmente.

- [ ] **Step 6: Executar o teste SQL novamente**

Run:

```bash
npx supabase test db supabase/tests/funprepi_dashboard.sql
```

Expected: PASS e rollback sem efeitos residuais.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260724190000_funprepi_dashboard.sql supabase/tests/funprepi_dashboard.sql
git commit -m "feat(db): agrega dados do FUNPREPI"
```

### Task 2: Contrato de dados e descrições verificadas de doadores

**Files:**
- Create: `src/lib/funprepi.ts`
- Create: `src/data/funprepiApi.ts`
- Create: `tests/funprepi.test.ts`
- Modify: `package.json`
- Modify: `src/components/vereadores/FinanciadoresCampanhaCard.tsx`

**Interfaces:**
- Consumes: RPC `funprepi_dashboard`.
- Produces: `fetchFunprepiDashboard(): Promise<FunprepiDashboard>` e `getCargoAtualDoador(nome: string): CargoAtualDoador | null`.

- [ ] **Step 1: Escrever testes de nome exato e cálculo de variação**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  calcularVariacaoPercentual,
  getCargoAtualDoador,
} from "../src/lib/funprepi.ts";

test("identifica somente os dois doadores por nome normalizado exato", () => {
  assert.equal(
    getCargoAtualDoador("Antonino Inocêncio de Lima")?.cargo,
    "atual secretário de Finanças do município",
  );
  assert.equal(
    getCargoAtualDoador("WILSON RODRIGUES DE LIMA")?.cargo,
    "atual secretário de Obras e Serviços Públicos do município",
  );
  assert.equal(getCargoAtualDoador("Wilson Rodrigues"), null);
});

test("calcula variação sem dividir por zero", () => {
  assert.equal(calcularVariacaoPercentual(113.86, 100), 13.86);
  assert.equal(calcularVariacaoPercentual(10, 0), null);
});
```

- [ ] **Step 2: Executar o teste e confirmar a falha**

Run:

```bash
node --test tests/funprepi.test.ts
```

Expected: falha porque `src/lib/funprepi.ts` ainda não existe.

- [ ] **Step 3: Implementar tipos e funções puras**

`src/lib/funprepi.ts` deve exportar todos os tipos da resposta do RPC, normalizar nomes com `normalize("NFD")`, remover diacríticos, compactar espaços e fazer correspondência exata.

Cada cargo deverá conter a fonte:

```ts
const SECRETARIADO_URL = "https://piracanjuba.go.gov.br/secretariado/";
```

- [ ] **Step 4: Implementar o cliente de dados**

```ts
export async function fetchFunprepiDashboard(): Promise<FunprepiDashboard> {
  const { data, error } = await supabase.rpc("funprepi_dashboard");
  if (error) throw error;
  if (!data || typeof data !== "object") {
    throw new Error("Painel FUNPREPI retornou resposta inválida");
  }
  return data as FunprepiDashboard;
}
```

- [ ] **Step 5: Renderizar os cargos na lista de doadores**

Para cada doador:

```tsx
const cargoAtual = getCargoAtualDoador(d.nome_doador);

<p className="font-semibold text-sm text-foreground">
  {d.nome_doador}
  {cargoAtual && (
    <span className="font-normal text-muted-foreground">
      {" - "}{cargoAtual.cargo}
    </span>
  )}
</p>
```

Adicionar um link “Cargo atual: Prefeitura de Piracanjuba” para `cargoAtual.fonteUrl`. Não modificar `tse_doador_campanha`.

- [ ] **Step 6: Registrar e executar o teste**

Adicionar:

```json
"test:funprepi": "node --test tests/funprepi.test.ts"
```

Run:

```bash
npm run test:funprepi
```

Expected: 2 testes aprovados.

- [ ] **Step 7: Commit**

```bash
git add package.json tests/funprepi.test.ts src/lib/funprepi.ts src/data/funprepiApi.ts src/components/vereadores/FinanciadoresCampanhaCard.tsx
git commit -m "feat(web): identifica doadores com cargo atual"
```

### Task 3: Componente investigativo FUNPREPI

**Files:**
- Create: `src/components/prefeitura/FunprepiTab.tsx`
- Modify: `src/components/prefeitura/PrefeituraClient.tsx`

**Interfaces:**
- Consumes: `fetchFunprepiDashboard`, `FunprepiDashboard`.
- Produces: componente cliente `<FunprepiTab />`.

- [ ] **Step 1: Criar carregamento e estados de erro**

O componente deve usar:

```tsx
const { data, isLoading, isError, refetch } = useQuery({
  queryKey: ["funprepi-dashboard"],
  queryFn: fetchFunprepiDashboard,
  staleTime: 10 * 60 * 1000,
});
```

Renderizar skeleton, erro com botão “Tentar novamente” e estado vazio distinto.

- [ ] **Step 2: Criar status da dívida e KPIs**

Exibir:

- “Saldo atual não publicado em fonte oficial”.
- Link para o Acórdão Consulta 15/2019.
- total pago;
- pago no exercício atual;
- variação contra o mesmo período anterior;
- saldo a pagar;
- quantidade de empenhos;
- período coberto.

O texto deve dizer explicitamente que o documento confirma déficit atuarial, mas não informa o saldo atual.

- [ ] **Step 3: Criar os gráficos**

Usar `ResponsiveContainer`, `ComposedChart`, `BarChart` e `PieChart` para:

- série anual com `pago_referencia` e `pago_novo`;
- série mensal por categoria;
- composição;
- fornecedores externos.

Cada gráfico deve possuir título descritivo, legenda visível, tooltip em BRL e tabela ou lista textual equivalente.

- [ ] **Step 4: Criar cobertura e trilhas investigativas**

Cada exercício recebe badge:

- verde para `reconciliado`;
- âmbar para `parcial`;
- vermelho para `divergente`;
- cinza para `ausente`.

Exibir contratos, indícios e evidências com fonte. O aviso “Indício não é prova” deve permanecer próximo aos indícios.

- [ ] **Step 5: Integrar a aba**

Em `PrefeituraClient.tsx`:

```tsx
import { Landmark } from "lucide-react";
import FunprepiTab from "@/components/prefeitura/FunprepiTab";
```

Inserir:

```ts
{ value: "servidores", label: "Servidores", icon: Users },
{ value: "funprepi", label: "FUNPREPI", icon: Landmark },
{ value: "despesas", label: "Despesas", icon: DollarSign },
```

E:

```tsx
<TabsContent value="funprepi"><FunprepiTab /></TabsContent>
```

- [ ] **Step 6: Executar lint dos arquivos**

Run:

```bash
npx eslint src/components/prefeitura/FunprepiTab.tsx src/components/prefeitura/PrefeituraClient.tsx src/data/funprepiApi.ts src/lib/funprepi.ts
```

Expected: exit code 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/prefeitura/FunprepiTab.tsx src/components/prefeitura/PrefeituraClient.tsx
git commit -m "feat(web): adiciona painel FUNPREPI"
```

### Task 4: Rota, metadados e descoberta

**Files:**
- Modify: `src/app/prefeitura/[aba]/page.tsx`
- Modify: `src/app/prefeitura/page.tsx`
- Modify: `src/app/sitemap.ts`
- Modify: `src/app/sobre/page.tsx`
- Modify: `public/llms.txt`
- Modify: `public/llms-full.txt`

**Interfaces:**
- Consumes: valor de aba `funprepi`.
- Produces: rota indexável `/prefeitura/funprepi`.

- [ ] **Step 1: Registrar a rota**

Adicionar:

```ts
funprepi: {
  title: "FUNPREPI e previdência municipal de Piracanjuba GO",
  description: "Despesas, benefícios, contratos, déficit atuarial e cobertura dos dados do Fundo de Previdência Social de Piracanjuba, com fontes oficiais.",
},
```

- [ ] **Step 2: Atualizar Dataset e descrições**

Adicionar Dataset específico em `src/app/prefeitura/page.tsx` apontando para `/prefeitura/funprepi`, com fonte oficial Prefeitura, NucleoGov e TCM-GO. Atualizar as descrições gerais para mencionar o FUNPREPI.

- [ ] **Step 3: Atualizar sitemap e arquivos para agentes**

Inserir `funprepi` imediatamente após `servidores` no array `prefeituraAbas`. Atualizar `llms.txt` e `llms-full.txt` com descrição factual e sem valor de dívida.

- [ ] **Step 4: Executar build**

Run:

```bash
npm run build
```

Expected: build concluído e rota `/prefeitura/[aba]` compilada sem erro.

- [ ] **Step 5: Commit**

```bash
git add src/app/prefeitura/[aba]/page.tsx src/app/prefeitura/page.tsx src/app/sitemap.ts src/app/sobre/page.tsx public/llms.txt public/llms-full.txt
git commit -m "feat(seo): publica rota do FUNPREPI"
```

### Task 5: Produção e validação final

**Files:**
- Modify only if validation reveals a defect in files owned by Tasks 1 to 4.

**Interfaces:**
- Consumes: migration, RPC, frontend e rota completos.
- Produces: evidência de execução local e remota.

- [ ] **Step 1: Aplicar migration remota**

Run:

```bash
npx supabase db push
```

Expected: `20260724190000_funprepi_dashboard.sql` aplicada ao projeto vinculado.

- [ ] **Step 2: Validar o RPC em produção**

Consultar com a chave pública carregada do ambiente e confirmar:

- `orgao_id = 44`;
- `divida_status = nao_publicada`;
- fornecedores não incluem o próprio fundo;
- série anual contém referência e carga nova;
- exercício atual parcial;
- evidência do TCM-GO presente.

- [ ] **Step 3: Executar todos os gates**

Run:

```bash
npm run test:funprepi
npm run test:sync
npm run lint
npm run build
```

Expected: todos os comandos com exit code 0.

- [ ] **Step 4: Validar visualmente**

Iniciar:

```bash
npm run dev
```

Verificar `/prefeitura/funprepi` em 1440 por 1000 e 390 por 844:

- posição da aba;
- ausência de overflow;
- legibilidade dos gráficos;
- tooltips;
- tabelas;
- badges de cobertura;
- cargos dos doadores na aba Chefia;
- foco de teclado e links externos.

- [ ] **Step 5: Conferir o diff e o estado do repositório**

Confirmar que `supabase/.temp/cli-latest` continua fora dos commits e que não há alteração alheia à entrega.

- [ ] **Step 6: Commit de correções de validação, se necessário**

```bash
git add src/components/prefeitura/FunprepiTab.tsx src/components/prefeitura/PrefeituraClient.tsx src/components/vereadores/FinanciadoresCampanhaCard.tsx src/data/funprepiApi.ts src/lib/funprepi.ts src/app/prefeitura/[aba]/page.tsx src/app/prefeitura/page.tsx src/app/sitemap.ts src/app/sobre/page.tsx public/llms.txt public/llms-full.txt
git commit -m "fix: valida painel FUNPREPI"
```

- [ ] **Step 7: Push**

```bash
git push origin main
```

Expected: branch `main` enviado sem reescrever histórico.
