#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# Always refresh operating baseline first so WoW updates do not rely on dispatch fan-out.
./QB/scripts/qb_refresh_wow.sh >/dev/null

WOW_FILES=(
  "QB/README.md"
  "QB/policies/pm_hybrid_update_policy.md"
  "QB/policies/human_update_style_policy.md"
  "QB/THREAD_INTRO_STANDARD_00_08.md"
)

for f in "${WOW_FILES[@]}"; do
  [[ -f "$f" ]] || { echo "WoW precheck failed: missing $f"; exit 1; }
done

OUT="QB/dispatch/git_sync_$(date +%Y%m%d).md"
SUMMARY_OUT="QB/dispatch/update_summary_$(date +%Y%m%d).md"

if [[ ! -d .git ]]; then
  echo "No git repo detected; creating empty sync note"
  cat > "$OUT" <<'EOF2'
# QB Git Sync Note

No git repository found. Use manual status update.
EOF2
  python3 - <<'PY'
import json
from pathlib import Path
from datetime import datetime, timezone

status = json.loads(Path('QB/status.json').read_text()) if Path('QB/status.json').exists() else {}
out = Path('QB/dispatch') / f"update_summary_{datetime.now(timezone.utc).strftime('%Y%m%d')}.md"
lines = [
  '# QB Update Summary',
  '',
  '## What We Learned',
  '- No git repository is configured, so update extraction is limited to status artifacts.',
  '',
  '## What Changed',
  '- WoW precheck passed.',
  '- Git sync note generated in fallback mode.',
  '',
  '## What Matters Next',
  '- Initialize git and create first commit to enable full historical sync.',
  '',
  '## Evidence/Logistics',
  '- fallback sync note generated',
]
out.write_text('\n'.join(lines) + '\n')
print(f'human summary generated: {out.as_posix()}')
PY
  echo "QB sync generated: $OUT"
  exit 0
fi

LAST_DATE="$(python3 - <<'PY'
import json
from pathlib import Path
p=Path('QB/status.json')
if not p.exists():
    print('')
else:
    obj=json.loads(p.read_text())
    print(obj.get('updated_at',''))
PY
)"

RANGE_ARG=()
if [[ -n "$LAST_DATE" ]]; then
  RANGE_ARG=(--since="$LAST_DATE")
fi

{
  echo "# QB Git Sync Note"
  echo
  echo "Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "Status last updated: ${LAST_DATE:-unknown}"
  echo
  echo "## Recent Commits"
  git log "${RANGE_ARG[@]}" --pretty='- %h %ad %s' --date=short -n 30 || true
  echo
  echo "## Changed Files (recent)"
  git diff --name-only HEAD~20..HEAD 2>/dev/null | sed 's/^/- /' || true
  echo
  echo "## Suggested QB Status Review"
  echo "- Check if any goal status should change."
  echo "- Check if blockers appeared/resolved."
  echo "- Check if decisions need recording in status/brief."
  echo
  echo "## Human Takeaways"
  echo "- What changed most in the repo since last status update?"
  echo "- What did we learn from those changes?"
  echo "- What matters next for decision-making?"
} > "$OUT"

python3 - <<'PY'
import json
from pathlib import Path
from datetime import datetime, timezone

status_path = Path('QB/status.json')
sync_path = Path('QB/dispatch') / f"git_sync_{datetime.now(timezone.utc).strftime('%Y%m%d')}.md"
summary_path = Path('QB/dispatch') / f"update_summary_{datetime.now(timezone.utc).strftime('%Y%m%d')}.md"
wow_state_path = Path('QB/WOW_BASELINE_STATE.json')

status = json.loads(status_path.read_text()) if status_path.exists() else {}
goals = status.get('goals', [])
blockers = status.get('blockers', [])
next_actions = status.get('next_actions', [])
top_goal = goals[0] if goals else None
top_next = next_actions[0] if next_actions else None

changed_files = 0
if sync_path.exists():
    for line in sync_path.read_text().splitlines():
        if line.startswith('- ') and '/' in line and not line.startswith('- Check'):
            changed_files += 1

learned = f"Repo has {'active blockers' if blockers else 'no active blockers'} and remains in {status.get('mode','unknown')} mode."
if top_goal and isinstance(top_goal, dict):
    learned += f" Current focus is {top_goal.get('name','(unnamed goal)')}."

wow_status = 'unknown'
wow_version = 'unknown'
if wow_state_path.exists():
    try:
        ws = json.loads(wow_state_path.read_text())
        wow_status = ws.get('status', 'unknown')
        wow_version = ws.get('applied_version', 'unknown')
    except Exception:
        pass

changed = (
    f"WoW baseline {wow_status} (version {wow_version}), precheck passed, and update sync processed. "
    f"Estimated changed files reviewed: {changed_files}."
)

if isinstance(top_next, dict):
    next_line = f"Advance next action: {top_next.get('title','(untitled action)')}."
else:
    next_line = "Review queue priorities and choose one concrete next action."

lines = [
    '# QB Update Summary',
    '',
    '## What We Learned',
    f'- {learned}',
    '',
    '## What Changed',
    f'- {changed}',
    '',
    '## What Matters Next',
    f'- {next_line}',
    '',
    '## Evidence/Logistics',
    f'- sync note: {sync_path.as_posix()}',
]
summary_path.write_text('\n'.join(lines) + '\n')
print(f'human summary generated: {summary_path.as_posix()}')
PY

./QB/qb check >/dev/null
./QB/qb report >/dev/null

echo "QB sync generated: $OUT"
echo "QB update summary generated: $SUMMARY_OUT"
