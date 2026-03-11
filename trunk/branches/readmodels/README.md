---
type: document
from: communityboard-trunk
date: 2026-03-10
status: active
topics: [trunk, readmodels, documentation]
fractals: [communityboard]
cluster: trunk-docs
---

# Trunk Read Models

This directory contains generated projection files consumed by trunk-first reads.

Current pass focus:

- interaction vote projections from signal fibers
- parity comparison support against legacy relational tables
- deploy lifecycle projection from deploy work fibers

Generation commands:

- `npm run trunk:readmodels`
- `npm run trunk:parity`
- `npm run trunk:content-readmodels`
- `npm run trunk:content-parity`
- `npm run trunk:deploy:readmodels`
- `npm run trunk:pass5`
