---
type: document
from: communityboard-qb
date: 2026-03-10
status: active
topics: [qb, governance, documentation]
fractals: [communityboard]
cluster: qb-docs
---

# Artifact Placement Review (2026-03-01)

## Purpose
Verify whether current project artifacts are in the right system location and define placement rules going forward.

## Executive Read
- Most governance, queueing, risk, and decision records are correctly located in `QB/`.
- Canon/model artifacts are correctly located under `uxos_foundation/` and strategy docs under `docs/product-dev/strategy/`.
- One process gap remains: explicit ownership lanes for research deliverables (example: Matt-owned research tasks) are not codified in a dedicated ownership matrix.
- Phase 2 (design iteration feeding assumptions/hypotheses back into canon/queue) is not yet formalized; a stub is now required.

## Placement Matrix (Current)
| Artifact type | Current location | Status | Rule |
|---|---|---|---|
| Operating status, blockers, next actions | `QB/status.json` | Correct | `QB/status.json` is canonical runtime governance state |
| Decisions and rationale | `QB/DECISION_LOG.md` | Correct | Every scope/priority/policy decision logs here |
| Work queue and acceptance | `QB/WORK_QUEUE.md` | Correct | Every non-autonomous task must exist before execution |
| Hypotheses (human-readable) | `QB/HYPOTHESIS_REGISTER.md` | Correct | Keep narrative/problem/opportunity/hypothesis here |
| Hypothesis mapping (machine-readable) | `QB/HYPOTHESIS_MAPPING_DB.v1.json` | Correct | Canonical IDs only; connects JTBD/OOUX/pages |
| Release gates | `QB/RELEASE_GATE_CHECKLIST.md` | Correct | Must carry evidence links and go/no-go authority |
| Dispatch handoffs | `QB/dispatch/*` | Correct | All cross-thread handoff prompts live here |
| Canon object/job/page mappings | `uxos_foundation/09_Operationalization/*` | Correct | Source IDs for cross-system mapping |
| Strategy canon narratives | `docs/product-dev/strategy/*` | Correct | Human-readable product canon and alignment plans |
| Technical debt audits | `docs/tech-debt-*.md` | Correct | Engineering debt only, not queue governance |
| Research ownership mapping | Not explicit | Gap | Add owner-lane mapping in QB (see actions) |

## Recommended Placement Rules (Lock)
1. Risks, blockers, and release readiness signals live only in `QB/`.
2. Research hypotheses and experiment decisions originate in `QB/`.
3. Canonical IDs and cross-object maps remain in `uxos_foundation/`.
4. Product narrative/copy canon remains in `docs/product-dev/strategy/`.
5. Runtime implementation notes/tests stay in `docs/` or code comments, not QB.

## Ownership Lane Gap (Including "Matt to research")
Current gap: Research-specific ownership lanes are implicit and not machine-tracked.

Recommendation:
- Continue using `QB/WORK_QUEUE.md` as task source of truth.
- Add owner convention in notes/title for research owners (example: `owner: Matt (Research)` when assigned).
- Add Phase 2 loop stub to formalize when research artifacts are required before implementation dispatch.

## Immediate Actions
1. Add Phase 2 loop stub doc in QB.
2. Add queue item to operationalize owner-lane conventions for research work.
3. Keep this review linked in future Chief updates when placement disputes occur.
