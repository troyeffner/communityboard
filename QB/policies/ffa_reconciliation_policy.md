---
type: qb-policy
from: communityboard-qb
date: 2026-03-10
status: active
topics: [policy, qb, governance]
fractals: [communityboard]
cluster: qb-policies
---

# FFA Reconciliation Policy

Status: canonical
Owner: QB

## Intent
After any meaningful canonical change in FFA, run a reconciliation pass before new feature execution.

## Trigger Events
- Stable updates to jobs, actors, objects, pages, outcomes, capabilities
- Major assumption/hypothesis changes
- New evidence that changes confidence/risk
- Canon lock/unlock transitions

## Required Command
- `./QB/qb ffa-reconcile --scope full`
- Optional scoped pass: `./QB/qb ffa-reconcile --scope <module>`
- Use `--strict` when release gating needs blocking enforcement
- Use `--backfill-notes` if queue rows need FFA marker backfill

## Required Flow
1. Sync FFA-plan alignment (`ffa-plan-sync`) through `ffa-reconcile`.
2. Reconcile links and references across FFA modules for selected scope.
3. Detect and record drift/gaps in a dated reconciliation artifact.
4. Update plan/queue bindings where needed.
5. Re-run `./QB/qb check` and `./QB/qb report`.
6. Record decision log summary for major reconciliations.

## Required Outputs
- `QB/dispatch/ffa_reconcile_YYYYMMDD.md`
- Updated `QB/PLAN_ALIGNMENT_STATE.json` with reconcile metadata
- Updated queue markers (`ffa_ref` or `no_ffa_impact_reason`) if needed

## Acceptance
- No unresolved blocking reconciliation issues (or explicit approved waiver)
- Active queue rows remain FFA-aligned
- `./QB/qb check` passes
- Latest report reflects current alignment state
