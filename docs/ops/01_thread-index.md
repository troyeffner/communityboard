---
type: thread-index
from: communityboard-ops
date: 2026-03-10
status: active
topics: [operations, threading, handoff]
fractals: [communityboard]
cluster: ops-routing
---

# Thread Index

| Thread | Scope | Canon links (docs/strategy/*) | Primary scripts |
| --- | --- | --- | --- |
| Thread 02 | Marketing MVP tracking + smoke/publish scripts | `docs/strategy/README.md` | `scripts/marketing-smoke.sh`, `scripts/marketing-smoke-events.sh`, `scripts/publish-verify.sh`, `scripts/publish-now.sh`, `scripts/publish-push.sh` |
| Thread 07 | Strategy Canon freeze (jobs, desired outcomes, metaphor stack) - Locked | `docs/strategy/02_jobs.md`, `docs/strategy/03_desired_outcomes.md`, `docs/strategy/04_metaphor_stack.md` | `N/A (canon governance thread)` |
| Thread 03/04 | Create + Poster UI redesign pass (Trello-like / card balance) | `docs/strategy/terminology-canon.v1.md`, `docs/strategy/metaphor-stack.v1.md` | `scripts/wire-poster-view-trello-layout.sh`, `scripts/apply-trello-poster-css.sh`, `scripts/diag-poster-view.sh` |
| Thread 08 | Infra/tooling (Next/Turbopack root, EPERM mitigation, scripts) | `docs/strategy/05_governance_principles.md` | `scripts/fix-next-config-root.sh`, `scripts/dev-start.sh`, `scripts/dev-status.sh` |

## Standard Handoff Template (Required)

Use this format for every dispatch from `00_Original Chat`:

```md
Project:
<short project/workstream name>

Destination:
<thread name/id or "Codex CLI">

Prompt:
<execution-ready instructions with explicit scope, constraints, and files>

Acceptance:
- <clear measurable check 1>
- <clear measurable check 2>
- <build/test/schema checks required>

Return format:
- Summary:
- Files changed:
- Commands run:
- Risks/Blockers:
- Next step:
```

## Dispatch Rules
- Always include scope boundaries (`in-scope` / `out-of-scope`).
- Require absolute file paths when referencing specific files.
- Require explicit validation commands where relevant (`npm run build`, tests, schema checks).
- Require blocker escalation with proposed options (not just problem statements).
- Require output to map back to canonical terminology and governance constraints.
