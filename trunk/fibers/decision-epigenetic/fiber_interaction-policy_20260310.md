---
type: fiber
date: 2026-03-10
status: active
fiber_kind: decision-epigenetic
topics: [interaction-policy, vote-limit, tag-promotion, trunk-cutover]
---

# Fiber — Interaction Policy (Pass 2)

Policy source moved out of inline route constants and into trunk-governed policy surfaces.

## Canonical values

- vote limit per 24h: 30
- tag promotion threshold: 3

## Runtime mapping

- `lib/trunk/interactionPolicy.ts` reads env-backed values
- `trunk/config/interaction_policy.json` stores canonical policy anchor

## Why

Threshold governance should be explicit and portable across routes, not repeated as route-local literals.

