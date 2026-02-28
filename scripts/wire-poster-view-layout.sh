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

changed = False

# Add cb-posterViewGrid to first grid wrapper
m = re.search(r'className=\{?["\']([^"\']*?\bgrid\b[^"\']*)["\']\}?', s)
if m and "cb-posterViewGrid" not in m.group(1):
    old = m.group(0)
    cls = m.group(1).strip()
    new_cls = cls + " cb-posterViewGrid"
    s = s.replace(old, f'className="{new_cls}"', 1)
    changed = True

# Add cb-railScroll to rail container
idx = s.find("Other items on this poster")
if idx != -1:
    before = s[:idx]
    mm = list(re.finditer(r'className=["\']([^"\']+)["\']', before))
    if mm:
        last = mm[-1]
        cls = last.group(1)
        if "cb-railScroll" not in cls:
            start, end = last.span(1)
            s = s[:start] + cls + " cb-railScroll" + s[end:]
            changed = True

p.write_text(s, encoding="utf-8")
print("PATCHED" if changed else "OK: no changes applied")
PY

echo ""
echo "Restart dev:"
echo "pkill -f 'next dev' || true"
echo "rm -rf .next"
echo "npm run dev"
