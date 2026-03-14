#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

FILE="app/poster/[id]/PosterViewer.tsx"
test -f "$FILE" || { echo "ERROR: missing $FILE"; exit 1; }

STAMP="$(date +%s)"
cp "$FILE" "${FILE}.bak.${STAMP}"
echo "Backed up $FILE -> ${FILE}.bak.${STAMP}"

python3 - <<'PY'
from pathlib import Path
import re

p = Path("app/poster/[id]/PosterViewer.tsx")
s = p.read_text(encoding="utf-8")

# Wrap the FIRST top-level return container in a forced layout grid
# We assume something like: return ( <div className="..."> ...
# We'll replace the FIRST outer div only.

pattern = r"return\s*\(\s*<div([^>]*)>"
match = re.search(pattern, s)

if not match:
    print("ERROR: Could not find top-level return <div>")
    raise SystemExit(1)

original = match.group(0)

replacement = """return (
  <div className="cb-posterViewGrid">"""

s = s.replace(original, replacement, 1)

p.write_text(s, encoding="utf-8")
print("PATCHED: forced cb-posterViewGrid wrapper")
PY

echo ""
echo "Restart dev:"
echo "pkill -f 'next dev' || true"
echo "rm -rf .next"
echo "npm run dev"
