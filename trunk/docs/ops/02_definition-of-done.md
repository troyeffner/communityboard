---
type: definition-of-done
from: communityboard-ops
date: 2026-03-10
status: active
topics: [quality-gates, release-readiness, ci]
fractals: [communityboard]
cluster: ops-quality
---

# Definition of Done

"Ship" means all of the following are true:

- Working tree is `git clean` or all intended changes are explicitly staged.
- Lint passes (`warnings acceptable`).
- Unit tests pass.
- Playwright passes, or snapshots are explicitly updated as part of the change.
- Build passes.
- Runtime smoke endpoints return HTTP `200`.
- Commit message uses an area prefix: `MKT`, `STRAT`, `UI`, or `INFRA`.
- Push is completed.
