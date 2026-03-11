#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

FORCE=false
if [[ "${1:-}" == "--force" ]]; then
  FORCE=true
fi

SOURCE="/Users/troyeffner/Dropbox/DEV/UXOS/templates/QB"
SOURCE_BASELINE="$SOURCE/WOW_BASELINE.json"
LOCAL_BASELINE="QB/WOW_BASELINE.json"
LOCAL_STATE="QB/WOW_BASELINE_STATE.json"
DATE_TAG="$(date +%Y%m%d)"
OUT="QB/dispatch/wow_refresh_${DATE_TAG}.md"

[[ -f "$SOURCE_BASELINE" ]] || { echo "WoW refresh failed: missing source baseline $SOURCE_BASELINE"; exit 1; }

python3 - "$SOURCE" "$SOURCE_BASELINE" "$LOCAL_BASELINE" "$LOCAL_STATE" "$OUT" "$FORCE" <<'PY'
import json
import shutil
import stat
import sys
from datetime import datetime, timezone
from pathlib import Path

source = Path(sys.argv[1])
source_baseline_path = Path(sys.argv[2])
local_baseline_path = Path(sys.argv[3])
local_state_path = Path(sys.argv[4])
out_path = Path(sys.argv[5])
force = sys.argv[6].lower() == 'true'

baseline = json.loads(source_baseline_path.read_text())
version = baseline.get('baseline_version')
managed = baseline.get('managed_components', [])
if not isinstance(version, str) or not version.strip():
    raise SystemExit('Invalid WOW baseline: baseline_version missing')
if not isinstance(managed, list) or len(managed) == 0:
    raise SystemExit('Invalid WOW baseline: managed_components missing/empty')

local_state = {}
if local_state_path.exists():
    try:
        local_state = json.loads(local_state_path.read_text())
    except Exception:
        local_state = {}

applied = local_state.get('applied_version')
reason = []
if force:
    reason.append('force')
if applied != version:
    reason.append(f'version_mismatch:{applied or "none"}->{version}')

missing_local = []
missing_source = []
for rel in managed:
    src = source / rel
    dst = Path('QB') / rel
    if not src.exists():
        missing_source.append(rel)
        continue
    if not dst.exists():
        missing_local.append(rel)
if missing_local:
    reason.append(f'missing_local:{len(missing_local)}')

needs_refresh = len(reason) > 0
updated = []
unchanged = []

# Keep local baseline file in sync for transparent inspection.
local_baseline_path.parent.mkdir(parents=True, exist_ok=True)
local_baseline_path.write_text(json.dumps(baseline, indent=2) + '\n')

for rel in managed:
    src = source / rel
    dst = Path('QB') / rel
    if not src.exists():
        continue
    dst.parent.mkdir(parents=True, exist_ok=True)

    if not needs_refresh and dst.exists():
        unchanged.append(rel)
        continue

    before = dst.read_bytes() if dst.exists() else None
    data = src.read_bytes()
    if before == data:
        unchanged.append(rel)
    else:
        shutil.copy2(src, dst)
        updated.append(rel)

    if rel == 'qb' or rel.startswith('scripts/'):
        mode = dst.stat().st_mode
        dst.chmod(mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)

status = 'refreshed' if needs_refresh else 'already_current'
now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

state = {
    'applied_version': version,
    'last_refreshed_at': now,
    'last_refresh_reason': ','.join(reason) if reason else 'already_current',
    'source': str(source_baseline_path),
    'status': status,
    'updated_count': len(updated),
    'unchanged_count': len(unchanged),
}
local_state_path.write_text(json.dumps(state, indent=2) + '\n')

lines = []
lines.append('# WoW Refresh Summary')
lines.append('')
lines.append(f'- generated_at: {now}')
lines.append(f'- baseline_version: {version}')
lines.append(f'- status: {status}')
lines.append('')
lines.append('## What We Learned')
if status == 'refreshed':
    lines.append('- Operating baseline was behind and has been refreshed from Coach canonical templates.')
else:
    lines.append('- Operating baseline is already current with Coach canonical templates.')
if missing_source:
    lines.append('- Some managed components are missing in source template and were skipped.')
lines.append('')
lines.append('## What Changed')
if updated:
    for rel in updated:
        lines.append(f'- updated: QB/{rel}')
else:
    lines.append('- none')
lines.append('')
lines.append('## What Matters Next')
lines.append('- Continue with update collection and processing flow.')
lines.append('')
lines.append('## Evidence/Logistics')
lines.append(f'- refresh_reasons: {", ".join(reason) if reason else "none"}')
lines.append(f'- updated_count: {len(updated)}')
lines.append(f'- unchanged_count: {len(unchanged)}')
if missing_source:
    lines.append(f'- missing_source_count: {len(missing_source)}')

out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text('\n'.join(lines) + '\n')
print(f'WoW refresh generated: {out_path.as_posix()}')
print(f'WoW baseline status: {status} (version {version})')
PY
