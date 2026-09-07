#!/usr/bin/env bash
set -euo pipefail
test_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_container="health-snapshot-fixture-$$"
cleanup() { docker rm -f "$test_container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
# PostgreSQL 17 corresponde a versao principal de producao. Sem porta, volume
# persistente ou credencial. Somente fixtures sinteticas neste container.
docker run --rm -d --name "$test_container" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17 >/dev/null
for attempt in {1..60}; do
  # O servidor temporario de initdb usa apenas socket. Esperar TCP interno
  # evita executar fixtures enquanto esse servidor temporario encerra.
  if docker exec "$test_container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec -i "$test_container" psql -U postgres -v ON_ERROR_STOP=1 -q <<'SQL'
create role anon;
create role authenticated;
create role service_role;
create table public.saude_indicadores (
  id uuid primary key default gen_random_uuid(), categoria text not null,
  indicador text not null, ano integer not null, mes integer,
  semana_epidemiologica integer, valor numeric, valor_texto text,
  fonte text, fonte_url text, updated_at timestamptz default now()
);
create unique index idx_saude_indicadores_unique on public.saude_indicadores
  (categoria, indicador, ano, coalesce(mes, 0), coalesce(semana_epidemiologica, 0));
create table public.sync_log (
  id uuid primary key default gen_random_uuid(), tipo text, status text,
  detalhes jsonb, started_at timestamptz default now(), finished_at timestamptz
);
SQL
# Testa o RPC integral; o footer cron depende da definicao/agenda de producao
# e tem seus hashes verificados pelo proprio cutover, sem acesso neste teste.
awk '/-- HEALTH_SNAPSHOT_CRON_CUTOVER/ {exit} {print}' "$test_root/supabase/migrations/20260907155303_saude_snapshot_atomico.sql" |
  docker exec -i "$test_container" psql -U postgres -v ON_ERROR_STOP=1 -q
docker exec -i "$test_container" psql -U postgres -v ON_ERROR_STOP=1 -q < "$test_root/tests/health-snapshot-postgres.sql"
