CREATE OR REPLACE FUNCTION public.invoke_backfill_servidor_resumos()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO '[literal]'
AS $function$
declare
  anon_key text := '[literal]';
  request_id bigint;
begin
  select net.http_post(
    url := '[literal]',
    headers := jsonb_build_object('[literal]','[literal]','[literal]','[literal]'||anon_key),
    body := jsonb_build_object('[literal]', 10, '[literal]', 3000),
    timeout_milliseconds := 150000
  ) into request_id;
  return request_id;
end; $function$

CREATE OR REPLACE FUNCTION public.invoke_edge_function(function_name text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO '[literal]'
AS $function$
DECLARE
  proj_url TEXT := '[literal]';
  anon_key TEXT := '[literal]';
  request_id BIGINT;
BEGIN
  SELECT net.http_post(
    url := proj_url || '[literal]' || function_name,
    headers := jsonb_build_object(
      '[literal]', '[literal]',
      '[literal]', '[literal]' || anon_key
    ),
    body := '[literal]'::jsonb,
    timeout_milliseconds := 60000
  ) INTO request_id;

  RETURN request_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.invoke_analyze_risco_catchup()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO '[literal]'
AS $function$
DECLARE
  anon_key TEXT := '[literal]';
  request_id BIGINT;
BEGIN
  SELECT net.http_post(
    url := '[literal]',
    headers := jsonb_build_object('[literal]', '[literal]', '[literal]', '[literal]' || anon_key),
    body := jsonb_build_object('[literal]', '[literal]', '[literal]', 12),
    timeout_milliseconds := 120000
  ) INTO request_id;
  RETURN request_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.invoke_edge_function_secure(function_name text, body_json jsonb DEFAULT '[literal]'::jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO '[literal]'
AS $function$
declare
  proj_url text := '[literal]';
  cron_secret text;
  request_id bigint;
begin
  if function_name is null or not (
    function_name = any(array[
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]', '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]',
      '[literal]'
    ]::text[])
  ) then
    raise exception '[literal]', function_name;
  end if;

  if octet_length(body_json::text) > 10000 then
    raise exception '[literal]';
  end if;

  select value into cron_secret
  from public.app_settings
  where key = '[literal]';

  if cron_secret is null or cron_secret = '[literal]' then
    raise exception '[literal]';
  end if;

  select net.http_post(
    url := proj_url || '[literal]' || function_name,
    headers := jsonb_build_object(
      '[literal]', '[literal]',
      '[literal]', cron_secret,
      '[literal]', cron_secret
    ),
    body := body_json,
    timeout_milliseconds := 290000
  ) into request_id;

  return request_id;
end;
$function$
