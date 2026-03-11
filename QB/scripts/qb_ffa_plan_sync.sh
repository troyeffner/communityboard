#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

BACKFILL_NOTES=false
if [[ "${1:-}" == "--backfill-notes" ]]; then
  BACKFILL_NOTES=true
fi

python3 - "$BACKFILL_NOTES" <<'PY'
import json
import hashlib
from pathlib import Path
from datetime import datetime, timezone
import sys

backfill_notes = sys.argv[1].lower() == 'true'
ffa = Path('08_Data_Model_and_API_Contracts/ffa_instance.json')
wq = Path('QB/WORK_QUEUE.md')
state = Path('QB/PLAN_ALIGNMENT_STATE.json')

if not ffa.exists():
    raise SystemExit('Missing 08_Data_Model_and_API_Contracts/ffa_instance.json')
if not wq.exists():
    raise SystemExit('Missing QB/WORK_QUEUE.md')

ffa_hash = hashlib.sha256(ffa.read_bytes()).hexdigest()
text = wq.read_text()
lines = text.splitlines()

active_status = {'queued', 'in_progress', 'blocked'}
updated = 0
missing = []

for i, line in enumerate(lines):
    s = line.strip()
    if not (s.startswith('|') and 'wq_' in s):
        continue
    cols = [c.strip() for c in line.strip().strip('|').split('|')]
    if len(cols) < 9:
        continue
    item_id = cols[0]
    status = cols[5]
    notes = cols[8]
    if status not in active_status:
        continue
    has_ref = 'ffa_ref:' in notes
    has_waiver = 'no_ffa_impact_reason:' in notes
    if not (has_ref or has_waiver):
        missing.append(item_id)
        if backfill_notes:
            if notes:
                notes = notes + '; no_ffa_impact_reason: legacy_backfill_pending'
            else:
                notes = 'no_ffa_impact_reason: legacy_backfill_pending'
            cols[8] = notes
            lines[i] = '| ' + ' | '.join(cols) + ' |'
            updated += 1

if backfill_notes and updated:
    text2 = '\n'.join(lines)
    if text.endswith('\n'):
        text2 += '\n'
    wq.write_text(text2)
    # Re-audit after backfill so final state is reflected.
    missing = []
    for line in lines:
        s = line.strip()
        if not (s.startswith('|') and 'wq_' in s):
            continue
        cols = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cols) < 9:
            continue
        item_id = cols[0]
        status = cols[5]
        notes = cols[8]
        if status not in active_status:
            continue
        has_ref = 'ffa_ref:' in notes
        has_waiver = 'no_ffa_impact_reason:' in notes
        if not (has_ref or has_waiver):
            missing.append(item_id)

alignment_status = 'aligned' if len(missing) == 0 else 'drifted'

payload = {
    'last_synced_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
    'last_ffa_hash': ffa_hash,
    'alignment_status': alignment_status,
    'active_queue_items_missing_ffa_binding': sorted(set(missing)),
    'notes': 'Every active work queue row requires ffa_ref or no_ffa_impact_reason.'
}
state.write_text(json.dumps(payload, indent=2) + '\n')

print(f'FFA hash synced: {ffa_hash}')
print(f'Alignment status: {alignment_status}')
print(f'Missing bindings: {len(set(missing))}')
if backfill_notes:
    print(f'Backfilled queue rows: {updated}')
PY

echo "Run ./QB/qb check next."
