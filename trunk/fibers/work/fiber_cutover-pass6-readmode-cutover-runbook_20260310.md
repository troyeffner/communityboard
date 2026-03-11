---
type: fiber
date: 2026-03-10
status: active
fiber_kind: work
topics: [cutover, runbook, readmode, rollback, canary]
---

# Fiber — Cutover Pass 6: Readmode Cutover Runbook

Added operational runbook:
- `docs/ops/04_trunk-readmode-cutover-runbook.md`

Scope:
- preconditions
- canary sequence
- promotion criteria
- fast rollback procedure
- post-cutover checklist

Effect:
- runtime switch to `CB_READ_FROM_TRUNK=1` now has explicit step-by-step execution guidance.
