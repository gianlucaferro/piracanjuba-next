CREATE OR REPLACE FUNCTION public.ai_guard(p_ip_hash text, p_fn text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_dia date := (now() at time zone 'America/Sao_Paulo')::date;
  v_now timestamptz := now();
  c_daily int := 4000;   -- teto global diário de gerações por IA (circuit breaker)
  c_min int := 15;       -- por IP por minuto
  c_hora int := 80;      -- por IP por hora
  v_min int; v_hora int; v_daily int;
begin
  -- limpeza probabilística das janelas velhas (evita crescimento da tabela)
  if random() < 0.02 then
    delete from ai_rate_limit where janela_inicio < v_now - interval '2 hours';
  end if;

  -- janela por minuto (incrementa com reset se expirou)
  insert into ai_rate_limit(ip_hash, scope, janela_inicio, total) values (p_ip_hash, 'min', v_now, 1)
  on conflict (ip_hash, scope) do update set
    total = case when ai_rate_limit.janela_inicio < v_now - interval '1 minute' then 1 else ai_rate_limit.total + 1 end,
    janela_inicio = case when ai_rate_limit.janela_inicio < v_now - interval '1 minute' then v_now else ai_rate_limit.janela_inicio end
  returning total into v_min;

  -- janela por hora
  insert into ai_rate_limit(ip_hash, scope, janela_inicio, total) values (p_ip_hash, 'hora', v_now, 1)
  on conflict (ip_hash, scope) do update set
    total = case when ai_rate_limit.janela_inicio < v_now - interval '1 hour' then 1 else ai_rate_limit.total + 1 end,
    janela_inicio = case when ai_rate_limit.janela_inicio < v_now - interval '1 hour' then v_now else ai_rate_limit.janela_inicio end
  returning total into v_hora;

  -- budget diário (lê, decide, só incrementa se liberado)
  insert into ai_usage_daily(dia, total) values (v_dia, 0) on conflict (dia) do nothing;
  select total into v_daily from ai_usage_daily where dia = v_dia;

  if v_daily >= c_daily then return jsonb_build_object('allowed', false, 'reason', 'budget'); end if;
  if v_min  > c_min  then return jsonb_build_object('allowed', false, 'reason', 'rate', 'scope', 'minuto'); end if;
  if v_hora > c_hora then return jsonb_build_object('allowed', false, 'reason', 'rate', 'scope', 'hora'); end if;

  update ai_usage_daily set total = total + 1, updated_at = now() where dia = v_dia;
  return jsonb_build_object('allowed', true, 'daily', v_daily + 1);
end;
$function$
