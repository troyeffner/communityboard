#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

FILE=".local/marketing-events.ndjson"
test -f "$FILE" || { echo "No events yet at $REPO/$FILE"; exit 0; }

tail -n 60 "$FILE"
