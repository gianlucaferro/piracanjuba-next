-- Nota oficial da ANP (0 a 5) do app "ANP com Você", extraída da lista pública
-- por município (parse do modelo do relatório APEX; cs estável por município,
-- logo automatizável por HTTP). Campo populado pelo sync-postos-combustivel.
alter table public.postos_combustivel
  add column if not exists nota smallint,
  add column if not exists nota_atualizada_em timestamptz;
