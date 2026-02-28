#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

CSS="app/globals.css"
test -f "$CSS" || { echo "ERROR: missing $CSS"; exit 1; }

if rg -n "CB_POSTER_FULLBLEED" "$CSS" >/dev/null; then
  echo "OK: fullbleed css already present"
  exit 0
fi

cat >> "$CSS" <<'CSS'

/* CB_POSTER_FULLBLEED */
.cbPosterPageFullBleed {
  max-width: none !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 16px !important;
}
CSS

echo "PATCHED: added CB_POSTER_FULLBLEED to app/globals.css"
