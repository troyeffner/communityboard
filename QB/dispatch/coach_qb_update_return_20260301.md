Project
COMMUNITYBOARD

Destination
Coach

Disposition
Needs Coach decision

## 1) Status
- health: `yellow`
- mode: `plan`
- updated_at: `2026-03-01T19:05:00Z`

Top 3 goals with progress:
1. `g1` Define and validate 0->1 concept — `in_progress` (0.2)
2. `g2` Instrument concept testing loop — `planned` (0.0)
3. Production-readiness sequencing under active blocker management (tracked via queue `wq_401..`).

## 2) Blockers (blocking/high only)
- `b2` Seen-at schema mismatch in some environments
  - owner: Troy
  - ETA: 2026-03-02
  - next mitigation: close `wq_401`, verify `/api/health/schema` in DEV+PROD
- `b1` Vocabulary drift in runtime UI
  - owner: Troy
  - ETA: 2026-03-03
  - next mitigation: close `wq_402` vocabulary lock pass
- `b3` Poster IA inconsistencies on `/poster/[id]`
  - owner: Troy
  - ETA: 2026-03-04
  - next mitigation: close `wq_403` IA parity fixes
- `b4` Primary CTA canonical mappings incomplete
  - owner: Troy
  - ETA: 2026-03-05
  - next mitigation: close `wq_404` mapping pass
- `b6` Pin selection reorders cards instead of selecting in place
  - owner: Troy
  - ETA: 2026-03-04
  - next mitigation: close `wq_406` (preserve order + auto-scroll selected)
- `b9` Upvote design/process not fully activated and verified in production flow
  - owner: Troy
  - ETA: 2026-03-02
  - next mitigation: close `wq_409` with production smoke evidence
- `b15` Potential perceived partisan suppression risk
  - owner: Troy
  - ETA: 2026-03-05
  - next mitigation: close `wq_415` policy/measurement plan

## 3) Execution
What changed since last report:
- Added known-vs-unknown venue track:
  - hypothesis `h_20260301_known_unknown_venue_model`
  - queue `wq_426`
  - blocker `b16`
- Added place-taxonomy unification track:
  - queue `wq_427`
  - blocker `b17`
- Ingested Coach FFA layered policy and aligned local instance metadata.

Top 3 next actions for next cycle:
1. `wq_401` schema parity (`seen_at_name`) in DEV/PROD
2. `wq_409` upvote activation + verification
3. `wq_402` vocabulary lock across core routes

## 4) Governance
- `./QB/qb check`: PASS
- report/status alignment: aligned; `QB/report_20260301.md` regenerated

## 5) Risk to Coach
- Escalation: sequencing decision needed on priority conflict between `wq_409` (upvote activation) and `wq_401` (schema parity) as simultaneous P0s.
- Requested decision: confirm strict ordering (`wq_401` first) or allow parallel execution with temporary release freeze.
