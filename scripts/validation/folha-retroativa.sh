#!/usr/bin/env bash
# Gera evidencias no worker, sem alterar os arquivos fonte espelhados.
set -u
cd "$(dirname "$0")/../.." || exit 1
result_dir="artifacts/${1:-folha-retroativa}"
mkdir -p "$result_dir"
run_check() {
  local label=$1
  shift
  "$@" > "$result_dir/$label.log" 2>&1
  local result=$?
  printf '%s\n' "$result" > "$result_dir/$label.exit"
  printf '%s: exit %s\n' "$label" "$result"
}
run_check edge-types npm exec --yes --package=deno@2.9.6 -- deno check supabase/functions/sync-camara-servidores/index.ts supabase/functions/sync-folha-prefeitura-nucleogov/index.ts &
run_check edge-lint npm exec --yes --package=deno@2.9.6 -- deno lint supabase/functions/_shared/folha-retroativa.ts supabase/functions/_shared/folha-retroativa.test.ts supabase/functions/_shared/nucleogov-folha.ts supabase/functions/_shared/nucleogov-folha.test.ts supabase/functions/_shared/nucleogov-sync.ts supabase/functions/sync-camara-servidores/index.ts &
run_check source-preflight npm exec --yes --package=deno@2.9.6 -- deno run --allow-env=SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,CRON_SECRET,CENTI_INGEST_SECRET --allow-net=acessoainformacao.piracanjuba.go.leg.br,acessoainformacao.piracanjuba.go.gov.br --no-prompt scripts/validation/folha-fontes-preflight.mjs &
wait
exit 0
