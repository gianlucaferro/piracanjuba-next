#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/../.." || exit 1
result_dir="artifacts/${1:-individual-edge}"
mkdir -p "$result_dir"
run_check() {
  local label=$1
  shift
  "$@" > "$result_dir/$label.log" 2>&1
  local result=$?
  printf '%s\n' "$result" > "$result_dir/$label.exit"
  printf '%s: exit %s\n' "$label" "$result"
}
run_check types npm exec --yes --package=deno@2.9.6 -- deno check --no-lock supabase/functions/summarize-servidor/index.ts supabase/functions/backfill-servidor-resumos/index.ts &
run_check lint npm exec --yes --package=deno@2.9.6 -- deno lint supabase/functions/summarize-servidor/index.ts supabase/functions/backfill-servidor-resumos/index.ts supabase/functions/_shared/servidor-resumo.ts supabase/functions/_shared/servidor-resumo.test.ts &
wait
exit 0
