#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

echo "== Repo =="
pwd
echo ""

echo "== Check Trello CSS marker in app/globals.css =="
if rg -n "CB_TRELLO_POSTER_VIEW" app/globals.css >/dev/null; then
  rg -n "CB_TRELLO_POSTER_VIEW" app/globals.css
else
  echo "MISSING: CB_TRELLO_POSTER_VIEW not found in app/globals.css"
fi
echo ""

echo "== Check cbPosterView class usage in PosterViewer.tsx =="
if rg -n "cbPosterView" "app/poster/\\[id\\]/PosterViewer.tsx" >/dev/null; then
  rg -n "cbPosterView" "app/poster/\\[id\\]/PosterViewer.tsx"
else
  echo "MISSING: cbPosterView not found in PosterViewer.tsx"
fi
echo ""

echo "== Check for max-width constraints in page wrapper (common culprit) =="
if [[ -f "app/poster/[id]/page.tsx" ]]; then
  echo "-- app/poster/[id]/page.tsx (hits for max-w/container/mx-auto) --"
  rg -n "max-w|container|mx-auto|w-\\[" "app/poster/\\[id\\]/page.tsx" || echo "(no obvious constraints found)"
else
  echo "MISSING: app/poster/[id]/page.tsx not found"
fi
echo ""

echo "== NOTE =="
echo "If you're testing http://localhost:3000/poster/e2e-fixture : that route often renders a simplified fixture (stage-only)."
echo "To verify Trello layout, test a REAL poster id route with items, like:"
echo "  http://localhost:3000/poster/<REAL_ID>"
