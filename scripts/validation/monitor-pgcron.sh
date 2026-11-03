#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
container="piracanjuba-monitor-pgcron-$$"
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --name "$container" --network none \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  --mount "type=bind,src=$root,dst=/repo,readonly" \
  postgres:17 >/dev/null
for attempt in $(seq 1 30); do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$container" psql -U postgres -Atc 'select version();'
docker exec "$container" psql -U postgres -f /repo/tests/sql/monitor-pgcron.test.sql
docker exec "$container" psql -U postgres -f /repo/tests/grupos-snapshot-postgres.sql
