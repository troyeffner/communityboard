---
type: fiber
date: 2026-03-10
status: active
fiber_kind: decision-epigenetic
topics: [overnight, cadence, tag-stabilization, policy, pass5]
---

# Fiber — Overnight Cadence + Tag Stabilization Policy

Pass 5 introduces an explicit overnight policy file:

- `trunk/config/overnight_policy.json`

Current lock:

- cadence: hourly
- stable tag minimum count: 2
- registry max tags: 500
- refresh mode: hybrid (route-write markers + scheduled runs)

