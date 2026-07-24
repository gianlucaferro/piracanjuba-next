-- Backfill controlado de empenhos historicos do NucleoGov.
-- Versao aplicada em producao: 20260724170022.
-- Cada janela tem no maximo 93 dias, respeitando o limite do sync.

create table if not exists public.prefeitura_empenhos_backfill_fila (
  scope text primary key,
  data_inicio date not null,
  data_fim date not null,
  prioridade integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'success', 'error')),
  tentativas integer not null default 0,
  request_id bigint,
  iniciado_em timestamptz,
  concluido_em timestamptz,
  ultimo_erro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (data_fim >= data_inicio),
  check (data_fim - data_inicio <= 93)
);

create index if not exists prefeitura_empenhos_backfill_status_idx
  on public.prefeitura_empenhos_backfill_fila
  (status, prioridade desc, data_inicio);

alter table public.prefeitura_empenhos_backfill_fila enable row level security;
revoke all on public.prefeitura_empenhos_backfill_fila
  from public, anon, authenticated;

insert into public.prefeitura_empenhos_backfill_fila (
  scope,
  data_inicio,
  data_fim,
  prioridade
)
select
  to_char(inicio::date, 'DD/MM/YYYY') || ':' ||
    to_char((inicio + interval '3 months - 1 day')::date, 'DD/MM/YYYY'),
  inicio::date,
  (inicio + interval '3 months - 1 day')::date,
  case
    when exists (
      select 1
      from public.prefeitura_pagamentos_ordem pagamento
      where pagamento.data_pagamento between inicio::date
        and (inicio + interval '3 months - 1 day')::date
    ) then 100
    else 0
  end
from generate_series(
  date '2012-01-01',
  date '2025-10-01',
  interval '3 months'
) inicio
on conflict (scope) do update
set
  prioridade = excluded.prioridade,
  updated_at = now();

create or replace function public.dispatch_next_empenhos_backfill()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item public.prefeitura_empenhos_backfill_fila%rowtype;
  requisicao bigint;
  totais jsonb;
begin
  -- Confirma janelas cuja execucao ja registrou estado completo.
  update public.prefeitura_empenhos_backfill_fila fila
  set
    status = 'success',
    concluido_em = estado.checked_at,
    ultimo_erro = null,
    updated_at = now()
  from public.prefeitura_sync_state estado
  where fila.status = 'running'
    and estado.dataset = 'empenhos'
    and estado.scope = fila.scope
    and estado.complete
    and estado.checked_at >= fila.iniciado_em;

  -- Libera uma tentativa travada. A Edge Function tem timeout menor que 5 min.
  update public.prefeitura_empenhos_backfill_fila
  set
    status = case when tentativas >= 3 then 'error' else 'pending' end,
    ultimo_erro = coalesce(
      ultimo_erro,
      'Execucao sem estado completo apos 12 minutos'
    ),
    updated_at = now()
  where status = 'running'
    and iniciado_em < now() - interval '12 minutes';

  -- Nunca sobrepoe duas janelas sobre o portal oficial.
  if exists (
    select 1
    from public.prefeitura_empenhos_backfill_fila
    where status = 'running'
  ) then
    select jsonb_build_object(
      'pending', count(*) filter (where status = 'pending'),
      'running', count(*) filter (where status = 'running'),
      'success', count(*) filter (where status = 'success'),
      'error', count(*) filter (where status = 'error')
    )
    into totais
    from public.prefeitura_empenhos_backfill_fila;

    return jsonb_build_object('dispatched', false, 'queue', totais);
  end if;

  select *
  into item
  from public.prefeitura_empenhos_backfill_fila
  where status = 'pending'
  order by prioridade desc, data_inicio
  for update skip locked
  limit 1;

  if item.scope is null then
    select jsonb_build_object(
      'pending', count(*) filter (where status = 'pending'),
      'running', count(*) filter (where status = 'running'),
      'success', count(*) filter (where status = 'success'),
      'error', count(*) filter (where status = 'error')
    )
    into totais
    from public.prefeitura_empenhos_backfill_fila;

    return jsonb_build_object('dispatched', false, 'queue', totais);
  end if;

  update public.prefeitura_empenhos_backfill_fila
  set
    status = 'running',
    tentativas = tentativas + 1,
    iniciado_em = now(),
    concluido_em = null,
    ultimo_erro = null,
    updated_at = now()
  where scope = item.scope;

  begin
    requisicao := public.invoke_edge_function_secure(
      'sync-empenhos-prefeitura-nucleogov',
      jsonb_build_object(
        'startDate', to_char(item.data_inicio, 'YYYY-MM-DD'),
        'endDate', to_char(item.data_fim, 'YYYY-MM-DD')
      )
    );

    update public.prefeitura_empenhos_backfill_fila
    set request_id = requisicao, updated_at = now()
    where scope = item.scope;
  exception when others then
    update public.prefeitura_empenhos_backfill_fila
    set
      status = case when tentativas >= 3 then 'error' else 'pending' end,
      ultimo_erro = sqlerrm,
      updated_at = now()
    where scope = item.scope;

    raise warning 'Falha ao despachar backfill %: %', item.scope, sqlerrm;
  end;

  return jsonb_build_object(
    'dispatched', requisicao is not null,
    'scope', item.scope,
    'request_id', requisicao
  );
end;
$$;

revoke execute on function public.dispatch_next_empenhos_backfill()
  from public, anon, authenticated;
grant execute on function public.dispatch_next_empenhos_backfill()
  to postgres;

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'backfill-empenhos-prefeitura-nucleogov'
  ) then
    perform cron.unschedule('backfill-empenhos-prefeitura-nucleogov');
  end if;
end
$$;

select cron.schedule(
  'backfill-empenhos-prefeitura-nucleogov',
  '*/3 * * * *',
  $$select public.dispatch_next_empenhos_backfill();$$
);
