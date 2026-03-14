#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

FILE="app/poster/[id]/page.tsx"
test -f "$FILE" || { echo "ERROR: missing $FILE"; exit 1; }

STAMP="$(date +%s)"
cp "$FILE" "${FILE}.bak.${STAMP}"
echo "Backed up $FILE -> ${FILE}.bak.${STAMP}"

python3 - <<'PY'
from pathlib import Path
import re

p = Path("app/poster/[id]/page.tsx")
s = p.read_text(encoding="utf-8")

if "cbPosterPageFullBleed" in s:
    print("OK: already wired cbPosterPageFullBleed")
    raise SystemExit(0)

# Prefer main wrapper
m = re.search(r"<main([^>]*)>", s)
tag = "main"
if not m:
    m = re.search(r"<div([^>]*)>", s)
    tag = "div"
if not m:
    raise SystemExit("ERROR: could not find <main> or <div> wrapper in page.tsx")

attrs = m.group(1)
if "className=" in attrs:
    m2 = re.search(r'className\s*=\s*{?\s*["\']([^"\']*)["\']\s*}?', attrs)
    if m2:
        old = m2.group(0)
        cls = m2.group(1)
        new = old.replace(cls, cls + " cbPosterPageFullBleed")
        s = s.replace(old, new, 1)
    else:
        # className exists but not simple string; add wrapper className is hard safely
        # fall back to adding a surrounding div
        pass
else:
    s = s.replace(m.group(0), f"<{tag}{attrs} className=\"cbPosterPageFullBleed\">", 1)

p.write_text(s, encoding="utf-8")
print("PATCHED: wired cbPosterPageFullBleed onto poster page wrapper")
PY
