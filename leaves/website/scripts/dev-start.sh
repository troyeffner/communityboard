#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

# kill any previous dev
pkill -f "next dev" 2>/dev/null || true
pkill -f "node.*next" 2>/dev/null || true

# clear stale cache/lock (optional but helps when Next gets weird)
rm -f .next/dev/lock 2>/dev/null || true

echo "Starting dev server (logs -> /tmp/communityboard-dev.log)"
nohup npm run dev >/tmp/communityboard-dev.log 2>&1 &

echo "PID: $!"
echo "Wait for http://localhost:3000 ..."
for i in {1..30}; do
  if curl -fsS "http://localhost:3000" >/dev/null 2>&1; then
    echo "OK: server responding."
    exit 0
  fi
  sleep 1
done

echo "ERROR: server did not respond after 30s"
echo "Tail log:"
tail -n 80 /tmp/communityboard-dev.log || true
exit 1
