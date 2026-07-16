-- CEPIM (Cadastro de Entidades sem fins lucrativos Impedidas) passa a ser
-- coletado junto com CEIS/CNEP na mesma tabela empresa_sancionada. Amplia o
-- check de `cadastro` para aceitar o novo valor.
alter table public.empresa_sancionada drop constraint if exists empresa_sancionada_cadastro_check;
alter table public.empresa_sancionada add constraint empresa_sancionada_cadastro_check
  check (cadastro in ('CEIS','CNEP','CEPIM'));
