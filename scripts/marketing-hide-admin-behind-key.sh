#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

FILE="app/marketing/admin/page.tsx"
test -f "$FILE" || { echo "ERROR: missing $FILE"; exit 1; }

STAMP="$(date +%s)"
cp "$FILE" "${FILE}.bak.${STAMP}"
echo "Backed up $FILE -> ${FILE}.bak.${STAMP}"

python3 - <<'PY'
from pathlib import Path
import re

p = Path("app/marketing/admin/page.tsx")
s = p.read_text(encoding="utf-8")

# Ensure imports include notFound
if "notFound" not in s:
    if re.search(r"from\s+['\"]next/navigation['\"]", s):
        s = re.sub(r"from\s+['\"]next/navigation['\"]",
                   "from 'next/navigation'", s)
        # add named import if it exists as default? we handle common pattern below
    # Add/merge import { notFound } from 'next/navigation'
    m = re.search(r"import\s*\{\s*([^}]+)\s*\}\s*from\s*['\"]next/navigation['\"]\s*;?", s)
    if m:
        names = [x.strip() for x in m.group(1).split(",") if x.strip()]
        if "notFound" not in names:
            names.append("notFound")
        repl = "import { " + ", ".join(sorted(set(names))) + " } from 'next/navigation'\n"
        s = s[:m.start()] + repl + s[m.end():]
    else:
        s = "import { notFound } from 'next/navigation'\n" + s

# Patch signature to accept searchParams
if "searchParams" not in s:
    # Try to find default export function signature
    s = re.sub(
        r"export\s+default\s+(async\s+)?function\s+([A-Za-z0-9_]+)\s*\(\s*\)\s*\{",
        r"export default \1function \2({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {",
        s,
        count=1
    )

# Insert gate near top of function
# Find the start of the function body (after "{")
m = re.search(r"export\s+default\s+(?:async\s+)?function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{", s)
if not m:
    raise SystemExit("ERROR: Could not locate admin page function to patch.")

insert_at = m.end()
guard = """
  // --- Admin visibility gate (lightweight "not discoverable by accident") ---
  const provided = searchParams?.key
  const key = Array.isArray(provided) ? provided[0] : provided
  const required = process.env.MARKETING_ADMIN_KEY || 'dev'
  if (!key || key !== required) {
    notFound()
  }
"""
if "Admin visibility gate" not in s:
    s = s[:insert_at] + guard + s[insert_at:]

p.write_text(s, encoding="utf-8")
print("PATCHED: admin page now requires ?key=<MARKETING_ADMIN_KEY|dev>")
PY

echo ""
echo "Done."
echo "Try:"
echo "  http://localhost:3000/marketing/admin          (should 404)"
echo "  http://localhost:3000/marketing/admin?key=dev  (should work in dev)"
echo ""
echo "Optional: set a real key in .env.local:"
echo "  MARKETING_ADMIN_KEY=some-long-random-string"
