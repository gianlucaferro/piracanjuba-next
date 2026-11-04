CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE SCHEMA net;
CREATE TABLE public.app_settings(key text PRIMARY KEY, value text);
INSERT INTO public.app_settings VALUES ('cron_secret','fixture-internal');
CREATE TABLE public.fixture_requests(id bigint GENERATED ALWAYS AS IDENTITY, url text, headers jsonb, body jsonb, timeout_ms int);
CREATE FUNCTION net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds int) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE rid bigint;
BEGIN
 INSERT INTO public.fixture_requests(url,headers,body,timeout_ms) VALUES(url,headers,body,timeout_milliseconds) RETURNING id INTO rid;
 RETURN rid;
END; $$;
CREATE FUNCTION public.invoke_enrich_cnpj(text, integer) RETURNS void LANGUAGE sql AS 'SELECT';
CREATE FUNCTION public.fixture_assert(condition boolean, message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion: %',message; END IF; END; $$;
