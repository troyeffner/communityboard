#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

CMD="${1:-show}"
REF_FILE="QB/SUPABASE_ENV_REF.json"

usage() {
  cat <<USAGE
Usage:
  ./QB/qb supabase-env show
  ./QB/qb supabase-env set-ref --env-file <abs-path> [--project-ref <ref>]
  ./QB/qb supabase-env sync
USAGE
}

if [[ ! -f "$REF_FILE" ]]; then
  echo "Missing $REF_FILE"
  exit 1
fi

case "$CMD" in
  show)
    cat "$REF_FILE"
    ;;
  set-ref)
    ENV_FILE=""
    PROJECT_REF=""
    shift || true
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --env-file)
          ENV_FILE="${2:-}"; shift 2 ;;
        --project-ref)
          PROJECT_REF="${2:-}"; shift 2 ;;
        *)
          echo "Unknown arg: $1"; usage; exit 1 ;;
      esac
    done
    if [[ -z "$ENV_FILE" ]]; then
      echo "--env-file is required"
      exit 1
    fi
    python3 - "$ENV_FILE" "$PROJECT_REF" <<'PY'
import json
from pathlib import Path
import sys
p=Path('QB/SUPABASE_ENV_REF.json')
obj=json.loads(p.read_text())
obj['env_file_path']=sys.argv[1]
if sys.argv[2]:
    obj['project_ref']=sys.argv[2]
p.write_text(json.dumps(obj, indent=2)+'\n')
print('Supabase env ref updated')
PY
    ;;
  sync)
    python3 - <<'PY'
import json
import re
from pathlib import Path
from datetime import datetime, timezone

ref_path=Path('QB/SUPABASE_ENV_REF.json')
ref=json.loads(ref_path.read_text())
if not ref.get('enabled', True):
    print('Supabase env sync disabled in reference file')
    raise SystemExit(0)

src=Path(ref.get('env_file_path',''))
if not src.exists():
    raise SystemExit(f'Supabase env source not found: {src}')

target=Path(ref.get('sync_target','.env.local'))
required=ref.get('required_keys',[])

source_vars={}
for line in src.read_text().splitlines():
    line=line.strip()
    if not line or line.startswith('#') or '=' not in line:
        continue
    k,v=line.split('=',1)
    source_vars[k.strip()]=v.strip()

start='# >>> QB_SUPABASE_MANAGED >>>'
end='# <<< QB_SUPABASE_MANAGED <<<'
existing=[]
if target.exists():
    existing=target.read_text().splitlines()

clean=[]
in_block=False
for line in existing:
    if line.strip()==start:
        in_block=True
        continue
    if line.strip()==end:
        in_block=False
        continue
    if not in_block:
        clean.append(line)

managed=[start, '# Managed by ./QB/qb supabase-env sync']
missing=[]
for k in required:
    if k in source_vars and source_vars[k] != '':
        managed.append(f'{k}={source_vars[k]}')
    else:
        missing.append(k)
managed.append(end)

out=clean
if out and out[-1].strip()!='':
    out.append('')
out.extend(managed)

target.write_text('\n'.join(out)+'\n')

ref['last_synced_at']=datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
ref_path.write_text(json.dumps(ref, indent=2)+'\n')

print(f'Synced Supabase keys to {target}')
if missing:
    print('Missing keys in source env:', ', '.join(missing))
PY
    ;;
  *)
    usage
    exit 1
    ;;
esac
