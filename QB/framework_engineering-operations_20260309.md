---
type: framework
cluster: engineering-operations
date: 2026-03-09
cl: 1
wow_refs: [wow_62-wow_94]
fractals: [ops-hub, all-custodians]
generated_from: 6 TRUNK files, cluster engineering-operations
---

# Framework — Engineering Operations: Portfolio Activation

**Compression level:** CL-1 (Roots)
**Generated from:** 6 TRUNK files, 2026-03-09
**Distributed to:** ops-hub QB, all 13 Custodian QBs

---

## The Work in One Statement

The portfolio was activated on 2026-03-09. All 13 Custodian QBs are current on WoW, triage is clean, and the TRUNK is the live operating surface. Engineering ran a full sweep and closed all open loops from the pre-activation period.

---

## What Was Completed

**WoW lock pass — wow_62 through wow_94**
33 principles locked in a single session. WoW moved from v3.28.0 to v3.60.0-troyos. This represented the bulk of the conceptual backlog from the portfolio founding period.

**Custodian QB triage — all 13 projects**
Every Custodian QB was swept. Findings:
- `dispatch_infra_update_20260304` and `dispatch_wow_20260304` were present in all 13 QBs — both superseded by v3.60.0+ propagation. No QB action needed.
- xmind had 10 dispatches — 7 Coach-domain items routed to TRUNK, 3 resolved on the spot
- communityboard had 5 dispatches — all routed appropriately
- 17 FWM primitives filed to NDD QB/INBOX for schema integration

**TRUNK activated — EXCHANGE retired**
5 post-transition files moved from EXCHANGE to TRUNK (Option A). The EXCHANGE is now heartwood — immutable historical record. The TRUNK is the live operating surface.

**WoW propagation pattern established**
All propagation runs use a single bash loop: copy ops-hub/QB/WOW_BASELINE.json to all 13 Custodian QB paths. This is the canonical pattern. Never do it by hand.

---

## What Each Fractal Should Know

**ops-hub:** The trunk is live and indexed. Engineering triage is complete. The EXCHANGE is retired.

**All 13 Custodians (Livability, NDD, SmallBiz, SoundPad, UXOS, communityboard, david-os, divergent-networks, jargone, satbuttons, story-lab, tyfbaf, xmind):** Your QB is current on WoW v3.65.0-troyos. Any pre-2026-03-09 dispatches from `dispatch_infra_update_20260304` or `dispatch_wow_20260304` can be cleared — they are superseded.

---

## Proven Patterns

**WoW propagation:** `cp ops-hub/QB/WOW_BASELINE.json [custodian]/QB/WOW_BASELINE.json` across all 13 paths. Run after every version bump.

**Three-copy distribution:** Content distributed to three surfaces simultaneously — stewardship (ops-hub), sandbox (originating project), live (product surface). Never remove from originating location.

**QB triage routing:** Items outside Engineering scope → TRUNK. Items for product teams → project QB/INBOX. Engineering items stay in place.

---

## Open Work

None. This cluster is fully closed.
