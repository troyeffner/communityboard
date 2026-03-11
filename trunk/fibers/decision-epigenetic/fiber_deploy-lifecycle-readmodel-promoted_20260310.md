---
type: fiber
date: 2026-03-10
status: active
fiber_kind: decision-epigenetic
topics: [deploy, readmodel, overnight, ci, trunk]
---

# Fiber — Deploy Lifecycle Promoted to Readmodel Input

Deploy work fibers are now treated as structured readmodel input.

Decision:
- Generate `trunk/branches/readmodels/deploy_lifecycle.json` from `trunk/fibers/work/deploy_events.jsonl`.
- Include deploy readmodel generation in trunk pass pipeline (`trunk:pass5`).
- Keep deploy event lineage visible in overnight outputs for trend analysis and routing.
