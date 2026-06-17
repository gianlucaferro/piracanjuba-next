-- A policy de leitura publica de pessoa_publica e USING (ativo = true). A prefeita estava
-- com ativo=false, escondendo a linha do anon e deixando o card de doadores do Executivo
-- (chapa) vazio. Marca prefeito/vice como ativos (mandato vigente, dado publico).
update public.pessoa_publica
  set ativo = true
  where cargo_categoria in ('prefeito', 'vice_prefeito')
    and ativo is distinct from true;
