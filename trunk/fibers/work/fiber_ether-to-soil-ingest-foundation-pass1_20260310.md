---
type: fiber
date: 2026-03-10
status: active
fiber_kind: work
topics: [ether, soil, ingest, timeline, events, normalization]
---

# Fiber — Ether to Soil Ingest Foundation (Pass 1)

## Added

1. source registry for timeline ingestion
2. seed local timeline source packet
3. event soil schema v1
4. ingest script (local + optional remote JSON modes)
5. npm command: `trunk:ether:ingest`

## Rule

Remote ingestion remains disabled by default until compliance/rate-limit approval.
Enable only with:

`CB_ALLOW_REMOTE_ETHER_INGEST=1`

