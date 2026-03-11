---
type: fiber
date: 2026-03-10
status: active
fiber_kind: work
topics: [cutover, pass6, frontmatter-backfill, qb, docs, ether, ci]
---

# Fiber — Cutover Pass 6: Frontmatter Wave 3 + Ether Lint CI

## Completed

1. Added frontmatter to additional trunk-critical docs:
   - `QB/README.md`
   - `QB/AUTONOMY_MATRIX.md`
   - `QB/BOOTSTRAP.md`
   - `docs/builder-workflow-regression.md`
2. Added source lint pipeline:
   - `trunk/overnight/jobs/lint-ether-sources-pass1.mjs`
   - npm script: `trunk:ether:lint-sources`
3. Wired source lint into CI as a pre-test guardrail.

## Effect

Trunk-first metadata coverage now includes key QB governance surfaces, and enabled remote ether sources are prevented from entering CI without compliance completeness.
