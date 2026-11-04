#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/../.."
root="$PWD"
result_dir=artifacts/public-writes
mkdir -p "$result_dir"
run_check() {
  local label=$1
  shift
  "$@" > "$result_dir/$label.log" 2>&1
  local code=$?
  printf '%s\n' "$code" > "$result_dir/$label.exit"
  printf '%s: exit %s\n' "$label" "$code"
}
sql_check() (
  set -e
  container="piracanjuba-public-writes-$$"
  trap 'docker rm -fv "$container" >/dev/null 2>&1 || true' EXIT
  docker run -d --name "$container" --network none -e POSTGRES_HOST_AUTH_METHOD=trust \
    --mount "type=bind,src=$root,dst=/repo,readonly" postgres:17 >/dev/null
  for attempt in $(seq 1 30); do
    if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
    sleep 1
  done
  docker exec "$container" psql -U postgres -f /repo/tests/sql/public-writes.test.sql
)
run_check types npm run typecheck &
run_check lint npm run lint &
if [ "${1:-all}" != "frontend-sql" ]; then
  run_check tests npm test &
  run_check edge docker run --rm --mount "type=bind,src=$root,dst=/app,readonly" -w /app \
    denoland/deno:2.5.6 deno test --no-lock supabase/functions/_shared/farmacia-admin.test.ts &
  run_check edge-types docker run --rm --mount "type=bind,src=$root,dst=/app,readonly" -w /app \
    denoland/deno:2.5.6 deno check --no-lock supabase/functions/admin-farmacia-update/index.ts &
fi
run_check sql sql_check &
wait
run_check compile env NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=validation-fixture NEXT_TELEMETRY_DISABLED=1 npm run build -- --experimental-build-mode compile
result=0
for check in types lint tests edge edge-types sql compile; do
  if [ ! -f "$result_dir/$check.exit" ] || [ "$(cat "$result_dir/$check.exit")" != 0 ]; then result=1; fi
done
printf '%s\n' "$result" > "$result_dir/quality.exit"
exit 0
