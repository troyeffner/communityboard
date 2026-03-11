---
type: document
from: communityboard-qb
date: 2026-03-10
status: active
topics: [qb, governance, documentation]
fractals: [communityboard]
cluster: qb-docs
---

# QB Release Gate Checklist

Status: working

## Required pre-release checks
- [ ] `npm run build` passed (evidence: command output link)
- [ ] Regression checklist completed for touched flows (evidence: checklist link)
- [ ] Schema health check passed in DEV and PROD (`/api/health/schema` = `ok:true`) (evidence: URLs + responses)
- [ ] Dispatch acceptance criteria passed (evidence: dispatch return artifacts)
- [ ] Rollback owner assigned
- [ ] Rollback command path verified
- [ ] Go/No-Go authority named:
  - Name:
  - Role:
  - Decision timestamp:
