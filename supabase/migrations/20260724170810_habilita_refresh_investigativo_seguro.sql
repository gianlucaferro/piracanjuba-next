-- O pg_safeupdate permanece ativo. Os refreshes controlados recebem uma
-- clausula explicita, exigida quando sao chamados pelo service_role.

do $$
declare
  definicao text;
  corrigida text;
begin
  select pg_get_functiondef(
    'public.refresh_cadastro_canonico_investigativo()'::regprocedure
  )
  into definicao;

  corrigida := replace(
    definicao,
    E'  update public.entidade_canonica\n'
      || E'  set ativo = false, updated_at = now();',
    E'  update public.entidade_canonica\n'
      || E'  set ativo = false, updated_at = now()\n'
      || E'  where true;'
  );
  corrigida := replace(
    corrigida,
    E'  update public.relacao_entidade\n'
      || E'  set ativo = false, updated_at = now();',
    E'  update public.relacao_entidade\n'
      || E'  set ativo = false, updated_at = now()\n'
      || E'  where true;'
  );

  if corrigida = definicao then
    raise exception
      'refresh_cadastro_canonico_investigativo nao recebeu a correcao';
  end if;
  execute corrigida;

  select pg_get_functiondef(
    'public.recalcular_indicios_contratacao()'::regprocedure
  )
  into definicao;

  corrigida := replace(
    definicao,
    E'  update public.indicio_contratacao\n'
      || E'  set ativo = false, atualizado_em = now();',
    E'  update public.indicio_contratacao\n'
      || E'  set ativo = false, atualizado_em = now()\n'
      || E'  where true;'
  );

  if corrigida = definicao then
    raise exception 'recalcular_indicios_contratacao nao recebeu a correcao';
  end if;
  execute corrigida;
end
$$;

select public.refresh_investigacao_piracanjuba();
