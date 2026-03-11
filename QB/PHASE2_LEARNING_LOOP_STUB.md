---
type: document
from: communityboard-qb
date: 2026-03-10
status: active
topics: [qb, governance, documentation]
fractals: [communityboard]
cluster: qb-docs
---

# Phase 2 Learning Loop Stub (Design -> Assumptions -> Canon -> Dispatch)

## Purpose
Define the next operating phase without implementing it yet.
Phase 2 ensures that page/design changes feed back into assumptions, hypotheses, OOUX mappings, and queue decisions.

## Scope
- In scope: governance loop only (tracking + decisions + dispatch criteria)
- Out of scope: runtime code changes, schema migrations, feature redesign

## Trigger Events
Start a Phase 2 loop cycle when any of these occur:
1. Material IA/layout change on `/browse`, `/poster/[id]`, `/builder/create`, `/builder/tend`
2. Vocabulary change affecting user-facing labels
3. Discovery ranking or filter behavior change
4. New disagreement/fairness concern discovered from user feedback
5. Evidence mismatch between intended and observed user behavior

## Phase 2 Cycle (Stub)
1. Capture change signal
- Log change in `QB/DECISION_LOG.md` and attach route/surface scope.

2. Assumption/Hypothesis refresh
- Update `QB/HYPOTHESIS_REGISTER.md` entry (or add new one).
- Update `QB/HYPOTHESIS_MAPPING_DB.v1.json` mapping to JTBD/OOUX/pages.

3. Canon impact check
- Validate terminology and metaphor alignment against strategy docs.
- If canon change needed, prepare separate canon update artifact.

4. Dispatch gating
- Add/refresh queue items in `QB/WORK_QUEUE.md`.
- Ensure acceptance + evidence are explicit before implementation prompt is dispatched.

5. Evidence + decision
- Require eval evidence (screenshots/diffs/metrics where relevant).
- Log go/no-go in `QB/DECISION_LOG.md` and sync `QB/status.json`.

## Required Artifacts Per Loop
1. Decision entry (`QB/DECISION_LOG.md`)
2. Hypothesis row update (`QB/HYPOTHESIS_REGISTER.md`)
3. Mapping update (`QB/HYPOTHESIS_MAPPING_DB.v1.json`)
4. Queue item(s) with acceptance (`QB/WORK_QUEUE.md`)
5. Status sync (`QB/status.json`)

## Roles
- PM: loop owner, dispatch author, acceptance arbiter
- Chief: sequencing/governance authority
- Research owner (example: Matt): evidence design and interpretation for research-labeled queue items
- Execution thread (Codex CLI): implementation constrained to approved queue scope

## Exit Criteria For Each Loop
1. Assumption/hypothesis state updated and mapped
2. Queue + status synchronized
3. Canon drift checked
4. Evidence reviewed
5. Decision logged

## Initial Backlog Hook
Create a queue item to operationalize this stub as a lightweight checklist before all major UI dispatches.
