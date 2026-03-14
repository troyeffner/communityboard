#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

echo "== Installing @vercel/analytics =="
npm install @vercel/analytics

LAYOUT="app/layout.tsx"
test -f "$LAYOUT" || { echo "ERROR: $LAYOUT not found"; exit 1; }

STAMP="$(date +%s)"
cp "$LAYOUT" "${LAYOUT}.bak.${STAMP}"
echo "Backed up layout -> ${LAYOUT}.bak.${STAMP}"

python3 - <<'PY'
from pathlib import Path
import re

p = Path("app/layout.tsx")
s = p.read_text(encoding="utf-8")

# 1) Ensure Analytics import exists
if "@vercel/analytics/next" not in s:
    # Insert import after last existing import
    lines = s.splitlines(True)
    last_import = -1
    for i, line in enumerate(lines):
        if line.startswith("import "):
            last_import = i
    insert_line = 'import { Analytics } from "@vercel/analytics/next"\n'
    if last_import >= 0:
        lines.insert(last_import + 1, insert_line)
    else:
        lines.insert(0, insert_line)
    s = "".join(lines)

# 2) Ensure <Analytics /> is rendered before </body>
if "<Analytics" not in s:
    s = re.sub(r"</body>", "  <Analytics />\n  </body>", s, count=1)

p.write_text(s, encoding="utf-8")
print("Analytics component injected.")
PY

echo ""
echo "== Restarting Next dev server =="

pkill -f "next dev" 2>/dev/null || true
rm -rf .next || true
nohup npm run dev >/tmp/communityboard-dev.log 2>&1 &

echo "Waiting for server..."
for i in {1..30}; do
  if curl -fsS "http://localhost:3000" >/dev/null 2>&1; then
    echo "Server ready."
    break
  fi
  sleep 1
done

echo ""
echo "Done."
echo "Analytics is now active."
echo ""
echo "NOTE:"
echo "Analytics only sends data when deployed on Vercel."
echo "Local dev will not record production analytics."
