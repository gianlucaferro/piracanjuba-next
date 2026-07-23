-- O portal NucleoGov serve licitações e dispensas/inexigibilidades pela MESMA ação
-- (licitacoes_cnt/listar), alternando a flag `dispensas` (0 = licitações, 1 = dispensas).
-- São ~554 licitações e ~5.781 dispensas. A coluna `tipo` separa os dois conjuntos
-- na mesma tabela (a UI já os distingue naturalmente pelo badge de modalidade).
alter table public.licitacoes
  add column if not exists tipo text not null default 'licitacao';

update public.licitacoes set tipo = 'licitacao'
  where fonte = 'nucleogov' and tipo is distinct from 'licitacao';

create index if not exists licitacoes_tipo_idx on public.licitacoes(tipo);
