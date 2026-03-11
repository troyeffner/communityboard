#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

BY="${2:-QB}"
if [[ "${1:-}" == "--by" && -n "${2:-}" ]]; then
  BY="$2"
fi

python3 - "$BY" <<'PY'
import json
from pathlib import Path
from datetime import datetime, timezone
import sys

by=sys.argv[1]
p=Path('QB/COACH_UPDATE_GATE.json')
if not p.exists():
    raise SystemExit('Missing QB/COACH_UPDATE_GATE.json')
obj=json.loads(p.read_text())
if not obj.get('pending', False):
    print('No pending Coach update. Nothing to acknowledge.')
    raise SystemExit(0)
obj['pending']=False
obj['acknowledged_by']=by
obj['acknowledged_at']=datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
p.write_text(json.dumps(obj, indent=2)+'\n')
print(f"Acknowledged update: {obj.get('update_id','unknown')} by {by}")
PY

echo "Run ./QB/qb check next."
