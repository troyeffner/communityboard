---
type: document
from: communityboard-docs
date: 2026-03-10
status: active
topics: [documentation, product, operations]
fractals: [communityboard]
cluster: docs
---

# Contribution -> AnchoredItem Canon Lock (v0.1)

## Current State Summary
We are locking a durable conceptual model across:
- OOUX object model
- Strategy canon (Jobs, Desired Outcomes, Metaphors, Governance)
- Runtime vocabulary
- Guardrails/tests
- Eval pipeline

This is not a UI refactor pass.
This is a conceptual + governance lock pass.

## Core Canon Decisions (v0.1 Lock)

### 1) Builder-first-class object: Contribution
A Contribution:
- Is always a photo.
- Has:
  - `found_at` (where the photo was taken)
  - `contributed_at`
  - `contributed_by` (future)
  - `contribution_type` (poster, street art, community board, etc.)

Contribution lives primarily in the Builder/Admin surface.

### 2) Public-first-class object: AnchoredItem
An AnchoredItem:
- Is what appears on public surfaces.
- Is tightly coupled to:
  - A Contribution
  - >= 1 Pin (`x,y` geometry)
  - Item metadata (title, time, etc.)
- MUST NOT appear publicly without a pin.

There is no unpinned public state.

Pin = required geometry.
Upvote = interest signal.

These are separate.

### 3) Provenance Language Lock
Use:
- `first contributed`
- `first contributed by`

Do not use:
- `first seen`

This is a durable vocabulary rule.

### 4) Reappearance / Trace Model
AnchoredItem:
- Has a primary `first contributed` Contribution.
- Does NOT migrate.

If the same thing is captured again:
- Attach new Contribution as a Trace / Reappearance.
- Do not move the original.
- Preserve provenance.

Later:
- Duplicate consolidation may convert one AnchoredItem into a Trace of another.

### 5) Governance Non-Negotiables
- Pin mandatory geometry.
- Upvote = signal, not placement.
- Public = AnchoredItems only.
- Builder = Contributions.
- Found at = photo location.
- Event at = venue (may differ).
- First contributed vocabulary enforced.
- Trace model exists.
- AnchoredItem does not move.

## Required Strategy Files Updated
- `docs/product-dev/strategy/02_jobs.md`
- `docs/product-dev/strategy/03_desired_outcomes.md`
- `docs/product-dev/strategy/04_metaphor_stack.md`
- `docs/product-dev/strategy/05_governance_principles.md`
- `lib/strategy/jobs.json`
- `lib/strategy/desired_outcomes.json`
- `lib/strategy/metaphors.json`

All synchronized and JSON-validated.

## Guardrails Added
Regression test:
- `tests/regression/canon-language-guard.test.mjs`

Fails if:
- `first seen` appears in `app/`
- `unpinned` appears in `app/`
- Language implying pin optionality appears

This protects conceptual drift.

## Eval Pipeline Requirements
`eval:ui` must:
1. Capture fresh screenshots
2. Diff vs previous
3. Write `diff-summary.json`
4. Overwrite `docs/product-dev/ui-eval-gap-report.md`
5. Include current HEAD in report header

Mandatory before publish.
