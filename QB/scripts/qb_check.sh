#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "QB check: validating required files"
for f in \
  QB/goals.md QB/status.json QB/README.md QB/policies/pm_hybrid_update_policy.md QB/policies/pm_to_pm_handoffs.md \
  QB/policies/web_instrumentation_policy.md QB/policies/external_evidence_atoms.md QB/policies/human_update_style_policy.md QB/policies/check_updates_reply_contract.md QB/AUTONOMY_MATRIX.md QB/WORK_QUEUE.md QB/DECISION_LOG.md QB/RELEASE_GATE_CHECKLIST.md QB/RACI_LITE.md QB/ARTIFACT_THREAD_MAP.json QB/PLAN_ALIGNMENT_STATE.json QB/COACH_UPDATE_GATE.json QB/SUPABASE_ENV_REF.json QB/THREAD_INTRO_STANDARD_00_08.md QB/LOCAL_DOMAIN.json QB/WOW_BASELINE.json QB/WOW_BASELINE_STATE.json; do
  [[ -f "$f" ]] || { echo "Missing $f"; exit 1; }
done
[[ -x QB/scripts/qb_refresh_wow.sh ]] || { echo "Missing executable QB/scripts/qb_refresh_wow.sh"; exit 1; }

echo "QB check: validating WoW baseline state"
python3 - <<'PY'
import json
from pathlib import Path
b = json.loads(Path('QB/WOW_BASELINE.json').read_text())
s = json.loads(Path('QB/WOW_BASELINE_STATE.json').read_text())
if not isinstance(b.get('baseline_version'), str) or not b['baseline_version'].strip():
    raise SystemExit('QB/WOW_BASELINE.json baseline_version must be non-empty string')
if not isinstance(b.get('managed_components'), list) or len(b['managed_components']) == 0:
    raise SystemExit('QB/WOW_BASELINE.json managed_components must be non-empty array')
if not isinstance(s.get('applied_version'), str) or not s['applied_version'].strip():
    raise SystemExit('QB/WOW_BASELINE_STATE.json applied_version must be non-empty string')
if s.get('applied_version') != b.get('baseline_version'):
    raise SystemExit('WOW baseline drift: run ./QB/qb check-updates to refresh baseline')
print('wow baseline state: OK')
PY

echo "QB check: validating Coach update gate"
python3 - <<'PY'
import json
from pathlib import Path
p=Path('QB/COACH_UPDATE_GATE.json')
obj=json.loads(p.read_text())
if not isinstance(obj.get('pending'), bool):
    raise SystemExit('QB/COACH_UPDATE_GATE.json pending must be boolean')
if obj.get('pending') is True and obj.get('required_before_work', True):
    raise SystemExit('Pending Coach update must be acknowledged first. Run: ./QB/qb ack-update --by <name>')
print('coach update gate: OK')
PY

echo "QB check: validating Supabase env reference"
python3 - <<'PY'
import json
from pathlib import Path
p=Path('QB/SUPABASE_ENV_REF.json')
obj=json.loads(p.read_text())
if obj.get('provider') != 'supabase':
    raise SystemExit('QB/SUPABASE_ENV_REF.json provider must be supabase')
if not isinstance(obj.get('enabled'), bool):
    raise SystemExit('QB/SUPABASE_ENV_REF.json enabled must be boolean')
if not isinstance(obj.get('env_file_path'), str) or not obj.get('env_file_path').strip():
    raise SystemExit('QB/SUPABASE_ENV_REF.json env_file_path must be non-empty string')
if not isinstance(obj.get('required_keys'), list) or len(obj.get('required_keys')) == 0:
    raise SystemExit('QB/SUPABASE_ENV_REF.json required_keys must be non-empty array')
print('supabase env reference: OK')
PY

echo "QB check: validating local domain config"
python3 - <<'PY'
import json
from pathlib import Path
p=Path('QB/LOCAL_DOMAIN.json')
obj=json.loads(p.read_text())
required=['project','project_slug','domain','gateway_port','base_url','upstream_host','upstream_port']
missing=[k for k in required if k not in obj]
if missing:
    raise SystemExit(f"Missing keys in QB/LOCAL_DOMAIN.json: {missing}")
if not str(obj.get('domain','')).endswith('.localhost'):
    raise SystemExit('QB/LOCAL_DOMAIN.json domain must end with .localhost')
if int(obj.get('gateway_port',0)) <= 0:
    raise SystemExit('QB/LOCAL_DOMAIN.json gateway_port must be positive integer')
if not str(obj.get('base_url','')).startswith('http://'):
    raise SystemExit('QB/LOCAL_DOMAIN.json base_url must start with http://')
if int(obj.get('upstream_port',0)) <= 0:
    raise SystemExit('QB/LOCAL_DOMAIN.json upstream_port must be positive integer')
print('local domain config: OK')
PY

echo "QB check: validating status.json"
python3 - <<'PY'
import json
from pathlib import Path
p=Path('QB/status.json')
obj=json.loads(p.read_text())
required=['project','updated_at','mode','health','goals','blockers','next_actions','project_type']
missing=[k for k in required if k not in obj]
if missing:
    raise SystemExit(f"Missing keys in QB/status.json: {missing}")
allowed_project_types={'internal_platform','standalone_product','self_service_offer','contract_spawn'}
pt=obj.get('project_type')
if pt not in allowed_project_types:
    raise SystemExit(f"Invalid project_type in QB/status.json: {pt}")
print('status.json OK')
PY

echo "QB check: validating artifact thread map"
python3 - <<'PY'
import json
from pathlib import Path

status=json.loads(Path('QB/status.json').read_text())
m=json.loads(Path('QB/ARTIFACT_THREAD_MAP.json').read_text())
required_top=['project','project_type','updated_at','artifact_mappings']
missing=[k for k in required_top if k not in m]
if missing:
    raise SystemExit(f"Missing keys in QB/ARTIFACT_THREAD_MAP.json: {missing}")
if m['project_type']!=status['project_type']:
    raise SystemExit('project_type mismatch between status.json and ARTIFACT_THREAD_MAP.json')
if not isinstance(m['artifact_mappings'],list):
    raise SystemExit('artifact_mappings must be an array')

allowed_types={
 'framework_foundation','operating_canon','execution_control','governance_gate','alignment_and_drift',
 'pilot_productization','security_integrity','infrastructure_environment','bootstrap_prompt'
}
allowed_threads={'00_QB','01','02','03','04','05','06','07','08','09'}
allowed_status={'active','planned','archived'}

for i,row in enumerate(m['artifact_mappings']):
    for key in ['artifact_type','primary_thread','secondary_threads','status','owner']:
        if key not in row:
            raise SystemExit(f'artifact_mappings[{i}] missing key: {key}')
    if row['artifact_type'] not in allowed_types:
        raise SystemExit(f"artifact_mappings[{i}] invalid artifact_type: {row['artifact_type']}")
    if row['primary_thread'] not in allowed_threads:
        raise SystemExit(f"artifact_mappings[{i}] invalid primary_thread: {row['primary_thread']}")
    if row['status'] not in allowed_status:
        raise SystemExit(f"artifact_mappings[{i}] invalid status: {row['status']}")
    if not isinstance(row['secondary_threads'],list):
        raise SystemExit(f"artifact_mappings[{i}] secondary_threads must be array")
    for t in row['secondary_threads']:
        if t not in allowed_threads:
            raise SystemExit(f"artifact_mappings[{i}] invalid secondary thread: {t}")
    if not isinstance(row['owner'],str) or not row['owner'].strip():
        raise SystemExit(f"artifact_mappings[{i}] owner must be non-empty")

# every active artifact must have primary_thread by schema above; ensure at least one active row exists
active=[r for r in m['artifact_mappings'] if r.get('status')=='active']
if not active:
    raise SystemExit('At least one active artifact mapping is required')

# UXOS full matrix requirement
if status.get('project')=='UXOS':
    p=Path('QB/PRIMARY_ARTIFACT_THREAD_MATRIX.json')
    if not p.exists():
        raise SystemExit('Missing QB/PRIMARY_ARTIFACT_THREAD_MATRIX.json for UXOS')
    pm=json.loads(p.read_text())
    if 'matrix_rows' not in pm or not isinstance(pm['matrix_rows'],list) or len(pm['matrix_rows'])==0:
        raise SystemExit('PRIMARY_ARTIFACT_THREAD_MATRIX.json missing matrix_rows')

print('artifact thread map: OK')
PY

echo "QB check: validating FFA epistemic_state requirements (if FFA exists)"
python3 - <<'PY'
import json
from pathlib import Path

p = Path('08_Data_Model_and_API_Contracts/ffa_instance.json')
if not p.exists():
    print('ffa_instance.json not found; skipping FFA epistemic_state check')
    raise SystemExit(0)

obj = json.loads(p.read_text())
foundation = obj.get('framework_foundation')
if not isinstance(foundation, dict):
    raise SystemExit('ffa_instance.json missing framework_foundation object')

required_ost_keys = ['desired_outcomes', 'opportunities', 'solutions', 'ost_links']
for key in required_ost_keys:
    if key not in foundation:
        raise SystemExit(f'framework_foundation missing required OST field: {key}')
    if not isinstance(foundation.get(key), list):
        raise SystemExit(f'framework_foundation.{key} must be an array')

policy = foundation.get('epistemic_state_policy')
if not isinstance(policy, dict):
    raise SystemExit('framework_foundation.epistemic_state_policy is required')

seed_policy = foundation.get('seed_data_policy')
if not isinstance(seed_policy, dict):
    raise SystemExit('framework_foundation.seed_data_policy is required')
if set(seed_policy.get('evaluation_status_allowed_values', [])) != {'research_backed', 'research_needed'}:
    raise SystemExit('seed_data_policy.evaluation_status_allowed_values must be exactly: research_backed,research_needed')

allowed = policy.get('allowed_values')
if not isinstance(allowed, list) or set(allowed) != {'seed', 'hypothesis', 'stabilized'}:
    raise SystemExit('epistemic_state_policy.allowed_values must be exactly: seed,hypothesis,stabilized')

if policy.get('field_name') != 'epistemic_state':
    raise SystemExit('epistemic_state_policy.field_name must be epistemic_state')

for key, value in foundation.items():
    if not isinstance(value, list):
        continue
    for i, row in enumerate(value):
        if not isinstance(row, dict):
            raise SystemExit(f'framework_foundation.{key}[{i}] must be an object')
        state = row.get('epistemic_state')
        if state is None:
            raise SystemExit(f'framework_foundation.{key}[{i}] missing epistemic_state')
        if state not in {'seed', 'hypothesis', 'stabilized'}:
            raise SystemExit(f'framework_foundation.{key}[{i}] invalid epistemic_state: {state}')
        if state == 'seed':
            md = row.get('seed_metadata')
            if not isinstance(md, dict):
                raise SystemExit(f'framework_foundation.{key}[{i}] seed record missing seed_metadata')
            if not md.get('seed_label'):
                raise SystemExit(f'framework_foundation.{key}[{i}] seed_metadata.seed_label is required')
            if md.get('evaluation_status') not in {'research_backed', 'research_needed'}:
                raise SystemExit(f'framework_foundation.{key}[{i}] seed_metadata.evaluation_status invalid')
            if not md.get('probe_intent'):
                raise SystemExit(f'framework_foundation.{key}[{i}] seed_metadata.probe_intent is required')

print('ffa epistemic_state: OK')
PY

echo "QB check: validating FFA <-> plan alignment requirements"
python3 - <<'PY'
import json
import hashlib
from pathlib import Path

ffa = Path('08_Data_Model_and_API_Contracts/ffa_instance.json')
wq = Path('QB/WORK_QUEUE.md')
state = Path('QB/PLAN_ALIGNMENT_STATE.json')

if ffa.exists():
    if not state.exists():
        raise SystemExit('Missing QB/PLAN_ALIGNMENT_STATE.json while ffa_instance.json exists. Run ./QB/qb ffa-plan-sync')
    ffa_hash = hashlib.sha256(ffa.read_bytes()).hexdigest()
    obj = json.loads(state.read_text())
    if obj.get('last_ffa_hash') != ffa_hash:
        raise SystemExit('FFA changed since last sync. Run ./QB/qb ffa-plan-sync')
    if obj.get('alignment_status') not in {'aligned', 'drifted', 'unknown'}:
        raise SystemExit('QB/PLAN_ALIGNMENT_STATE.json alignment_status must be one of: aligned|drifted|unknown')

if not wq.exists():
    raise SystemExit('Missing QB/WORK_QUEUE.md')

active_status = {'queued', 'in_progress', 'blocked'}
missing = []
for line in wq.read_text().splitlines():
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

if missing:
    raise SystemExit(
        'Active WORK_QUEUE items missing ffa binding markers. '
        'Add ffa_ref:<id> or no_ffa_impact_reason:<reason> in notes. '
        f'Missing: {", ".join(sorted(set(missing)))}'
    )

print('ffa-plan alignment: OK')
PY

echo "QB check: validating decision log"
if ! rg -n "^## [0-9]{4}-[0-9]{2}-[0-9]{2}" QB/DECISION_LOG.md >/dev/null 2>&1; then
  echo "DECISION_LOG missing dated entry header (## YYYY-MM-DD)"
  exit 1
fi

echo "QB check: validating marketing telemetry requirements (if enabled)"
python3 - <<'PY'
import json
from pathlib import Path

status = json.loads(Path('QB/status.json').read_text())
if not status.get('marketing_surface_enabled', False):
    print('marketing telemetry: not enabled for this repo')
    raise SystemExit(0)

status_file = Path('QB/MARKETING_TELEMETRY_STATUS.json')
scoreboard = Path('QB/MARKETING_TELEMETRY_SCOREBOARD.md')

if not status_file.exists():
    raise SystemExit('Missing QB/MARKETING_TELEMETRY_STATUS.json while marketing_surface_enabled=true')
if not scoreboard.exists():
    raise SystemExit('Missing QB/MARKETING_TELEMETRY_SCOREBOARD.md while marketing_surface_enabled=true')

obj = json.loads(status_file.read_text())
required = ['enabled','owner','last_updated','event_schema_version','kpis','data_sources','review_cadence','blockers']
missing = [k for k in required if k not in obj]
if missing:
    raise SystemExit(f'Missing keys in QB/MARKETING_TELEMETRY_STATUS.json: {missing}')

if obj.get('enabled') is not True:
    raise SystemExit('QB/MARKETING_TELEMETRY_STATUS.json enabled must be true when marketing_surface_enabled=true')
if not isinstance(obj.get('owner'), str) or not obj['owner'].strip():
    raise SystemExit('Telemetry owner must be non-empty')
if not isinstance(obj.get('last_updated'), str) or not obj['last_updated'].strip():
    raise SystemExit('Telemetry last_updated must be non-empty string')
if not isinstance(obj.get('event_schema_version'), str) or not obj['event_schema_version'].strip():
    raise SystemExit('Telemetry event_schema_version must be non-empty string')
if not isinstance(obj.get('kpis'), list) or len(obj['kpis']) < 3:
    raise SystemExit('Telemetry kpis must include at least 3 entries')
if not isinstance(obj.get('data_sources'), list) or len(obj['data_sources']) < 1:
    raise SystemExit('Telemetry data_sources must include at least 1 source')
if not isinstance(obj.get('review_cadence'), str) or not obj['review_cadence'].strip():
    raise SystemExit('Telemetry review_cadence must be non-empty')
if not isinstance(obj.get('blockers'), list):
    raise SystemExit('Telemetry blockers must be an array')

score_text = scoreboard.read_text()
import re
if not re.search(r'^##\s+\d{4}-\d{2}-\d{2}', score_text, flags=re.M):
    raise SystemExit('MARKETING_TELEMETRY_SCOREBOARD.md must include dated section header: ## YYYY-MM-DD')

print('marketing telemetry: OK')
PY

echo "QB check: validating research instrumentation requirements (if enabled)"
python3 - <<'PY'
import json
from pathlib import Path
import re

status = json.loads(Path('QB/status.json').read_text())
if not status.get('research_surface_enabled', False):
    print('research instrumentation: not enabled for this repo')
    raise SystemExit(0)

status_file = Path('QB/RESEARCH_INSTRUMENTATION_STATUS.json')
register = Path('QB/RESEARCH_EXPERIMENT_REGISTER.md')
scoreboard = Path('QB/RESEARCH_LEARNING_SCOREBOARD.md')

if not status_file.exists():
    raise SystemExit('Missing QB/RESEARCH_INSTRUMENTATION_STATUS.json while research_surface_enabled=true')
if not register.exists():
    raise SystemExit('Missing QB/RESEARCH_EXPERIMENT_REGISTER.md while research_surface_enabled=true')
if not scoreboard.exists():
    raise SystemExit('Missing QB/RESEARCH_LEARNING_SCOREBOARD.md while research_surface_enabled=true')

obj = json.loads(status_file.read_text())
required = ['enabled','owner','last_updated','hypothesis_register','learning_scoreboard','review_cadence','blockers']
missing = [k for k in required if k not in obj]
if missing:
    raise SystemExit(f'Missing keys in QB/RESEARCH_INSTRUMENTATION_STATUS.json: {missing}')
if obj.get('enabled') is not True:
    raise SystemExit('QB/RESEARCH_INSTRUMENTATION_STATUS.json enabled must be true when research_surface_enabled=true')
if not isinstance(obj.get('owner'), str) or not obj['owner'].strip():
    raise SystemExit('Research owner must be non-empty')
if not isinstance(obj.get('last_updated'), str) or not obj['last_updated'].strip():
    raise SystemExit('Research last_updated must be non-empty string')
if not isinstance(obj.get('review_cadence'), str) or not obj['review_cadence'].strip():
    raise SystemExit('Research review_cadence must be non-empty')
if not isinstance(obj.get('blockers'), list):
    raise SystemExit('Research blockers must be an array')

reg_text = register.read_text()
if '| hypothesis_id | status | owner | method | metric | timeframe | evidence_links | notes |' not in reg_text:
    raise SystemExit('RESEARCH_EXPERIMENT_REGISTER.md must keep canonical header row')

score_text = scoreboard.read_text()
if not re.search(r'^##\s+\d{4}-\d{2}-\d{2}', score_text, flags=re.M):
    raise SystemExit('RESEARCH_LEARNING_SCOREBOARD.md must include dated section header: ## YYYY-MM-DD')

print('research instrumentation: OK')
PY

echo "QB check: validating UI capture instrumentation requirements (if enabled)"
python3 - <<'PY'
import json
from pathlib import Path

status = json.loads(Path('QB/status.json').read_text())
if not status.get('ui_capture_enabled', False):
    print('ui capture instrumentation: not enabled for this repo')
    raise SystemExit(0)

status_file = Path('QB/WEB_INSTRUMENTATION_STATUS.json')
targets_file = Path('QB/WEB_CAPTURE_TARGETS.json')

if not status_file.exists():
    raise SystemExit('Missing QB/WEB_INSTRUMENTATION_STATUS.json while ui_capture_enabled=true')
if not targets_file.exists():
    raise SystemExit('Missing QB/WEB_CAPTURE_TARGETS.json while ui_capture_enabled=true')

obj = json.loads(status_file.read_text())
required = ['enabled','owner','last_updated','capture_tool','capture_targets_file','capture_cadence','blockers']
missing = [k for k in required if k not in obj]
if missing:
    raise SystemExit(f'Missing keys in QB/WEB_INSTRUMENTATION_STATUS.json: {missing}')
if obj.get('enabled') is not True:
    raise SystemExit('QB/WEB_INSTRUMENTATION_STATUS.json enabled must be true when ui_capture_enabled=true')
if not isinstance(obj.get('owner'), str) or not obj['owner'].strip():
    raise SystemExit('UI capture owner must be non-empty')
if not isinstance(obj.get('last_updated'), str) or not obj['last_updated'].strip():
    raise SystemExit('UI capture last_updated must be non-empty string')
if not isinstance(obj.get('capture_tool'), str) or not obj['capture_tool'].strip():
    raise SystemExit('UI capture capture_tool must be non-empty string')
if not isinstance(obj.get('blockers'), list):
    raise SystemExit('UI capture blockers must be an array')

targets = json.loads(targets_file.read_text())
if not isinstance(targets.get('targets'), list) or len(targets['targets']) < 1:
    raise SystemExit('WEB_CAPTURE_TARGETS.json must include at least one target')
for i, t in enumerate(targets['targets']):
    for key in ['id','url','viewport','required']:
        if key not in t:
            raise SystemExit(f'WEB_CAPTURE_TARGETS.json targets[{i}] missing key: {key}')
    if not isinstance(t['id'], str) or not t['id'].strip():
        raise SystemExit(f'WEB_CAPTURE_TARGETS.json targets[{i}] id must be non-empty string')
    if not isinstance(t['url'], str) or not t['url'].strip():
        raise SystemExit(f'WEB_CAPTURE_TARGETS.json targets[{i}] url must be non-empty string')

print('ui capture instrumentation: OK')
PY

echo "QB check: OK"
