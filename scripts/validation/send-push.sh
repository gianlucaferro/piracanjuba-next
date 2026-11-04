#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/../.."
out="artifacts/send-push-2026-11-04"
mkdir -p "$out"
run_check() {
  local name="$1"
  shift
  "$@" >"$out/$name.log" 2>&1
  local status=$?
  printf '%s\n' "$status" >"$out/$name.exit"
}
if [[ "${1:-all}" == "all" ]]; then
  run_check node-tests npm test &
  run_check lint npm run lint &
fi
run_check sync-tests npm exec --yes --package=deno@2.9.6 -- deno test --no-lock supabase/functions/_shared/*test.ts &
run_check edge-types npm exec --yes --package=deno@2.9.6 -- deno check --no-lock supabase/functions/send-push/index.ts supabase/functions/sync-prefeitura-diaria/index.ts supabase/functions/sync-prefeitura-mensal/index.ts supabase/functions/import-folha-manual/index.ts supabase/functions/import-folha-xlsx/index.ts &
wait
python3 - "$out" <<'PY'
import json, pathlib, sys
root = pathlib.Path(sys.argv[1])
results = {p.stem: int(p.read_text()) for p in sorted(root.glob('*.exit'))}
(root / 'results.json').write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps(results))
PY
# O retorno zero permite recolher também evidências de falha. O gate é results.json.
exit 0
