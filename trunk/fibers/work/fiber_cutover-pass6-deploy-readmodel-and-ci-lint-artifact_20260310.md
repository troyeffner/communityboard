---
type: fiber
date: 2026-03-10
status: active
fiber_kind: work
topics: [cutover, pass6, deploy-readmodel, ci, lint-artifact, trunk]
---

# Fiber — Cutover Pass 6: Deploy Readmodel + CI Lint Artifact

## Completed

1. Added deploy readmodel generator:
   - `trunk/overnight/jobs/generate-deploy-readmodels-pass1.mjs`
   - output: `trunk/branches/readmodels/deploy_lifecycle.json`
2. Added npm command and pass-chain integration:
   - `trunk:deploy:readmodels`
   - included in `trunk:pass5`
3. CI now uploads ether-source lint report artifact:
   - `trunk/overnight/outputs/ether_sources_lint_*.json`
4. Lint warnings now print explicit report-path reminder in logs.

## Effect

Deploy activity now lands in a stable readmodel path for overnight consumption, and CI warning visibility for ether source compliance debt is explicit and downloadable.
