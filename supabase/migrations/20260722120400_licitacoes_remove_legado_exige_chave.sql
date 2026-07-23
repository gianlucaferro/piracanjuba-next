-- As 20 linhas com fonte='legado' foram removidas: eram transcrições manuais de
-- baixa fidelidade, com número, ANO e data comprovadamente errados (ex.: o portal
-- oficial traz "43/2026" publicada em 2026-02-12, e o legado registrava
-- "PE 043/2025" em 2025-11-15). Sem valor, sem órgão e com fonte_url genérica.
-- Todas correspondiam a procedimentos que agora existem com fidelidade total.
-- Manter dado cívico incorreto no ar seria pior que não ter o registro.
delete from public.licitacoes where fonte = 'legado';

-- Garantia de rastreabilidade: toda licitação publicada precisa ter o id interno
-- do portal (`chave`), para que qualquer registro no site seja verificável na fonte.
-- O sync já descarta e reporta registros sem chave antes de inserir.
alter table public.licitacoes alter column chave set not null;
