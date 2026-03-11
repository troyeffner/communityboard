---
type: cutover-runbook
from: communityboard-ops
date: 2026-03-10
status: active
topics: [cutover, runtime, readmode, rollback]
fractals: [communityboard]
cluster: ops-runbook
---

# Trunk Read-Mode Cutover Runbook

## Purpose

Safely move runtime reads from legacy mode to trunk-overlay mode with fast rollback.

Current default behavior:
- `read_mode = legacy`

Cutover toggle:
- set `CB_READ_FROM_TRUNK=1`

## Preconditions

1. Latest `npm run trunk:pass5` is green.
2. Latest route parity summary exists and is reviewed.
3. Latest frontmatter coverage report is 100% (policy-scoped).
4. Latest ether source lint has `errors_count=0`.
5. On-call owner is assigned for rollout window.

## Canary steps

1. Baseline snapshot:
   - run: `npm run trunk:pass5`
   - store output file names in deployment note.
2. Enable canary env:
   - set `CB_READ_FROM_TRUNK=1` in canary environment only.
3. Run route smoke checks:
   - `/api/public/browse`
   - `/api/public/events-grouped`
   - `/api/events`
4. Compare route payload shape and record counts against baseline.
5. Run manual surface smoke:
   - `/browse`
   - `/poster/[id]`
   - `/submit`
6. Keep canary live through one pass5 cycle; review new summary outputs.

## Promote to wider rollout

Promote only if all are true:

1. No route-level correctness regressions observed.
2. No new parity drift beyond accepted legacy-table warnings.
3. No severity-1 runtime errors in logs.
4. Deploy and lint artifacts are present for the rollout run.

## Rollback plan (fast)

1. Set `CB_READ_FROM_TRUNK=0` (or unset) in target environment.
2. Redeploy/restart runtime.
3. Re-run route smoke checks on legacy mode.
4. Emit deploy rollback fiber:
   - `npm run trunk:deploy:rollback -- --stage cutover --status rollback --provider <provider> --ref <ref> --note "trunk readmode rollback"`
5. File incident/learning return to TRUNK.

## Post-cutover checklist

1. Archive rollout evidence paths in TRUNK return.
2. Confirm next pass5 remains green after promotion.
3. Schedule follow-up to retire legacy mode gate once stable.
