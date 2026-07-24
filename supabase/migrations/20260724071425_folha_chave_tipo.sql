-- Um servidor pode ter folha mensal, complementar e 13o na mesma competencia.
-- A identidade canônica precisa incluir o tipo da folha e da movimentacao.
alter table public.prefeitura_folha_nucleogov
  drop constraint if exists prefeitura_folha_nucleogov_portal_id_ano_mes_key;

drop index if exists public.prefeitura_folha_portal_competencia_tipo_uidx;
create unique index prefeitura_folha_portal_competencia_tipo_uidx
  on public.prefeitura_folha_nucleogov (
    portal_id,
    ano,
    mes,
    coalesce(tipo_folha, ''),
    coalesce(tipo_movimentacao, '')
  );
