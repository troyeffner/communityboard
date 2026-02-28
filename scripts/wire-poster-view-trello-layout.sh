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

# 1) Ensure top-level wrapper uses cbPosterView
# Replace: return ( <div ...>  -> return ( <div className="cbPosterView ...">
m = re.search(r"return\s*\(\s*<div([^>]*)>", s)
if not m:
    print("ERROR: Could not find return(<div ...>)")
    raise SystemExit(1)

div_attrs = m.group(1)

# If there's already a className, append; otherwise add one
if "className=" in div_attrs:
    m2 = re.search(r'className\s*=\s*{?\s*["\']([^"\']*)["\']\s*}?', div_attrs)
    if m2 and "cbPosterView" not in m2.group(1):
        old_cls = m2.group(0)
        cls_val = m2.group(1).strip()
        new_cls = cls_val + " cbPosterView"
        new_old_cls = old_cls.replace(m2.group(1), new_cls)
        new_attrs = div_attrs.replace(old_cls, new_old_cls, 1)
        s = s.replace(m.group(0), f"return (\n  <div{new_attrs}>", 1)
        changed = True
else:
    new_attrs = div_attrs + ' className="cbPosterView"'
    s = s.replace(m.group(0), f"return (\n  <div{new_attrs}>", 1)
    changed = True

# 2) Try to tag the right rail section by locating the text
anchor = "Other items on this poster"
idx = s.find(anchor)
if idx != -1:
    # Find nearest preceding div with className (likely rail card wrapper)
    before = s[:idx]
    matches = list(re.finditer(r'className=["\']([^"\']+)["\']', before))
    if matches:
        last = matches[-1]
        cls = last.group(1)
        if "cbPosterRailCard" not in cls:
            start, end = last.span(1)
            s = s[:start] + cls + " cbPosterRailCard" + s[end:]
            changed = True

# 3) Tag stage region if we find "poster-stage" testid
# Add cbPosterStageCard to the element that has data-testid="poster-stage"
m3 = re.search(r'data-testid=["\']poster-stage["\'][^>]*className=["\']([^"\']+)["\']', s)
if m3 and "cbPosterStageCard" not in m3.group(1):
    s = s.replace(m3.group(0), m3.group(0).replace(m3.group(1), m3.group(1) + " cbPosterStageCard"), 1)
    changed = True

p.write_text(s, encoding="utf-8")
print("PATCHED" if changed else "OK: no changes (already wired or patterns differed)")
PY

echo ""
echo "Now restart dev:"
echo "pkill -f 'next dev' || true"
echo "rm -rf .next"
echo "npm run dev"
