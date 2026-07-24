begin;

do $$
declare
  painel jsonb;
begin
  select public.funprepi_dashboard() into painel;

  if painel->>'divida_status' is distinct from 'nao_publicada' then
    raise exception 'status da divida incorreto: %', painel;
  end if;

  if (painel->>'orgao_id')::integer <> 44 then
    raise exception 'painel consultou orgao diferente de 44';
  end if;

  if jsonb_array_length(painel->'serie_anual') = 0 then
    raise exception 'serie anual vazia';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(painel->'fornecedores_externos') item
    where upper(item->>'nome')
      like '%FUNDO DE PREVIDENCIA SOCIAL DE PIRACANJUBA%'
  ) then
    raise exception 'o proprio fundo apareceu como fornecedor externo';
  end if;
end;
$$;

rollback;
