#!/usr/bin/env bash
# Salva todos os resultados para o transporte do worker; quality.exit é o gate.
set -u
cd "$(dirname "$0")/../.."
result_dir="artifacts/${1:-quality}"
mkdir -p "$result_dir"
run_check() {
  local label=$1
  shift
  "$@" > "$result_dir/$label.log" 2>&1
  local code=$?
  printf '%s\n' "$code" > "$result_dir/$label.exit"
  printf '%s: exit %s\n' "$label" "$code"
}
run_check types npm run typecheck &
run_check lint npm run lint -- --format json &
run_check tests npm test &
run_check sync-tests npm exec --yes --package=deno@2.9.6 -- deno test supabase/functions/_shared/*test.ts &
wait
run_check compile env NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=validation-fixture NEXT_TELEMETRY_DISABLED=1 npm run build -- --experimental-build-mode compile
result=0
for check in types lint tests sync-tests compile; do
  if [ "$(cat "$result_dir/$check.exit")" != 0 ]; then result=1; fi
done
printf '%s\n' "$result" > "$result_dir/quality.exit"
node --version > "$result_dir/node-version.txt"
exit 0
