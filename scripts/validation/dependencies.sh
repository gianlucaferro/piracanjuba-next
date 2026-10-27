#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/../.."
phase=${1:?phase required}
result_dir="artifacts/$phase"
mkdir -p "$result_dir"
run_check() {
  label=$1; shift
  "$@" > "$result_dir/$label.log" 2>&1
  code=$?
  printf '%s\n' "$code" > "$result_dir/$label.exit"
  printf '%s: exit %s\n' "$label" "$code"
}
run_check typegen node_modules/.bin/next typegen
run_check tests node --test tests/*.test.ts tests/*.test.mjs &
run_check types node_modules/.bin/tsc --project scripts/validation/tsconfig.app.json --noEmit --pretty false &
run_check lint node_modules/.bin/eslint src next.config.ts --format json &
run_check bus-types npm run typecheck:onibus &
wait
if [ "$phase" != "baseline" ]; then
  run_check compile env NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=validation-fixture NEXT_TELEMETRY_DISABLED=1 npm run build -- --experimental-build-mode compile
fi
node --version > "$result_dir/node-version.txt"
# Mantem artefatos de verificacoes com erro para comparacao; consultar .exit.
exit 0
