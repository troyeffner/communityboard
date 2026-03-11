#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENABLE_MARKETING=false
ENABLE_RESEARCH=false
ENABLE_UI_CAPTURE=false
CAPTURE_URL=""

usage() {
  cat <<USAGE
Usage:
  ./QB/qb instrument [--enable-marketing] [--enable-research] [--enable-ui-capture] [--capture-url <url>]

Purpose:
  Manage QB web instrumentation package and optional screenshot capture.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --enable-marketing)
      ENABLE_MARKETING=true
      shift
      ;;
    --enable-research)
      ENABLE_RESEARCH=true
      shift
      ;;
    --enable-ui-capture)
      ENABLE_UI_CAPTURE=true
      shift
      ;;
    --capture-url)
      CAPTURE_URL="${2:-}"
      shift 2
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

python3 - "$ENABLE_MARKETING" "$ENABLE_RESEARCH" "$ENABLE_UI_CAPTURE" <<'PY'
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

enable_marketing = sys.argv[1].lower() == "true"
enable_research = sys.argv[2].lower() == "true"
enable_ui_capture = sys.argv[3].lower() == "true"

status_path = Path("QB/status.json")
status = json.loads(status_path.read_text())
now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

if enable_marketing:
    status["marketing_surface_enabled"] = True
if enable_research:
    status["research_surface_enabled"] = True
if enable_ui_capture:
    status["ui_capture_enabled"] = True

status["updated_at"] = now
status_path.write_text(json.dumps(status, indent=2) + "\n")

def load_json(path):
    return json.loads(path.read_text())

if enable_marketing:
    p = Path("QB/MARKETING_TELEMETRY_STATUS.json")
    o = load_json(p)
    o["enabled"] = True
    if not isinstance(o.get("owner"), str) or not o.get("owner", "").strip():
        o["owner"] = status.get("project", "Troy")
    o["last_updated"] = now
    if not isinstance(o.get("event_schema_version"), str) or not o.get("event_schema_version", "").strip():
        o["event_schema_version"] = "v1"
    if not isinstance(o.get("kpis"), list) or len(o["kpis"]) < 3:
        o["kpis"] = ["cta_engagement_rate", "survey_completion_rate", "qualified_signal_rate"]
    if not isinstance(o.get("data_sources"), list) or len(o["data_sources"]) < 1:
        o["data_sources"] = ["local_events"]
    if not isinstance(o.get("review_cadence"), str) or not o.get("review_cadence", "").strip():
        o["review_cadence"] = "weekly"
    if not isinstance(o.get("blockers"), list):
        o["blockers"] = []
    p.write_text(json.dumps(o, indent=2) + "\n")

if enable_research:
    p = Path("QB/RESEARCH_INSTRUMENTATION_STATUS.json")
    o = load_json(p)
    o["enabled"] = True
    if not isinstance(o.get("owner"), str) or not o.get("owner", "").strip():
        o["owner"] = status.get("project", "Troy")
    o["last_updated"] = now
    if not isinstance(o.get("review_cadence"), str) or not o.get("review_cadence", "").strip():
        o["review_cadence"] = "weekly"
    if not isinstance(o.get("blockers"), list):
        o["blockers"] = []
    p.write_text(json.dumps(o, indent=2) + "\n")

if enable_ui_capture:
    p = Path("QB/WEB_INSTRUMENTATION_STATUS.json")
    o = load_json(p)
    o["enabled"] = True
    if not isinstance(o.get("owner"), str) or not o.get("owner", "").strip():
        o["owner"] = status.get("project", "Troy")
    o["last_updated"] = now
    if not isinstance(o.get("capture_tool"), str) or not o.get("capture_tool", "").strip():
        o["capture_tool"] = "playwright"
    if not isinstance(o.get("capture_cadence"), str) or not o.get("capture_cadence", "").strip():
        o["capture_cadence"] = "per PR and before release"
    if not isinstance(o.get("blockers"), list):
        o["blockers"] = []
    p.write_text(json.dumps(o, indent=2) + "\n")

print("instrumentation status updated")
PY

if [[ -z "$CAPTURE_URL" && -f "QB/LOCAL_DOMAIN.json" ]]; then
  CAPTURE_URL="$(python3 - <<'PY'
import json
from pathlib import Path
p=Path('QB/LOCAL_DOMAIN.json')
obj=json.loads(p.read_text())
print(obj.get('base_url','').rstrip('/') + '/')
PY
)"
fi

if [[ -n "$CAPTURE_URL" ]]; then
  mkdir -p QB/artifacts/screens
  SHOT="QB/artifacts/screens/$(date -u +%Y%m%dT%H%M%SZ)_capture.png"
  if command -v npx >/dev/null 2>&1 && npx playwright --version >/dev/null 2>&1; then
    npx playwright screenshot "$CAPTURE_URL" "$SHOT" >/dev/null 2>&1 || {
      echo "capture failed with playwright; URL may be unavailable: $CAPTURE_URL"
      exit 1
    }
    echo "screenshot captured: $SHOT"
  else
    echo "playwright unavailable; skipping screenshot capture"
  fi
fi

echo "qb instrument: complete"
