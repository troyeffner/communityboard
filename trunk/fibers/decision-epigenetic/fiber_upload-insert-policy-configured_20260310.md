---
type: fiber
date: 2026-03-10
status: active
fiber_kind: decision-epigenetic
topics: [upload, policy, fallback-ladder, config]
---

# Fiber — Upload Insert Policy Configured

Upload insert fallback behavior moved to trunk policy/config:

- `trunk/config/upload_insert_policy.json`
- `lib/trunk/uploadPolicy.ts`

Routes now use policy-driven candidates and retry rules rather than route-local hardcoded ladders.

