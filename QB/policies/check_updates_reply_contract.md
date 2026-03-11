---
type: qb-policy
from: communityboard-qb
date: 2026-03-10
status: active
topics: [policy, qb, governance]
fractals: [communityboard]
cluster: qb-policies
---

# Check Updates Reply Contract

Status: canonical
Owner: QB

## Trigger
When user asks any equivalent of:
- "check for updates"
- "check updates"
- "get updates"

QB must run:
- `./QB/qb sync` (or `./QB/qb check-updates`)

## Required Behavior
1. Refresh operating baseline first (`./QB/qb refresh-wow` via sync flow), but only if local baseline version is behind canonical.
2. Read WoW policies first (precheck is mandatory).
3. Collect update state from repo + status artifacts.
4. Process updates automatically (`check` + `report` via sync flow).
5. Reply in human language, not file-first.

## Operating Components Included In Baseline Refresh
- QB command router and update scripts
- Core QB operating README and thread intro standard
- Canon operating policies (handoffs, update style, check-updates contract, instrumentation, reconciliation, compaction)
- Dispatch template contract
- Baseline metadata contracts (`QB/WOW_BASELINE.json`, `QB/WOW_BASELINE_STATE.json`)

## Required Reply Structure
1. What We Learned
2. What Changed
3. What Matters Next
4. Evidence/Logistics (optional; only if asked or necessary)

## Disallowed Reply Pattern
- Leading with file lists, command logs, or path dumps.
- Returning only operational/logistical notes without learned insight.

## Dispatch Usage
- Routine WoW propagation should happen through baseline refresh during `check-updates`, not broadcast dispatches.
- Use Coach dispatch fan-out only for exceptional or one-time migration directives.
