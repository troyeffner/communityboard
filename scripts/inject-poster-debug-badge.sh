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

if "cbPosterDebugBadge" in s:
    print("OK: debug badge already present")
    raise SystemExit(0)

# Insert immediately after first "return (" line
m = re.search(r"return\s*\(\s*", s)
if not m:
    raise SystemExit("ERROR: could not find return(")

insert = 'return (\n    <div className="cbPosterDebugBadge">PosterViewer rendered</div>\n'
s = s[:m.start()] + insert + s[m.end():]

p.write_text(s, encoding="utf-8")
print("PATCHED: injected debug badge into PosterViewer")
PY

echo "Done. Restart dev to see badge."
