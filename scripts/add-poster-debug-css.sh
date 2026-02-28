#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

CSS="app/globals.css"
test -f "$CSS" || { echo "ERROR: missing $CSS"; exit 1; }

if rg -n "CB_POSTER_DEBUG_BADGE" "$CSS" >/dev/null; then
  echo "OK: debug css already present"
  exit 0
fi

cat >> "$CSS" <<'CSS'

/* CB_POSTER_DEBUG_BADGE */
.cbPosterDebugBadge {
  position: fixed;
  left: 12px;
  bottom: 12px;
  z-index: 9999;
  background: #111827;
  color: #fff;
  padding: 8px 10px;
  border-radius: 999px;
  font-size: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.25);
}
CSS

echo "PATCHED: added CB_POSTER_DEBUG_BADGE to app/globals.css"
