-- Aceita o historico continuo de 2011 que ja existe, mantendo a cobertura
-- obrigatoria desde 2012 e a rejeicao de lacunas ou sobreposicoes.
-- Nao executa o mantenedor. O cron existente ampliara a fila na proxima execucao.

CREATE OR REPLACE FUNCTION public.maintain_empenhos_backfill_coverage()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  inicio date;
  fim date;
  limite date :=
    (
      date_trunc('month', current_date)
      - interval '1 month'
      - interval '1 day'
    )::date;
  inseridas integer := 0;
begin
  select coalesce(max(data_fim) + 1, date '2012-01-01')
  into inicio
  from public.prefeitura_empenhos_backfill_fila;

  while inicio <= limite loop
    fim := least(
      (
        date_trunc('month', inicio)
        + interval '1 month'
        - interval '1 day'
      )::date,
      limite
    );

    insert into public.prefeitura_empenhos_backfill_fila (
      scope,
      data_inicio,
      data_fim,
      prioridade
    )
    values (
      to_char(inicio, 'DD/MM/YYYY') || ':' || to_char(fim, 'DD/MM/YYYY'),
      inicio,
      fim,
      case
        when exists (
          select 1
          from public.prefeitura_pagamentos_ordem pagamento
          where pagamento.data_pagamento between inicio and fim
        ) then 100
        else 10
      end
    )
    on conflict (scope) do update
    set
      data_inicio = excluded.data_inicio,
      data_fim = excluded.data_fim,
      prioridade = excluded.prioridade,
      updated_at = now();

    inseridas := inseridas + 1;
    inicio := fim + 1;
  end loop;

  if (
    select min(data_inicio) < date '2011-01-01'
      or min(data_inicio) > date '2012-01-01'
      or max(data_fim) < limite
    from public.prefeitura_empenhos_backfill_fila
  ) or exists (
    select 1
    from (
      select
        data_inicio,
        lag(data_fim) over (order by data_inicio) as data_fim_anterior
      from public.prefeitura_empenhos_backfill_fila
      where data_inicio <= limite
    ) janela
    where data_fim_anterior is not null
      and data_inicio <> data_fim_anterior + 1
  ) then
    raise exception
      'fila de empenhos nao cobre continuamente 2012-01-01 a %',
      limite;
  end if;

  return jsonb_build_object(
    'limite', limite,
    'janelas_inseridas', inseridas,
    'cobertura_ate', (
      select max(data_fim)
      from public.prefeitura_empenhos_backfill_fila
    )
  );
end;
$function$
;
