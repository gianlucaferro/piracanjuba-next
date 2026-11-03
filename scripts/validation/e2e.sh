#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/../.." || exit 1
result_dir="artifacts/${1:-e2e}"
if [ "$#" -gt 0 ]; then shift; fi
mkdir -p "$result_dir"
printf '1\n' > "$result_dir/e2e.exit"
npx playwright install chromium > "$result_dir/install.log" 2>&1
installed=$?
if [ "$installed" != 0 ]; then
  printf '%s\n' "$installed" > "$result_dir/e2e.exit"
  printf 'browser install: exit %s\n' "$installed"
  exit 0
fi
npm run test:e2e -- "$@" > "$result_dir/e2e.log" 2>&1
result=$?
printf '%s\n' "$result" > "$result_dir/e2e.exit"
printf 'e2e: exit %s\n' "$result"
# Retorna relatórios inclusive em falha; e2e.exit é o gate obrigatório.
exit 0
