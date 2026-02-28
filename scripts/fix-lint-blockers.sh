#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

# If PosterViewer.tsx has a syntax error and you just want to publish marketing work,
# set this to 1 to auto-revert it to HEAD.
AUTO_REVERT_POSTERVIEWER="${AUTO_REVERT_POSTERVIEWER:-0}"

echo "== Repo =="
pwd

backup() {
  local f="$1"
  if [[ -f "$f" ]]; then
    local stamp
    stamp="$(date +%s)"
    cp "$f" "$f.bak.$stamp"
    echo "Backed up $f -> $f.bak.$stamp"
  fi
}

py_patch() {
  python3 - <<'PY'
import os, re
from pathlib import Path

def ensure_import_link(tsx: str) -> str:
    if re.search(r'from\s+[\'"]next/link[\'"]', tsx):
        return tsx
    # Put Link import after existing imports (or at top)
    lines = tsx.splitlines(True)
    insert_at = 0
    for i,l in enumerate(lines):
        if l.startswith("import "):
            insert_at = i+1
    lines.insert(insert_at, "import Link from 'next/link'\n")
    return "".join(lines)

def replace_anchor_with_link(tsx: str) -> str:
    # Replace <a href="/path">TEXT</a> where /path is internal (starts with /)
    # Keep attributes minimal (we only handle href + optional className)
    # Pattern 1: <a href="/x">Label</a>
    tsx2 = re.sub(
        r'<a\s+href=("|\')(/[^"\']*)\1\s*>(.*?)</a>',
        r'<Link href="\2">\3</Link>',
        tsx,
        flags=re.S
    )
    # Pattern 2: <a className="..." href="/x">Label</a> or href then className
    tsx3 = re.sub(
        r'<a\s+([^>]*?)href=("|\')(/[^"\']*)\2([^>]*)>(.*?)</a>',
        lambda m: f'<Link href="{m.group(3)}">{m.group(5)}</Link>',
        tsx2,
        flags=re.S
    )
    return tsx3

def kill_any(ts: str) -> str:
    # Replace obvious ": any" with ": unknown"
    ts = re.sub(r':\s*any\b', ': unknown', ts)
    # Replace "as any" with "as unknown"
    ts = re.sub(r'\bas\s+any\b', 'as unknown', ts)
    return ts

def patch_file(path: str, fn):
    p = Path(path)
    if not p.exists():
        return False
    s = p.read_text(encoding="utf-8")
    s2 = fn(s)
    if s2 != s:
        p.write_text(s2, encoding="utf-8")
        return True
    return False

changed = []

# --- 1) Marketing API route: remove explicit any ---
api_route = "app/api/marketing/event/route.ts"
def patch_api(s: str) -> str:
    s = kill_any(s)
    # Ensure JSON parsing isn't implicitly any (common pattern)
    s = re.sub(r'const\s+body\s*=\s*await\s+req\.json\(\)\s*;?',
               'const body = (await req.json()) as Record<string, unknown>;',
               s)
    return s
if patch_file(api_route, patch_api):
    changed.append(api_route)

# --- 2) Marketing components: remove explicit any ---
for comp in [
    "app/marketing/_components/MarketingDoor.tsx",
    "app/marketing/_components/MarketingInterest.tsx",
]:
    def patch_comp(s: str) -> str:
        return kill_any(s)
    if patch_file(comp, patch_comp):
        changed.append(comp)

# --- 3) Marketing admin page: remove any + fix Next searchParams promise pattern safely later (separate script) ---
admin = "app/marketing/admin/page.tsx"
def patch_admin(s: str) -> str:
    s = kill_any(s)
    return s
if patch_file(admin, patch_admin):
    changed.append(admin)

# --- 4) Replace internal <a> with <Link> in these pages ---
pages = [
    "app/marketing/page.tsx",
    "app/marketing/owners/page.tsx",
    "app/marketing/stewards/page.tsx",
    "app/poster/[id]/page.tsx",
    "app/poster/e2e-fixture/page.tsx",
]
for pg in pages:
    p = Path(pg)
    if not p.exists():
        continue
    s = p.read_text(encoding="utf-8")
    s2 = replace_anchor_with_link(s)
    if s2 != s:
        s2 = ensure_import_link(s2)
        p.write_text(s2, encoding="utf-8")
        changed.append(pg)

# --- 5) Remove unused eslint-disable in lib/marketing/events.ts (the warning you saw) ---
events_lib = "lib/marketing/events.ts"
def patch_events(s: str) -> str:
    # remove "eslint-disable no-console" if present (since lint said it's unused)
    s2 = re.sub(r'^\s*//\s*eslint-disable\s+no-console\s*\n', '', s, flags=re.M)
    return s2
if patch_file(events_lib, patch_events):
    changed.append(events_lib)

print("CHANGED_FILES:")
for f in changed:
    print(" -", f)
PY
}

echo ""
echo "== 1) Backup & patch lint blockers =="
# backups for the key files
for f in \
  app/api/marketing/event/route.ts \
  app/marketing/_components/MarketingDoor.tsx \
  app/marketing/_components/MarketingInterest.tsx \
  app/marketing/admin/page.tsx \
  app/marketing/page.tsx \
  app/marketing/owners/page.tsx \
  app/marketing/stewards/page.tsx \
  app/poster/[id]/page.tsx \
  app/poster/e2e-fixture/page.tsx \
  lib/marketing/events.ts
do
  backup "$f"
done

py_patch

echo ""
echo "== 2) PosterViewer.tsx parse error guard =="
POSTER_VIEWER="app/poster/[id]/PosterViewer.tsx"
if [[ -f "$POSTER_VIEWER" ]]; then
  # quick syntax check via eslint parser by running eslint on just that file
  # (doesn't require lint to pass overall)
  set +e
  npx eslint "$POSTER_VIEWER" >/tmp/eslint-posterviewer.txt 2>&1
  RC=$?
  set -e

  if grep -q "Parsing error" /tmp/eslint-posterviewer.txt; then
    echo "Detected a syntax/parsing error in $POSTER_VIEWER"
    echo ""
    echo "---- ESLINT OUTPUT (PosterViewer) ----"
    cat /tmp/eslint-posterviewer.txt
    echo "--------------------------------------"
    echo ""
    echo "Showing around line 121 (your lint output mentioned ~121):"
    nl -ba "$POSTER_VIEWER" | sed -n '105,140p' || true
    echo ""

    if [[ "$AUTO_REVERT_POSTERVIEWER" == "1" ]]; then
      echo "AUTO_REVERT_POSTERVIEWER=1 -> reverting $POSTER_VIEWER to HEAD"
      git checkout -- "$POSTER_VIEWER"
    else
      echo "Not reverting automatically."
      echo "If you want the script to auto-revert PosterViewer to HEAD for publishing, run:"
      echo "  AUTO_REVERT_POSTERVIEWER=1 ./scripts/fix-lint-blockers.sh"
      echo ""
      echo "Stopping here because lint/build will keep failing until PosterViewer parses."
      exit 1
    fi
  fi
fi

echo ""
echo "== 3) Re-run lint =="
npm run lint

echo ""
echo "OK: lint is now clean enough to proceed."
