#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

FILE="app/api/marketing/event/route.ts"
test -f "$FILE" || {
  echo "ERROR: Missing $FILE"
  echo "Run: ./scripts/marketing-create-endpoint.sh"
  exit 1
}

STAMP="$(date +%s)"
cp "$FILE" "${FILE}.bak.${STAMP}"
echo "Backed up $FILE -> ${FILE}.bak.${STAMP}"

python3 - <<'PY'
from pathlib import Path
import re, sys

p = Path("app/api/marketing/event/route.ts")
s = p.read_text(encoding="utf-8")

if "__marketingRollup" in s or "__marketingCounts" in s:
    print("OK: rollup already present")
    sys.exit(0)

# Insert rollup store after last import
lines = s.splitlines(True)
last_import = -1
for i, line in enumerate(lines):
    if line.lstrip().startswith("import "):
        last_import = i

rollup = """
// --- marketing rollup (in-memory) ---
// Stored on globalThis to persist across hot reloads in dev.
const __marketingRollup = (() => {
  const g: any = globalThis as any
  if (!g.__marketingCounts) {
    g.__marketingCounts = {
      total: 0,
      byName: {} as Record<string, number>,
      byPath: {} as Record<string, number>,
      lastPrintedAt: 0,
    }
  }
  return g.__marketingCounts as {
    total: number
    byName: Record<string, number>
    byPath: Record<string, number>
    lastPrintedAt: number
  }
})()

function __bumpCount(map: Record<string, number>, key: string) {
  map[key] = (map[key] || 0) + 1
}

function __maybePrintRollup() {
  const now = Date.now()
  const shouldPrintByVolume = __marketingRollup.total % 10 === 0
  const shouldPrintByTime = now - __marketingRollup.lastPrintedAt > 60_000
  if (!shouldPrintByVolume && !shouldPrintByTime) return

  __marketingRollup.lastPrintedAt = now

  const top = (obj: Record<string, number>, n: number) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)

  console.log('[marketing-rollup]', JSON.stringify({
    total: __marketingRollup.total,
    topNames: top(__marketingRollup.byName, 6),
    topPaths: top(__marketingRollup.byPath, 6),
    at: new Date().toISOString(),
  }))
}
// --- end marketing rollup ---

"""

insert_at = last_import + 1 if last_import >= 0 else 0
lines.insert(insert_at, rollup)
s2 = "".join(lines)

# Inject bump logic right after the marketing-event log line
m = re.search(r"console\.log\(\s*['\"]\[marketing-event\]['\"]", s2)
if not m:
    print("ERROR: Could not find the [marketing-event] console.log line to hook into.")
    sys.exit(1)

end = s2.find(");", m.end())
if end == -1:
    print("ERROR: Could not find end of the [marketing-event] console.log statement.")
    sys.exit(1)

inject = """

  // rollup counters
  try {
    __marketingRollup.total += 1
    __bumpCount(__marketingRollup.byName, String((evt as any)?.name ?? '(missing-name)'))
    __bumpCount(__marketingRollup.byPath, String((evt as any)?.path ?? '(missing-path)'))
    __maybePrintRollup()
  } catch {
    // never block the request on telemetry
  }

"""

s3 = s2[:end+2] + inject + s2[end+2:]
p.write_text(s3, encoding="utf-8")
print("PATCHED: rollup enabled")
PY

echo "OK: rollup added to $FILE"
