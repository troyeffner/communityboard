---
type: qb-policy
from: communityboard-qb
date: 2026-03-10
status: active
topics: [policy, qb, governance]
fractals: [communityboard]
cluster: qb-policies
---

# Coach Protocol Update: Local Domain + Offline Continuity

Status: canonical
Owner: Coach
Updated: 2026-03-02T03:49:32Z

## Required Protocols
1. Local domain routing is mandatory via `QB/LOCAL_DOMAIN.json`.
2. Web capture targets must use local-domain URLs from `base_url`.
3. `./QB/qb check` must pass local-domain validation before execution.
4. `./QB/qb report` must include local-domain section.
5. During token-constrained windows, follow offline continuity pack execution model.

## Enforcement
- Blocking checks are active in `QB/scripts/qb_check.sh`.
- Drift is corrected via UXOS sync command: `npm run qb:local-domains:sync`.

## PM Behavior
- Treat this as active operating policy now.
- No manual Coach confirmation required for adoption.
