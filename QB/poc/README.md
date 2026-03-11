---
type: document
from: communityboard-qb
date: 2026-03-10
status: active
topics: [qb, governance, documentation]
fractals: [communityboard]
cluster: qb-docs
---

# QB PoC: Framework + Persona Model Switching

This PoC is a governance/query sandbox (not app runtime data source).

## Build / Rebuild
```bash
sqlite3 /Users/troyeffner/Dropbox/DEV/communityboard/QB/poc/communityboard_poc.db < /Users/troyeffner/Dropbox/DEV/communityboard/QB/poc/schema.sql
sqlite3 /Users/troyeffner/Dropbox/DEV/communityboard/QB/poc/communityboard_poc.db < /Users/troyeffner/Dropbox/DEV/communityboard/QB/poc/seed.sql
```

## Run pressure-test queries
```bash
sqlite3 /Users/troyeffner/Dropbox/DEV/communityboard/QB/poc/communityboard_poc.db < /Users/troyeffner/Dropbox/DEV/communityboard/QB/poc/proof_queries.sql
```

## Outputs
- Machine output: `proof_results.txt`
- Human summary: `/Users/troyeffner/Dropbox/DEV/communityboard/QB/POC_MODEL_PRESSURE_TEST_20260301.md`
