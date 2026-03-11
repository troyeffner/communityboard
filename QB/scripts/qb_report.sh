#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

python3 - <<'PY'
import json
import hashlib
from pathlib import Path
from datetime import datetime, timezone

status=json.loads(Path('QB/status.json').read_text())
ffa_path = Path('08_Data_Model_and_API_Contracts/ffa_instance.json')
alignment_path = Path('QB/PLAN_ALIGNMENT_STATE.json')
local_domain_path = Path('QB/LOCAL_DOMAIN.json')
alignment='unknown'
if alignment_path.exists():
  try:
    obj=json.loads(alignment_path.read_text())
    alignment=obj.get('alignment_status','unknown')
    if ffa_path.exists():
      cur=hashlib.sha256(ffa_path.read_bytes()).hexdigest()
      if obj.get('last_ffa_hash') != cur:
        alignment='drifted'
  except Exception:
    alignment='unknown'
local_domain = None
if local_domain_path.exists():
  try:
    local_domain = json.loads(local_domain_path.read_text())
  except Exception:
    local_domain = None
out=Path('QB') / f"report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.md"
goals = status.get('goals', [])
active_goals = [g for g in goals if g.get('status') in {'in_progress', 'planned'}]
top_goal = active_goals[0] if active_goals else (goals[0] if goals else None)
blockers = status.get('blockers',[])
next_actions = status.get('next_actions',[])
next_action = next_actions[0] if next_actions else None

learned = f"Project health is {status.get('health','unknown')} with FFA alignment {alignment}."
if blockers:
  learned += " Active blocker pressure exists and needs active management."
else:
  learned += " No active blockers are currently recorded."

changed = "State refreshed from canonical QB status."
if top_goal:
  changed += f" Primary focus remains: {top_goal.get('name','(unnamed goal)')}."

next_line = "Decide and execute the highest-priority next action."
if next_action:
  if isinstance(next_action, dict):
    next_line = f"Execute next action: {next_action.get('title','(untitled action)')}."
  else:
    next_line = f"Execute next action: {str(next_action)}."

lines=[
  '# QB Status Report',
  '',
  f"Project: {status.get('project','')}",
  f"Updated at: {status.get('updated_at','')}",
  f"Mode: {status.get('mode','')}",
  f"Health: {status.get('health','')}",
  f"FFA plan alignment: {alignment}",
  '',
  '## What We Learned',
  f"- {learned}",
  '',
  '## What Changed',
  f"- {changed}",
  '',
  '## What Matters Next',
  f"- {next_line}",
  '',
  '## Local Domain',
]
if local_domain:
  lines += [
    f"- domain: {local_domain.get('domain','')}",
    f"- base_url: {local_domain.get('base_url','')}",
    f"- upstream: {local_domain.get('upstream_host','')}:{local_domain.get('upstream_port','')}",
    f"- gateway_port: {local_domain.get('gateway_port','')}",
  ]
else:
  lines += ['- QB/LOCAL_DOMAIN.json unreadable or missing']

lines += [
  '',
  '## Goals',
]
for g in status.get('goals',[]):
  lines.append(f"- {g.get('id')}: {g.get('name')} [{g.get('status')}] progress={g.get('progress')}")
lines += ['', '## Blockers']
if blockers:
  lines += [f"- {b}" for b in blockers]
else:
  lines.append('- none')
lines += [
  '',
  '## Notes',
  '- Daily heartbeat generated from canonical QB status.',
  '- Use ./QB/qb sync to review git changes before adjusting status.',
]
out.write_text('\n'.join(lines)+'\n')
print(out)
PY

echo "QB report generated"
