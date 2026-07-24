-- O helper legado tambem aceita um nome de funcao arbitrario. Os jobs do
-- pg_cron executam como postgres, portanto a API publica nao precisa acessa-lo.
revoke execute on function public.invoke_edge_function(text)
  from public, anon, authenticated;
grant execute on function public.invoke_edge_function(text)
  to postgres;
