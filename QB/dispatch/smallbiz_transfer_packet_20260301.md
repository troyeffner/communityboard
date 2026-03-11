# SmallBiz Transfer Packet (Current Cycle)

Project
SMALLBIZ intake from CommunityBoard pilot

Date
2026-03-01

Source
/Users/troyeffner/Dropbox/DEV/communityboard

## 1) Transfer Note

### Module candidate summary
- Candidate: board-style browse/poster workflow primitives
  - Poster workspace components (`PosterStage`, `PosterMetaStrip`, `PosterItemsList`, `ItemCard`)
  - Public poster detail + inspector rail pattern
  - Filter/pill and upvote interaction direction (in progress)
- Candidate: governance/QB operating package for planning and release gates
  - `QB/status.json`, `QB/WORK_QUEUE.md`, `QB/DECISION_LOG.md`, release checklist patterns

### What can move now
- Governance artifact model and dispatch structure can move now (low coupling).
- UI primitives can move as reference patterns only (not production-hardened modules yet).

### What needs hardening first
- Schema parity for `seen_at_name` across DEV/PROD (`wq_401`).
- Runtime vocabulary lock and IA consistency (`wq_402`, `wq_403`).
- Upvote flow verification in production (`wq_409`).

### Known risks and guardrails
- Risk: runtime drift due to dual model paths and vocabulary inconsistency.
- Guardrail: no production promotion until schema health + P0 queue closure.

## 2) Evidence Package

- Hypothesis IDs:
  - `h_20260301_viewpoint_fairness_filter_signal`
  - `h_20260301_known_unknown_venue_model`
- Experiment IDs:
  - Not yet executed; design queued under `wq_416` (fairness) and `wq_426` (known/unknown venue model).
- Measured outcomes:
  - Governance/data-model PoC passed (`QB/POC_MODEL_PRESSURE_TEST_20260301.md`).
  - No runtime experiment outcomes available yet for SmallBiz intake decision.

### Recommendation
- Recommendation: **DEFER** productization promotion for runtime modules this cycle.
- Reason: required runtime evidence and schema parity gates are not yet satisfied.

## 3) Contract Minimum Verification

Reference contract:
- `/Users/troyeffner/Dropbox/DEV/UXOS/08_Data_Model_and_API_Contracts/communityboard_smallbiz_pilot_contract.md`

### Event schema mapping status
- `event_name`: partial (naming exists in UI/event payloads, contract-level standardization pending)
- `surface_id`: not yet verified as canonical in telemetry payload
- `copy_atom_id`: not yet verified as canonical in telemetry payload
- `primary_job_id`: present in governance mappings, not yet confirmed in runtime telemetry
- `object_ids[]`: present in governance mappings, runtime payload verification pending
- `action_ids[]`: present in governance mappings, runtime payload verification pending
- `session_id`: telemetry presence not yet contract-verified
- `timestamp`: present broadly, contract-specific telemetry verification pending

### CTA alignment status
- Status: partial
- Notes: CTA canonical mapping remains open (`wq_404`); alignment evidence incomplete.

### Open blocking drift issues
- `b1` vocabulary drift
- `b2` seen-at schema mismatch
- `b3` poster IA inconsistency
- `b4` incomplete CTA mapping
- `b5` dual-model fallback drift

## Blockers / Owner / ETA / Mitigation

1. Schema parity (`b2`, `wq_401`)
- Owner: Troy
- ETA: 2026-03-02
- Mitigation: enforce `/api/health/schema` pass in DEV + PROD before promotion.

2. CTA contract mapping (`b4`, `wq_404`)
- Owner: Troy
- ETA: 2026-03-05
- Mitigation: complete canonical CTA map and attach evidence to release gate.

3. Runtime experiment evidence gap (`wq_416`)
- Owner: Troy
- ETA: 2026-03-10
- Mitigation: run fairness experiment design + evidence package before promotion decision.
