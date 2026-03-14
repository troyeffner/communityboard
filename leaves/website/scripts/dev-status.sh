#!/usr/bin/env bash
set -euo pipefail

echo "== Server =="
if curl -fsS "http://localhost:3000" >/dev/null 2>&1; then
  echo "OK: http://localhost:3000 responding"
else
  echo "ERROR: http://localhost:3000 not responding"
fi

echo ""
echo "== Dev processes =="
ps aux | grep -E "next dev|node.*next" | grep -v grep || true

echo ""
echo "== Recent marketing events (log) =="
if test -f /tmp/communityboard-dev.log; then
  tail -n 200 /tmp/communityboard-dev.log | sed -n '/\[marketing-event\]/p' | tail -n 20
else
  echo "(no /tmp/communityboard-dev.log yet)"
fi
