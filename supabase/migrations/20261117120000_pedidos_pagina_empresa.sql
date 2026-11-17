-- Pedidos da página de empresa, vindos de piracanjuba.ai/anuncie/cadastro (decisão do
-- operador de 2026-11-17: pedido gravado no banco + e-mail para o operador).
-- Só a edge function pedido-pagina-empresa (service role) grava e lê; nada público.
-- Tabela e função novas, sem tocar em dados existentes. Rollback:
--   drop function public.criar_pedido_pagina_empresa(jsonb, integer, integer);
--   drop table public.pedidos_pagina_empresa;
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table if not exists public.pedidos_pagina_empresa (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^PBA[2-9A-HJKMNP-Z]{6}$'),
  created_at timestamptz not null default now(),
  status text not null default 'aguardando_pagamento'
    check (status in ('aguardando_pagamento', 'pago', 'publicado', 'cancelado')),
  forma_pagamento text not null check (forma_pagamento in ('pix', 'cartao')),
  valor_centavos integer not null check (valor_centavos > 0),
  comprador_nome text not null check (char_length(comprador_nome) between 2 and 100),
  comprador_email text not null check (char_length(comprador_email) <= 160),
  comprador_whatsapp text not null check (comprador_whatsapp ~ '^[0-9]{10,11}$'),
  comprador_documento text check (comprador_documento ~ '^([0-9]{11}|[0-9]{14})$'),
  empresa_nome text not null check (char_length(empresa_nome) between 2 and 120),
  empresa_categoria text not null check (char_length(empresa_categoria) between 2 and 80),
  empresa_oferta text not null check (char_length(empresa_oferta) between 10 and 1200),
  empresa_whatsapp text not null check (empresa_whatsapp ~ '^[0-9]{10,11}$'),
  empresa_bairro text check (char_length(empresa_bairro) <= 80),
  empresa_endereco text check (char_length(empresa_endereco) <= 160),
  empresa_instagram text check (char_length(empresa_instagram) <= 80),
  empresa_site text check (char_length(empresa_site) <= 200),
  empresa_horario text check (char_length(empresa_horario) <= 160),
  empresa_mapa_url text check (char_length(empresa_mapa_url) <= 500),
  endereco_desejado text check (endereco_desejado ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(endereco_desejado) <= 40),
  observacoes text check (char_length(observacoes) <= 1200),
  ip_hash text not null,
  consentimento_em timestamptz not null,
  -- Preenchidos pelo operador ao conferir o pagamento.
  pago_em timestamptz,
  notas_internas text
);

comment on table public.pedidos_pagina_empresa is
  'Pedidos da página de empresa (R$ 600, pagamento único). Gravados pela edge function pedido-pagina-empresa.';

create index if not exists pedidos_pagina_empresa_ip_recentes
  on public.pedidos_pagina_empresa (ip_hash, created_at desc);
create index if not exists pedidos_pagina_empresa_recentes
  on public.pedidos_pagina_empresa (created_at desc);

alter table public.pedidos_pagina_empresa enable row level security;
revoke all on public.pedidos_pagina_empresa from public, anon, authenticated;
grant select, insert, update on public.pedidos_pagina_empresa to service_role;

-- Limites e gravação numa só transação, sob trava: sem a trava, envios simultâneos
-- passavam todos pela contagem antes de qualquer um gravar (revisão de 2026-11-17).
-- Pedidos cancelados não contam, para o operador liberar a fila cancelando spam.
create or replace function public.criar_pedido_pagina_empresa(
  p_pedido jsonb,
  p_limite_ip_hora integer,
  p_limite_dia integer
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  r public.pedidos_pagina_empresa;
begin
  r := jsonb_populate_record(null::public.pedidos_pagina_empresa, p_pedido);
  if r.ip_hash is null or r.ip_hash = '' then
    raise exception 'ip_hash obrigatório';
  end if;
  perform pg_advisory_xact_lock(hashtext('pedido-pagina-empresa'));
  if (select count(*) from public.pedidos_pagina_empresa
      where ip_hash = r.ip_hash and status <> 'cancelado'
        and created_at > now() - interval '1 hour') >= p_limite_ip_hora then
    return 'limite_ip';
  end if;
  if (select count(*) from public.pedidos_pagina_empresa
      where status <> 'cancelado' and created_at > now() - interval '24 hours') >= p_limite_dia then
    return 'limite_dia';
  end if;
  insert into public.pedidos_pagina_empresa (
    codigo, forma_pagamento, valor_centavos,
    comprador_nome, comprador_email, comprador_whatsapp, comprador_documento,
    empresa_nome, empresa_categoria, empresa_oferta, empresa_whatsapp,
    empresa_bairro, empresa_endereco, empresa_instagram, empresa_site, empresa_horario,
    empresa_mapa_url, endereco_desejado, observacoes, ip_hash, consentimento_em
  ) values (
    r.codigo, r.forma_pagamento, r.valor_centavos,
    r.comprador_nome, r.comprador_email, r.comprador_whatsapp, r.comprador_documento,
    r.empresa_nome, r.empresa_categoria, r.empresa_oferta, r.empresa_whatsapp,
    r.empresa_bairro, r.empresa_endereco, r.empresa_instagram, r.empresa_site, r.empresa_horario,
    r.empresa_mapa_url, r.endereco_desejado, r.observacoes, r.ip_hash, r.consentimento_em
  );
  return 'ok';
end;
$fn$;

revoke all on function public.criar_pedido_pagina_empresa(jsonb, integer, integer) from public, anon, authenticated;
grant execute on function public.criar_pedido_pagina_empresa(jsonb, integer, integer) to service_role;

commit;
