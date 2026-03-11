#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PROJECT=""
DESTINATION="00_QB"
CONVERSATION=""
CONVERSATION_FILE=""
OUTPUT=""

usage() {
  cat <<USAGE
Usage:
  ./QB/qb compact [--destination <tool/thread>] [--conversation <text> | --conversation-file <path>] [--output <path>]

Purpose:
  Package a strict FFA compaction prompt that removes incidental conversation noise
  and returns only linked, versioned FFA updates.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --destination)
      DESTINATION="${2:-}"
      shift 2
      ;;
    --conversation)
      CONVERSATION="${2:-}"
      shift 2
      ;;
    --conversation-file)
      CONVERSATION_FILE="${2:-}"
      shift 2
      ;;
    --output)
      OUTPUT="${2:-}"
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

if [[ -n "$CONVERSATION" && -n "$CONVERSATION_FILE" ]]; then
  echo "Use only one of --conversation or --conversation-file" >&2
  exit 1
fi

if [[ -n "$CONVERSATION_FILE" ]]; then
  if [[ ! -f "$CONVERSATION_FILE" ]]; then
    echo "conversation file not found: $CONVERSATION_FILE" >&2
    exit 1
  fi
  CONVERSATION="$(cat "$CONVERSATION_FILE")"
fi

if [[ -f "$ROOT/QB/status.json" ]]; then
  PROJECT="$(jq -r '.project // empty' "$ROOT/QB/status.json" 2>/dev/null || true)"
fi
if [[ -z "$PROJECT" || "$PROJECT" == "null" ]]; then
  PROJECT="$(basename "$ROOT")"
fi

if [[ -z "${CONVERSATION// }" ]]; then
  CONVERSATION='[Paste conversation transcript or concise summary here]'
fi

emit_payload() {
  cat <<EOF2
Project
$PROJECT

Destination
$DESTINATION

Prompt
You are the QB operating under UXOS canon.

Task
Compact the conversation into only actionable FFA updates.

FFA Canon
- FFA = Framework Foundation Artifacts.
- "Update FFA" requires a linked-change bundle:
  - direct FFA artifact update
  - linked assumption/knowledge update in related artifacts
  - version movement for all touched records/artifacts

Compaction Rules
- Remove incidental chatter, acknowledgements, repeats, and transient instructions.
- Keep only durable decisions, schema/policy deltas, and traceable actions.
- Do not invent facts. Mark uncertain items as pending with reason.

Required Output (strict)
1. FFA_UPDATE_SET
- One item per update:
  - artifact_type
  - target_path_or_id
  - change_summary
  - rationale
  - linked_updates[] (path_or_id + link_reason)
  - epistemic_state (seed|hypothesis|stabilized)
  - version_change (from -> to or pending)
  - owner
  - priority (high|medium|low)

2. INCIDENTAL_REMOVALS
- Removed items + reason code: chatter | duplicate | transient_instruction | out_of_scope

3. DRIFT_AND_GAPS
- drift_flags[] and missing_dependencies[]

4. EXECUTION_PATCH_PLAN
- Ordered file-edit plan.

5. ACCEPTANCE
- Confirm each active FFA update includes linked updates + version tracking.
- Confirm no incidental items remain in FFA_UPDATE_SET.

Return Format
Output only these headings in order:
- FFA_UPDATE_SET
- INCIDENTAL_REMOVALS
- DRIFT_AND_GAPS
- EXECUTION_PATCH_PLAN
- ACCEPTANCE

Conversation Source
$CONVERSATION
EOF2
}

if [[ -n "$OUTPUT" ]]; then
  mkdir -p "$(dirname "$OUTPUT")"
  emit_payload > "$OUTPUT"
  echo "Wrote compact prompt: $OUTPUT"
  exit 0
fi

emit_payload
