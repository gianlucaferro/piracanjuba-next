#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
container="paid-endpoints-fixture-$$"
results="$root/artifacts/paid-security"
mkdir -p "$results"
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run --rm -d --name "$container" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17 >/dev/null
for attempt in {1..60}; do
  if docker exec "$container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
run_sql() { docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
run_sql < "$root/tests/sql/paid-endpoints-fixture.sql"
run_sql < "$root/supabase/migrations/20260622120000_ai_guard_rate_limit.sql"
run_sql < "$root/supabase/migrations/20261104010000_protect_paid_admin_endpoints.sql"
run_sql < "$root/tests/sql/paid-endpoints-assertions.sql"
pids=()
for slot in {1..8}; do
  run_sql -tAc "select (public.ai_guard('parallel-$slot','fixture')->>'allowed')::boolean" > "$results/reservation-$slot.txt" &
  pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
allowed=0
for slot in {1..8}; do
  if [ "$(tr -d '[:space:]' < "$results/reservation-$slot.txt")" = t ]; then allowed=$((allowed+1)); fi
done
[ "$allowed" = 1 ]
run_sql -c "SELECT public.fixture_assert(total=4000,'concorrência respeita último slot') FROM ai_usage_daily WHERE dia=(now() AT TIME ZONE 'America/Sao_Paulo')::date;"
# O rollback da quota restaura sua definição, mantendo wrappers privados e dados.
run_sql < "$root/supabase/migrations/20260622120000_ai_guard_rate_limit.sql"
run_sql < "$root/supabase/migrations/20261104010000_protect_paid_admin_endpoints.sql"
run_sql -c "SELECT public.fixture_assert(total=4000,'reaplicação preserva consumo') FROM ai_usage_daily WHERE dia=(now() AT TIME ZONE 'America/Sao_Paulo')::date;"
# Um ambiente novo não tem a função opcional encontrada em produção.
run_sql -c "DROP FUNCTION public.invoke_enrich_cnpj(text,integer);"
run_sql < "$root/supabase/migrations/20261104010000_protect_paid_admin_endpoints.sql"
run_sql -c "SELECT public.fixture_assert(to_regprocedure('public.invoke_enrich_cnpj(text,integer)') IS NULL,'migration aceita função opcional ausente');"
printf 'PostgreSQL: ACLs, wrappers, quotas, função opcional e 8 reservas concorrentes aprovados.\n'
