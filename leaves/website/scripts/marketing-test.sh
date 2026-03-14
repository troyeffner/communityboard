#!/usr/bin/env bash
set -euo pipefail

URL="${1:-http://localhost:3000/api/marketing/event}"

for i in {1..12}; do
  curl -fsS "$URL" \
    -H "content-type: application/json" \
    -d "{\"name\":\"cta_click\",\"path\":\"/marketing\",\"ref\":\"terminal\",\"meta\":{\"i\":$i}}" \
    >/dev/null
done

echo "Sent 12 events to $URL"
