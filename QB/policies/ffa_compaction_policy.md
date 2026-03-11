---
type: qb-policy
from: communityboard-qb
date: 2026-03-10
status: active
topics: [policy, qb, governance]
fractals: [communityboard]
cluster: qb-policies
---

# FFA Compaction Policy

Status: canonical
Owner: QB

## Rule
- FFA means Framework Foundation Artifacts.
- Any `update FFA` request must include:
1. direct artifact update
2. linked assumption/knowledge update
3. version movement for all touched artifacts/records
4. `epistemic_state` on each touched framework record (`seed|hypothesis|stabilized`)

## Conversation Compaction
- Use `./QB/qb compact` to convert long threads into FFA-only actionable output.
- Incidental conversation content must be excluded from `FFA_UPDATE_SET`.
- Any accepted FFA update from compaction must run `./QB/qb ffa-plan-sync` before `./QB/qb check`.
