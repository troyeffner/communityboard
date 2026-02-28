#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

CSS="app/globals.css"
test -f "$CSS" || { echo "ERROR: missing $CSS"; exit 1; }

STAMP="$(date +%s)"
cp "$CSS" "${CSS}.bak.${STAMP}"
echo "Backed up $CSS -> ${CSS}.bak.${STAMP}"

# Append CSS once (guarded by a marker)
python3 - <<'PY'
from pathlib import Path

p = Path("app/globals.css")
s = p.read_text(encoding="utf-8")

marker = "/* CB_TRELLO_POSTER_VIEW */"
if marker in s:
    print("OK: Trello Poster CSS already present")
    raise SystemExit(0)

block = r'''
/* CB_TRELLO_POSTER_VIEW */
.cbPosterView {
  /* use most of the viewport; adjust if you have a global header */
  height: calc(100vh - 56px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 16px;
  align-items: stretch;
}

@media (max-width: 980px) {
  .cbPosterView {
    grid-template-columns: 1fr;
    height: auto;
  }
}

.cbPosterStageCol,
.cbPosterRailCol {
  min-height: 0; /* allows children to scroll */
}

.cbPosterStageCard,
.cbPosterRailCard {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 0 rgba(0,0,0,0.03);
}

/* Stage area behaves like a Trello board region */
.cbPosterStageCard {
  display: grid;
  grid-template-rows: auto 1fr auto; /* header, canvas, footer */
  overflow: hidden;
}

/* Sticky header for stage controls */
.cbPosterStageHeader {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #fff;
  border-bottom: 1px solid #eef2f7;
  padding: 10px 12px;
}

/* Canvas region scrolls if needed */
.cbPosterStageCanvas {
  overflow: auto;
  padding: 12px;
}

/* Footer actions */
.cbPosterStageFooter {
  border-top: 1px solid #eef2f7;
  padding: 10px 12px;
  background: #fff;
}

/* Right rail = Trello list */
.cbPosterRailCard {
  display: grid;
  grid-template-rows: auto 1fr; /* header + scroll list */
  overflow: hidden;
}

.cbPosterRailHeader {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #fff;
  border-bottom: 1px solid #eef2f7;
  padding: 10px 12px;
}

.cbPosterRailScroll {
  overflow: auto;
  padding: 12px;
  background: #f8fafc;
}

/* Trello-ish item cards inside rail */
.cbPosterItemCard {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 10px;
  margin-bottom: 10px;
  box-shadow: 0 1px 0 rgba(0,0,0,0.02);
}

.cbPosterItemCard:hover {
  border-color: #cbd5e1;
}

.cbPosterItemTitleRow {
  display: flex;
  gap: 8px;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
}

.cbPosterItemTitle {
  font-weight: 600;
  font-size: 14px;
  color: #111827;
}

.cbPosterItemMeta {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.35;
}

.cbPosterItemActions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}
'''
p.write_text(s + "\n" + block + "\n", encoding="utf-8")
print("PATCHED: appended Trello Poster CSS")
PY
