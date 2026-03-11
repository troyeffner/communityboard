#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

FFA_PATH="08_Data_Model_and_API_Contracts/ffa_instance.json"

if [[ ! -f "$FFA_PATH" ]]; then
  echo "Missing $FFA_PATH"
  exit 1
fi

python3 - <<'PY'
import json
from pathlib import Path
from datetime import datetime, timezone

path = Path('08_Data_Model_and_API_Contracts/ffa_instance.json')
obj = json.loads(path.read_text())
foundation = obj.get('framework_foundation')
if not isinstance(foundation, dict):
    raise SystemExit('framework_foundation object is required')

for key in ['desired_outcomes', 'opportunities', 'solutions', 'ost_links']:
    if key not in foundation or not isinstance(foundation.get(key), list):
        foundation[key] = []

if not isinstance(foundation.get('seed_data_policy'), dict):
    foundation['seed_data_policy'] = {
        'seed_is_exploratory': True,
        'required_seed_metadata_fields': ['seed_label', 'evaluation_status', 'probe_intent'],
        'evaluation_status_allowed_values': ['research_backed', 'research_needed'],
        'promotion_rule': 'seed_items_require_evidence_before_stabilized'
    }

policy = foundation.get('epistemic_state_policy')
if not isinstance(policy, dict):
    foundation['epistemic_state_policy'] = {
        'field_name': 'epistemic_state',
        'allowed_values': ['seed', 'hypothesis', 'stabilized'],
        'default_for_new_records': 'seed',
        'applies_to': 'all_framework_foundation_records'
    }

meta = obj.get('meta')
if isinstance(meta, dict) and 'epistemic_state_scale' not in meta:
    meta['epistemic_state_scale'] = ['seed', 'hypothesis', 'stabilized']

updated = 0
for key, value in foundation.items():
    if not isinstance(value, list):
        continue
    for row in value:
        if isinstance(row, dict) and 'epistemic_state' not in row:
            row['epistemic_state'] = 'seed'
            updated += 1
        if isinstance(row, dict) and row.get('epistemic_state') == 'seed':
            md = row.get('seed_metadata')
            if not isinstance(md, dict):
                row['seed_metadata'] = {
                    'seed_label': 'seed_data',
                    'evaluation_status': 'research_needed',
                    'probe_intent': 'explore_new_business_area',
                    'external_research_refs': []
                }
                updated += 1
            else:
                changed = False
                if not md.get('seed_label'):
                    md['seed_label'] = 'seed_data'
                    changed = True
                if md.get('evaluation_status') not in {'research_backed', 'research_needed'}:
                    md['evaluation_status'] = 'research_needed'
                    changed = True
                if not md.get('probe_intent'):
                    md['probe_intent'] = 'explore_new_business_area'
                    changed = True
                if 'external_research_refs' not in md or not isinstance(md.get('external_research_refs'), list):
                    md['external_research_refs'] = []
                    changed = True
                if changed:
                    row['seed_metadata'] = md
                    updated += 1

if isinstance(meta, dict):
    meta['last_updated'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

path.write_text(json.dumps(obj, indent=2) + '\n')
print(f'Updated records with default epistemic_state=seed: {updated}')
PY

echo "Run ./QB/qb check next."
