#!/usr/bin/env bash
set -euo pipefail

URL="${1:-http://localhost:3000/api/marketing/event}"

curl -fsS "$URL" \
  -H "content-type: application/json" \
  -d '{"name":"telemetry_smoke","path":"/marketing","ref":"terminal","meta":{"ok":true}}' \
  >/dev/null

echo "OK: posted telemetry_smoke to $URL"
