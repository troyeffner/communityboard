#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

OUT="QB/dispatch/next_actions_$(date +%Y%m%d).md"
PROJECT="$(python3 - <<'PY'
import json
from pathlib import Path
obj=json.loads(Path('QB/status.json').read_text())
print(obj.get('project','PROJECT'))
PY
)"

cat > "$OUT" <<EOF2
# QB Next Actions

Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

Project
$PROJECT

Destination
Codex Desktop - 07_Strategy_Canon_Artifacts

Prompt
Update PROJECT_0_1_OPERATING_BRIEF with latest assumptions, blockers, and decision date.

Acceptance
- Updated brief includes owners and dates.
- Top 3 blockers are explicit.

Return
- Return format: changed files + summary
- Return location: QB dispatch thread
- Blocking policy: report blockers with proposed options
EOF2

echo "QB plan generated: $OUT"
