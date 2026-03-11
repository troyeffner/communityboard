---
type: fiber
date: 2026-03-10
status: active
fiber_kind: work
topics: [cutover, pass2, trunk, ether, dual-write, signal-fibers]
---

# Fiber — Cutover Pass 2: Filesystem + Signal Dual-Write

## Completed in this pass

1. Added `communityboard/trunk/` and `communityboard/ether/` scaffold.
2. Added pointer files in legacy paths (`QB/INBOX`, `QB/OUTBOX`, `external_evidence_atoms`).
3. Implemented signal fiber shadow-write from voting routes.
4. Added overnight growth job scaffold + npm command.

## Guardrail

Signal fiber emission is best-effort during transition and does not fail the primary request path.

