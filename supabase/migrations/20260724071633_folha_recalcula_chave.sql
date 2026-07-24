-- Recalcula as chaves gravadas pelo primeiro deploy antes de inserir os tipos
-- adicionais da mesma competencia.
update public.prefeitura_folha_nucleogov
set chave = concat_ws(
  '|',
  ano::text,
  lpad(mes::text, 2, '0'),
  portal_id::text,
  replace(
    upper(trim(regexp_replace(unaccent(coalesce(tipo_folha, '')), '\s+', ' ', 'g'))),
    '|',
    '/'
  ),
  replace(
    upper(trim(regexp_replace(unaccent(coalesce(tipo_movimentacao, '')), '\s+', ' ', 'g'))),
    '|',
    '/'
  )
);
