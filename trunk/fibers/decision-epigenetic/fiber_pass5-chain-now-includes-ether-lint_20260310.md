---
type: fiber
date: 2026-03-10
status: active
fiber_kind: decision-epigenetic
topics: [pass5, ether, lint, sequencing, governance]
---

# Fiber — Pass5 Chain Includes Ether Lint

`trunk:pass5` now runs `trunk:ether:lint-sources` before `trunk:route-parity`.

Reason:
- route parity summary references latest ether lint output.
- adding lint to the same chain ensures route snapshot context is from the same run window, not stale outputs.
