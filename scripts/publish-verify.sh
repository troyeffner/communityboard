#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

echo "== Latest commits =="
git --no-pager log -n 5 --oneline
echo ""

echo "== GitHub remote =="
git remote get-url origin
echo ""

echo "== Confirm tests still green =="
npx playwright test
