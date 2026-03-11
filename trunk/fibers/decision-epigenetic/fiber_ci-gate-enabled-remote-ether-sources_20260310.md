---
type: fiber
date: 2026-03-10
status: active
fiber_kind: decision-epigenetic
topics: [ci, ether, compliance, gating, remote-sources]
---

# Fiber — CI Gate on Enabled Remote Ether Sources

Enabled remote ether sources (`mode=http_json` + `enabled=true`) now require a clean compliance lint result in CI.

Decision:
- CI runs `npm run trunk:ether:lint-sources` before test/build.
- If any enabled remote source lacks required compliance metadata, CI fails.
- Disabled remote sources can carry warning-only metadata debt until activated.
