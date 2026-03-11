---
type: qb-policy
from: communityboard-qb
date: 2026-03-10
status: active
topics: [policy, qb, governance]
fractals: [communityboard]
cluster: qb-policies
---

# QB Hybrid Update Policy

## Source of Truth
- `QB/status.json` is the canonical project state.
- `QB/DECISION_LOG.md` is the canonical decision record.
- Git history is advisory context, not the source of PM truth.

## Required Update Cadence
1. Event-based updates (required)
- Update `QB/status.json` whenever one of these occurs:
  - goal status change
  - blocker appears or is resolved
  - major decision is made
  - scope changes
  - milestone hit or missed

2. Daily heartbeat (required)
- Generate an end-of-day report in `QB/report_YYYYMMDD.md`.
- Keep it short and factual.
- Lead with human-language insight, not artifact logistics.

3. Prompt-driven deep updates (as needed)
- Use explicit planning prompts for pivots, resets, and milestone replans.

## Dispatch QA Requirement
Every dispatch prompt must include:
- scope (in-scope / out-of-scope)
- acceptance criteria
- return format
- constraints
- validation commands

## Human-Language Update Requirement
When QB reports progress back to you:
1. Start with what was learned (plain language).
2. Then state what changed and why it matters.
3. Then state the next decision/action.
4. Put files/commands/logistics last (or omit unless requested).

Required top structure:
- `What We Learned`
- `What Changed`
- `What Matters Next`

## QB-to-QB Requirement
- QB-to-QB requests are valid only as QB dispatch artifacts.
- Receiver must update `QB/status.json` and `QB/DECISION_LOG.md`.
- Escalate to Coach before execution if scope/contracts/architecture are impacted.

## Changelog Sync Rule
- Use `./QB/qb sync` to collect recent git changes into a sync note.
- `./QB/qb sync` must refresh canonical operating baseline first (not dispatch-dependent).
- `./QB/qb sync` must run WoW precheck first, then process updates automatically.
- Output must include a human-language summary artifact (`What We Learned / What Changed / What Matters Next`).
- Sync notes can propose status edits, but they do not auto-overwrite `QB/status.json`.
- For user requests to check updates, this rule is mandatory and immediate (no alternate reply style).

## Enforcement
- `./QB/qb check` must pass before major handoffs.
