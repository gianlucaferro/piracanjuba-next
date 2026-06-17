-- Aba de obras (e objeto de contratos) mostrava entidades HTML cruas (&#xC3;O = ÇÃO,
-- &#xC9; = É, etc) porque o scraper guardava o texto sem decodificar. Funcao de decode
-- reutilizavel + correcao dos dados existentes (idempotente: so toca quem tem '&#').

create or replace function public.decode_html_entities(s text) returns text
language plpgsql immutable as $$
declare result text := s; m text; code int;
begin
  if result is null then return null; end if;
  loop  -- hex &#xNN;
    m := substring(result from '&#[xX][0-9A-Fa-f]+;');
    exit when m is null;
    code := ('x' || lpad(substring(m from '[0-9A-Fa-f]+'), 8, '0'))::bit(32)::int;
    result := replace(result, m, chr(code));
  end loop;
  loop  -- decimal &#NN;
    m := substring(result from '&#[0-9]+;');
    exit when m is null;
    code := substring(m from '[0-9]+')::int;
    result := replace(result, m, chr(code));
  end loop;
  result := replace(result, '&amp;', '&');
  result := replace(result, '&quot;', '"');
  result := replace(result, '&apos;', '''');
  result := replace(result, '&lt;', '<');
  result := replace(result, '&gt;', '>');
  result := replace(result, '&nbsp;', ' ');
  return result;
end $$;

update public.contratos set objeto = public.decode_html_entities(objeto) where objeto like '%&#%';
update public.obras set nome = public.decode_html_entities(nome) where nome like '%&#%';
