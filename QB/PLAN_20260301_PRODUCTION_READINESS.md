---
type: document
from: communityboard-qb
date: 2026-03-10
status: active
topics: [qb, governance, documentation]
fractals: [communityboard]
cluster: qb-docs
---

# CommunityBoard Production Readiness Plan (2026-03-01)

## Summary
This plan resolves current blockers in strict order and defines hard go/no-go criteria for release.

## Owner Model
- Chief of Staff: Accountable for sequence and final go/no-go decision.
- PM (00 thread): Responsible for execution tracking, dispatch, and evidence collection.
- Codex CLI threads: Responsible for implementation tasks by workstream.

## Blockers (exactly 5)
1. Vocabulary drift (`Seen at` vs `Found at`, `Pin to board/Pinned` vs `Publish/Published`).
2. Seen-at schema mismatch in some environments.
3. Poster IA inconsistency on `/poster/[id]`.
4. Incomplete CTA canonical mappings for major builder actions.
5. Dual-model fallback drift risk (`poster_items` and legacy `events/poster_event_links`).

## Strict Execution Phases

### Phase 0 — Control setup
- Create and maintain `docs/product-dev/production-readiness-tracker.md`.
- Assign owner + due date + evidence link for each blocker.

### Phase 1 — Schema parity (P0)
- Ensure `poster_uploads.seen_at_name` exists in DEV and PROD.
- Verify `/api/health/schema` returns `ok: true` in both.
- Capture responses and timestamps in tracker.

### Phase 2 — Vocabulary lock (P0)
- Standardize user-facing terms on core routes:
  - `Seen at`
  - `Pin to board`
  - `Pinned`
- Preserve backend status codes unless migration is explicitly approved.

### Phase 3 — Poster IA cleanup (P1)
- Single `Poster Items` IA container.
- No reorder-on-select behavior.
- Item <-> pin selection parity.

### Phase 4 — CTA contract completion (P1)
- Canon-map builder CTAs:
  - Upload and select
  - Next untended poster
  - Add item
  - Mark Done
  - Delete poster
  - Pin to board

### Phase 5 — Model path stabilization (P2)
- Define canonical runtime path as `poster_items`.
- Constrain legacy fallback usage and publish deprecation milestones.

## Required Evidence for Chief Review
- Schema check evidence (DEV + PROD `/api/health/schema` outputs).
- Build + test outputs for touched phases.
- Screenshot evidence for vocabulary lock and poster IA behavior.
- Updated canonical CTA mapping artifact references.
- Risk note for dual-model fallback timeline.

## Go/No-Go Criteria

### GO (all required)
- Phases 1–4 pass acceptance.
- No blocking issues open in the active gap audit.
- Build/tests/schema checks are green.

### NO-GO (any one is enough)
- Schema mismatch persists in DEV or PROD.
- Vocabulary drift remains on core routes.
- Poster IA parity checks fail.
- CTA mapping blockers remain open.

## Assumptions
1. `QB` is canonical communication channel to Chief for this repo.
2. Current operational truth includes unresolved blockers.
3. Queue IDs `wq_401..wq_405` are reserved for this plan.
4. This plan does not include runtime implementation in app/lib/supabase.
