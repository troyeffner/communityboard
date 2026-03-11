---
type: qb-policy
from: communityboard-qb
date: 2026-03-10
status: active
topics: [policy, qb, governance]
fractals: [communityboard]
cluster: qb-policies
---

# QB-to-QB Handoffs

Status: canonical

## Rule
QB-to-QB communication is allowed only through QB dispatch artifacts.

## Required format
1. Project
2. Destination
3. Prompt
4. Acceptance
5. Return

## Required receiver actions
- Update `QB/status.json` with outcome or blocker.
- Add or update `QB/DECISION_LOG.md` when decisions are made.

## Escalation
Escalate to Coach before execution if request changes:
- scope
- data/API contracts
- architecture direction
