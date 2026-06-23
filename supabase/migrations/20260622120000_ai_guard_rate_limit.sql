-- Guard rails das chamadas de IA (resumos + chatbot): rate limit por IP + circuit breaker diário.
-- Aplicado pelas edge functions via service_role (helper _shared/ratelimit.ts -> RPC ai_guard),
-- sempre logo antes da chamada à IA (cache-hit retorna antes e não conta).
create table if not exists public.ai_usage_daily (
  dia date primary key,
  total int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_rate_limit (
  ip_hash text not null,
  scope text not null,            -- 'min' | 'hora'
  janela_inicio timestamptz not null default now(),
  total int not null default 0,
  primary key (ip_hash, scope)
);

alter table public.ai_usage_daily enable row level security;
alter table public.ai_rate_limit enable row level security;
-- Sem policies de propósito: bloqueado para anon/authenticated. service_role e a RPC (security definer) acessam.

create or replace function public.ai_guard(p_ip_hash text, p_fn text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia date := (now() at time zone 'America/Sao_Paulo')::date;
  v_now timestamptz := now();
  c_daily int := 4000;   -- teto global diário de gerações por IA (circuit breaker)
  c_min int := 15;       -- por IP por minuto
  c_hora int := 80;      -- por IP por hora
  v_min int; v_hora int; v_daily int;
begin
  if random() < 0.02 then
    delete from ai_rate_limit where janela_inicio < v_now - interval '2 hours';
  end if;

  insert into ai_rate_limit(ip_hash, scope, janela_inicio, total) values (p_ip_hash, 'min', v_now, 1)
  on conflict (ip_hash, scope) do update set
    total = case when ai_rate_limit.janela_inicio < v_now - interval '1 minute' then 1 else ai_rate_limit.total + 1 end,
    janela_inicio = case when ai_rate_limit.janela_inicio < v_now - interval '1 minute' then v_now else ai_rate_limit.janela_inicio end
  returning total into v_min;

  insert into ai_rate_limit(ip_hash, scope, janela_inicio, total) values (p_ip_hash, 'hora', v_now, 1)
  on conflict (ip_hash, scope) do update set
    total = case when ai_rate_limit.janela_inicio < v_now - interval '1 hour' then 1 else ai_rate_limit.total + 1 end,
    janela_inicio = case when ai_rate_limit.janela_inicio < v_now - interval '1 hour' then v_now else ai_rate_limit.janela_inicio end
  returning total into v_hora;

  insert into ai_usage_daily(dia, total) values (v_dia, 0) on conflict (dia) do nothing;
  select total into v_daily from ai_usage_daily where dia = v_dia;

  if v_daily >= c_daily then return jsonb_build_object('allowed', false, 'reason', 'budget'); end if;
  if v_min  > c_min  then return jsonb_build_object('allowed', false, 'reason', 'rate', 'scope', 'minuto'); end if;
  if v_hora > c_hora then return jsonb_build_object('allowed', false, 'reason', 'rate', 'scope', 'hora'); end if;

  update ai_usage_daily set total = total + 1, updated_at = now() where dia = v_dia;
  return jsonb_build_object('allowed', true, 'daily', v_daily + 1);
end;
$$;

revoke all on function public.ai_guard(text, text) from public, anon, authenticated;
grant execute on function public.ai_guard(text, text) to service_role;
