-- Pre-geracao noturna dos resumos de salario de servidor. ~99% dos 1.639 servidores
-- nao tinham resumo em cache, entao toda visualizacao gerava ao vivo e batia no rate
-- limit do Gemini (sintoma: "clico 3-4x ate aparecer"). Pre-gerando de madrugada, a
-- visualizacao do cidadao vira cache hit instantaneo.

-- 1. Servidores que ainda nao tem nenhum resumo em cache (prioriza quem nunca gerou).
create or replace function public.servidores_sem_resumo(lim int default 12)
returns table(id uuid)
language sql stable security definer set search_path to 'public'
as $$
  select s.id from public.servidores s
  where exists (select 1 from public.remuneracao_servidores r where r.servidor_id = s.id)
    and not exists (
      select 1 from public.resumos_ia_cache c
      where c.contexto = 'servidor' and c.chave like s.id::text || ':%'
    )
  limit lim;
$$;

-- 2. Wrapper chamado pelo cron.
create or replace function public.invoke_backfill_servidor_resumos()
returns bigint language plpgsql security definer set search_path to 'public' as $func$
declare
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbndlb2NxY3B0d3hxc3p0bGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MDA2NTUsImV4cCI6MjA5MzM3NjY1NX0.TFstJJgPZDauChUdhuBAcL8KX5FtGONaVNao7FU5lMQ';
  request_id bigint;
begin
  select net.http_post(
    url := 'https://oinweocqcptwxqsztlcl.supabase.co/functions/v1/backfill-servidor-resumos',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||anon_key),
    body := jsonb_build_object('batch_size', 10, 'delay_ms', 3000),
    timeout_milliseconds := 150000
  ) into request_id;
  return request_id;
end; $func$;

-- 3. Cron: madrugada (06-10 UTC = 03-07 BRT), minutos 5,15,25,35,45,55 pra intercalar
-- com o Radar (minutos 0,10,20...) e nao estourar o rate limit ao mesmo tempo.
select cron.schedule('backfill-servidor-resumos-madrugada', '5-59/10 6-10 * * *',
  $cron$select public.invoke_backfill_servidor_resumos();$cron$);
