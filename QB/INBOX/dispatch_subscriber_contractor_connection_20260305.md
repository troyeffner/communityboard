# Community Board QB Dispatch: Subscriber ↔ Contractor Connection Layer
Date: 2026-03-05
From: Coach
Priority: High
Thread: thread_subscriber_contractor_connection_20260305.md
Parent: thread_communityboard_subscription_voting_20260305.md

---

## Story

The subscription voting thread gives subscribers visibility into where their money goes:
income → costs → pool → job.

This thread goes one level deeper: **who is doing that job.**

Subscribers fund real people. They should be able to see that person — name or alias,
where they're from, what they've built, what their standing is in the community.

When a subscriber's dollar reaches a Contractor, that should be a moment:
"Your contribution is now funding [name/alias] — working on [job] — status: [in progress]."

This is the difference between a transparent platform and a community.

---

## Your Fraction (communityboard QB)

You own the subscriber-facing layer:

- **Subscriber → Contractor trace**: show the subscriber specifically who their dollar funded
- **Funding moment**: notification when money reaches a Contractor
- **Community board view**: all active Contractors visible — name, location, current job, status
- **Contractor card UI**: how does the Contractor appear to the subscriber?

---

## NDD QB fraction (already dispatched)

NDD QB owns the ContractorProfile schema additions:
- Public fields (name/alias, location, bio, specialization, impact trail)
- Opt-in controls (what Contractors choose to share)
- Union standing badge (comes from Contractor Union thread — wq_079)

**Wait for NDD QB to return public ContractorProfile schema before building the UI.**
That schema is the floor for your fraction.

---

## Root Blocker

**Contractor opt-in controls** — what do Contractors agree to share publicly?
This is a Contractor decision, not a Coach or QB decision.
NDD QB to design the opt-in mechanism. Your UI adapts to whatever they choose to share.

---

## Deliverables

### Immediate
- [ ] Sketch the Contractor card UI — what does a subscriber see when they see a Contractor?
  (Name/alias, location, current job, union badge, brief tagline — minimum viable card)
- [ ] Design the "funding moment" — when does it trigger? What does the subscriber see?
- [ ] Community board view — how are all active Contractors displayed?
  (Map by location? List by job? Filter by union standing?)

### Queued (needs NDD QB schema first)
- [ ] Subscriber → Contractor trace: wire subscriber's allocation to specific Contractor record
- [ ] Contractor impact trail on subscriber view: what has this person built?
- [ ] Union standing badge integration into Contractor card

---

## Key Lines

- "Your dollar funded a real person doing real work."
- "Subscriber, meet your Contractor. Contractor, meet your patron."
- "Community isn't a feature. It's structural — baked into the funding model."
