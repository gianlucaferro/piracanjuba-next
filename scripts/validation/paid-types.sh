#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/../.."
mkdir -p artifacts/paid-security
npm run typecheck > artifacts/paid-security/typecheck.log 2>&1
types=$?
npm run lint -- --format json > artifacts/paid-security/lint.log 2>&1
lint=$?
npm exec --yes --package=deno@2.9.6 -- deno test supabase/functions/_shared/*test.ts > artifacts/paid-security/deno-tests.log 2>&1
deno_tests=$?
npm exec --yes --package=deno@2.9.6 -- deno check --no-lock supabase/functions/ai-search/index.ts supabase/functions/chatbot/index.ts supabase/functions/backfill-servidor-resumos/index.ts supabase/functions/analyze-contrato-risco/index.ts supabase/functions/summarize-servidor/index.ts > artifacts/paid-security/edge-types.log 2>&1
edge=$?
printf '{"types":%d,"lint":%d,"deno_tests":%d,"edge_types":%d}\n' "$types" "$lint" "$deno_tests" "$edge" > artifacts/paid-security/type-checks.json
cat artifacts/paid-security/type-checks.json
exit 0
