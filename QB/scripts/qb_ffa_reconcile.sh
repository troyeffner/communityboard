#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

SCOPE="full"
STRICT=false
BACKFILL_NOTES=false

usage() {
  cat <<USAGE
Usage:
  ./QB/qb ffa-reconcile [--scope full|<module>] [--strict] [--backfill-notes]

Purpose:
  Reconcile FFA after canonical changes by re-syncing plan alignment and producing a full drift/gap review artifact.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --scope)
      SCOPE="${2:-full}"
      shift 2
      ;;
    --strict)
      STRICT=true
      shift
      ;;
    --backfill-notes)
      BACKFILL_NOTES=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ! -f "08_Data_Model_and_API_Contracts/ffa_instance.json" ]]; then
  OUT="QB/dispatch/ffa_reconcile_$(date -u +%Y%m%d).md"
  cat > "$OUT" <<EOF
# FFA Reconcile Report

- generated_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- scope: ${SCOPE}
- strict_mode: ${STRICT}
- status: skipped
- reason: 08_Data_Model_and_API_Contracts/ffa_instance.json not present in this repo

## Next Actions
- No FFA reconcile required for this repo until an FFA instance is introduced.
EOF
  echo "Reconciliation report: $OUT"
  echo "Status: skipped (no ffa_instance.json)"
  exit 0
fi

if [[ "$BACKFILL_NOTES" == "true" ]]; then
  "$ROOT/QB/scripts/qb_ffa_plan_sync.sh" --backfill-notes
else
  "$ROOT/QB/scripts/qb_ffa_plan_sync.sh"
fi

python3 - "$SCOPE" "$STRICT" <<'PY'
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

scope = sys.argv[1]
strict = sys.argv[2].lower() == 'true'

ffa_path = Path('08_Data_Model_and_API_Contracts/ffa_instance.json')
state_path = Path('QB/PLAN_ALIGNMENT_STATE.json')
out_path = Path('QB/dispatch') / f"ffa_reconcile_{datetime.now(timezone.utc).strftime('%Y%m%d')}.md"

if not ffa_path.exists():
    raise SystemExit('Missing 08_Data_Model_and_API_Contracts/ffa_instance.json')

obj = json.loads(ffa_path.read_text())
ff = obj.get('framework_foundation')
if not isinstance(ff, dict):
    raise SystemExit('framework_foundation object missing in ffa_instance.json')

if scope != 'full' and scope not in ff:
    raise SystemExit(f'Unknown scope "{scope}". Valid: full or one of {", ".join(sorted(ff.keys()))}')

selected_modules = [scope] if scope != 'full' else [k for k, v in ff.items() if isinstance(v, list)]

# Build id indexes
module_ids = {}
all_ids = set()
for mod, rows in ff.items():
    if not isinstance(rows, list):
        continue
    ids = set()
    for row in rows:
        if isinstance(row, dict):
            rid = row.get('id')
            if isinstance(rid, str) and rid.strip():
                ids.add(rid.strip())
    module_ids[mod] = ids
    all_ids |= ids

ost_outcomes = module_ids.get('desired_outcomes', set())
ost_opps = module_ids.get('opportunities', set())
ost_solutions = module_ids.get('solutions', set())

def add_issue(bucket, code, summary):
    issues[bucket].append({"code": code, "summary": summary})

issues = {"blocking": [], "high": [], "medium": [], "low": []}

# 1) OST linkage integrity (blocking)
if scope in ('full', 'ost_links') and isinstance(ff.get('ost_links'), list):
    for i, row in enumerate(ff.get('ost_links', [])):
        if not isinstance(row, dict):
            add_issue('high', 'ost_link_row_invalid', f'ost_links[{i}] is not an object')
            continue
        oid = row.get('desired_outcome_id')
        pid = row.get('opportunity_id')
        sid = row.get('solution_id')
        if oid and oid not in ost_outcomes:
            add_issue('blocking', 'ost_link_outcome_missing', f'ost_links[{i}] desired_outcome_id missing target: {oid}')
        if pid and pid not in ost_opps:
            add_issue('blocking', 'ost_link_opportunity_missing', f'ost_links[{i}] opportunity_id missing target: {pid}')
        if sid and sid not in ost_solutions:
            add_issue('blocking', 'ost_link_solution_missing', f'ost_links[{i}] solution_id missing target: {sid}')

# 2) Edge linkage integrity (high)
if scope in ('full', 'edges') and isinstance(ff.get('edges'), list):
    for i, row in enumerate(ff.get('edges', [])):
        if not isinstance(row, dict):
            add_issue('high', 'edge_row_invalid', f'edges[{i}] is not an object')
            continue
        from_id = row.get('from_id')
        to_id = row.get('to_id')
        if isinstance(from_id, str) and from_id and from_id not in all_ids:
            add_issue('high', 'edge_from_missing', f'edges[{i}] from_id missing target: {from_id}')
        if isinstance(to_id, str) and to_id and to_id not in all_ids:
            add_issue('high', 'edge_to_missing', f'edges[{i}] to_id missing target: {to_id}')

# 3) Module-level weak evidence checks (medium)
for mod in selected_modules:
    rows = ff.get(mod)
    if not isinstance(rows, list):
        continue
    if len(rows) == 0:
        add_issue('low', 'module_empty', f'{mod} is empty')
        continue
    if mod in {'assumptions', 'hypotheses', 'experiments'}:
        for i, row in enumerate(rows):
            if not isinstance(row, dict):
                continue
            refs = row.get('evidence_refs')
            if refs is None:
                add_issue('medium', 'evidence_refs_missing', f'{mod}[{i}] missing evidence_refs field')
            elif isinstance(refs, list) and len(refs) == 0:
                add_issue('medium', 'evidence_refs_empty', f'{mod}[{i}] has empty evidence_refs')

# 4) Lightweight generic ID reference checks (high)
id_like = re.compile(r'^[A-Za-z][A-Za-z0-9._-]*$')
skip_keys = {
    'id', 'version_id', 'template_id', 'parent_template_id', 'parent_version_id',
    'created_version', 'forked_at_version', 'updated_at', 'source_pack_ref'
}
for mod in selected_modules:
    rows = ff.get(mod)
    if not isinstance(rows, list):
        continue
    for i, row in enumerate(rows):
        if not isinstance(row, dict):
            continue
        for key, value in row.items():
            if key in skip_keys:
                continue
            if key.endswith('_id') and isinstance(value, str) and value and id_like.match(value):
                if value not in all_ids:
                    add_issue('high', 'ref_id_missing', f'{mod}[{i}] {key} references missing id: {value}')
            if key.endswith('_ids') and isinstance(value, list):
                for ref in value:
                    if isinstance(ref, str) and ref and id_like.match(ref) and ref not in all_ids:
                        add_issue('high', 'ref_ids_missing', f'{mod}[{i}] {key} references missing id: {ref}')

blocking = len(issues['blocking'])
high = len(issues['high'])
medium = len(issues['medium'])
low = len(issues['low'])

ffa_hash = hashlib.sha256(ffa_path.read_bytes()).hexdigest()
now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

if state_path.exists():
    try:
        state = json.loads(state_path.read_text())
    except Exception:
        state = {}
else:
    state = {}

state['last_ffa_hash'] = ffa_hash
state['last_synced_at'] = now
state['last_ffa_reconcile_at'] = now
state['last_ffa_reconcile_scope'] = scope
state['ffa_reconcile'] = {
    'blocking': blocking,
    'high': high,
    'medium': medium,
    'low': low,
    'status': 'blocking' if blocking > 0 else ('warning' if high > 0 else 'aligned')
}
state['alignment_status'] = 'drifted' if blocking > 0 else state.get('alignment_status', 'aligned')
state_path.write_text(json.dumps(state, indent=2) + '\n')

lines = []
lines.append('# FFA Reconcile Report')
lines.append('')
lines.append(f'- generated_at: {now}')
lines.append(f'- scope: {scope}')
lines.append(f'- strict_mode: {str(strict).lower()}')
lines.append(f'- ffa_hash: `{ffa_hash}`')
lines.append('')
lines.append('## Summary')
lines.append(f'- modules_reviewed: {len(selected_modules)}')
lines.append(f'- blocking: {blocking}')
lines.append(f'- high: {high}')
lines.append(f'- medium: {medium}')
lines.append(f'- low: {low}')
lines.append('')

for bucket in ['blocking', 'high', 'medium', 'low']:
    lines.append(f'## {bucket.capitalize()} Issues')
    if not issues[bucket]:
        lines.append('- none')
    else:
        for item in issues[bucket]:
            lines.append(f"- [{item['code']}] {item['summary']}")
    lines.append('')

lines.append('## Next Actions')
if blocking > 0:
    lines.append('- Resolve all blocking issues before feature work continues.')
if high > 0:
    lines.append('- Resolve high-severity linkage issues in current cycle.')
if medium > 0:
    lines.append('- Queue medium evidence/coverage fixes with explicit owners.')
if blocking == high == medium == 0:
    lines.append('- FFA is aligned for current scope.')

out_path.write_text('\n'.join(lines) + '\n')
print(f'Reconciliation report: {out_path.as_posix()}')
print(f'Issue counts -> blocking:{blocking} high:{high} medium:{medium} low:{low}')

if strict and blocking > 0:
    raise SystemExit('Strict mode failed: blocking reconciliation issues found')
PY

echo "Run ./QB/qb check and ./QB/qb report next."
