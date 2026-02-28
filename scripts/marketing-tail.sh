#!/usr/bin/env bash
set -euo pipefail

LOG="${1:-/tmp/communityboard-dev.log}"
test -f "$LOG" || { echo "No log found at $LOG"; exit 1; }

echo "Tailing marketing events from: $LOG"
echo "Press Ctrl+C to stop."
tail -n 200 -f "$LOG" | sed -n '/\[marketing-event\]/p'
