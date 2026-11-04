#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/../.."
mkdir -p artifacts/paid-security
node --test tests/*.test.ts tests/*.test.mjs > artifacts/paid-security/node-tests.log 2>&1
node_status=$?
bash tests/paid-endpoints-postgres.sh > artifacts/paid-security/postgres.log 2>&1
sql_status=$?
printf '{"node_exit":%d,"sql_exit":%d}\n' "$node_status" "$sql_status" > artifacts/paid-security/checks.json
cat artifacts/paid-security/checks.json
# O resultado fica no artefato para permitir o pull mesmo em falha.
exit 0
