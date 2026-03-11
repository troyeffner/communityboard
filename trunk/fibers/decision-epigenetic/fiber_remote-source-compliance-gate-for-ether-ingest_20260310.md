---
type: fiber
date: 2026-03-10
status: active
fiber_kind: decision-epigenetic
topics: [ether, ingest, compliance, remote-sources, gating]
---

# Fiber — Remote Source Compliance Gate for Ether Ingest

Remote timeline ingestion now requires an explicit compliance gate before any `http_json` source can run:

- `CB_ALLOW_REMOTE_ETHER_INGEST=1` must be set.
- source compliance metadata must be present and approved.
- required fields include:
  - `compliance.review_status=approved`
  - `compliance.use_allowed=true`
  - `compliance.data_class`
  - `compliance.terms_url`
  - `compliance.evidence_ref`
  - declared non-`unknown` license
  - positive `rate_limit_per_minute`

If missing, ingest skips the source and records `remote-compliance-gate` with concrete issues in the summary output.
