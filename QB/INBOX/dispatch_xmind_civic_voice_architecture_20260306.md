# CommunityBoard — Civic Voice Architecture
**Created:** 2026-03-06
**Source:** Troy verbatim (xmind session)
**Status:** Raw concept — dispatch to communityboard QB + Coach
**DN Principle:** "The end consumer of all my products must have a voice that is accountable for in the real decisions and shown back to those consumers."

---

## The Concept (Troy verbatim)

> "For civic action which we can parallel with much other action, we from a civic standpoint could have a page where the community can come and vote on the jobs that they want focused on most by the city and if they want to complain, that's fine, but they have to put it in the job where it lives as data of why this is important to solve and what happens to them. This is our storytelling could come in so they're able to complain about this area and right next to it they can see fractals of how they can get involved in what they can actually do to solve the problem their own they could also contribute money towards this job so that the city could hire people to focus on this and take on fractals and get this problem Solved."

> "You can see the cities fractals and structures to see what they have planted fix this and how it's actually working and where it's stuck and where murmuration could happen"

> "DivergentNetworks: the end consumer of all my products must have a voice that is accountable for in the real decisions and shown back to those consumers"

---

## What This Is

A civic engagement layer for CommunityBoard where community members can:

1. **Vote on city job priorities** — what should the city be focused on solving?
2. **File structured complaints** — not free-form noise; complaints live inside the Job they belong to as evidence of WHY this job matters
3. **See their story back** — storytelling layer: "Here's what happened to me because this isn't fixed"
4. **See fractal participation options** — right next to the complaint: what can YOU do today to help solve it? Volunteer links, local actions, community-run solutions
5. **Contribute money** — fund the job directly; contributions go toward hiring people (Contractors in FWM) to take on chunks and get it solved
6. **See the city's own fractal** — what has the city planted to fix this? Where is it working? Where is it stuck? Where could murmuration happen?

---

## The Structural Design

### Job Priority Page

```
[City Job: Fix Pothole Coverage on East Side]

  ↳ Priority votes: ████████████░░░░ 847 community members
  ↳ Complaints: 234 stories (why this matters)
  ↳ Funding contributed: $12,400 of $50,000 goal

  THE STORY
  "I blew out a tire on Main & 3rd. Cost me $380. I can't afford that."
  "My kid's wheelchair gets stuck every morning. We take a 6-block detour."
  "Delivery trucks avoid our street — 3 businesses have closed."

  WHAT YOU CAN DO
  ├── Volunteer for a Saturday fix-it crew → [Sign up]
  ├── Report new potholes → [Add to map]
  ├── Contribute to the repair fund → [$10 / $25 / $50 / Custom]
  └── Attend the city council session → [June 12, 6pm]

  WHAT THE CITY HAS DONE
  ├── ✅ Phase 1: Assessment complete (Jan 2026)
  ├── 🟡 Phase 2: Contractor bid process (in progress — 3 bids received)
  ├── ⛔ Phase 3: Funding approval (blocked — budget vote pending)
  └── ⬜ Phase 4: Repair schedule

  WHERE IT'S STUCK: Budget vote. Next council meeting: March 15.
  → [Contact your council member] → [Show up to vote]
```

### How Complaints Become Data

Complaints are not a vent channel. They are **evidence filed inside a Job**.

When a community member complains:
1. They're prompted: "What job does this belong to?" (or system suggests the match)
2. Their story becomes a data point: impact + frequency + personal cost
3. The job's evidence score increases
4. The city sees: this job has 234 stories attached — it's not just a request, it's a documented pattern

**FWM parallel:** Complaints = bonus data captured through the Growing Out lane. Every story enriches the Job's research repository. The community is doing ambient research for the city without knowing it.

---

## The Fractal Civic Structure

The city's work is visible as a fractal tree:

```
City of [Name]
  ├── Infrastructure
  │     ├── Roads & Transit
  │     │     ├── East Side Potholes [🟡 in progress — 3 chunks, 1 blocked]
  │     │     └── Bus Route 12 Extension [⛔ blocked — funding]
  │     └── Water & Utilities
  ├── Public Safety
  ├── Housing
  └── Community Services
```

Citizens see:
- **What's been planted** — what the city started
- **What's growing** — where progress is happening
- **What's stuck** — where the blockage is (and who controls it)
- **Where murmuration could happen** — where enough community action could unblock a stuck thread

**Murmuration signal:** When a job has: 500+ votes + 100+ stories + $20k contributed + 50 volunteers ready → system flags it as "murmuration ready." The city sees it as a priority signal it can't ignore. The community sees it as "we have enough momentum."

---

## DivergentNetworks Core Principle — Applied

> "The end consumer of all my products must have a voice that is accountable for in the real decisions and shown back to those consumers."

**Accountable voice:** Votes and stories are tied to outcomes. "847 people voted for this. Here's what happened." Not a black hole.

**Shown back:** The city's fractal is public. What happened to your vote? Where is it in the tree? What phase is it in? When is it expected to close?

**In real decisions:** City council agenda is driven by job priority scores, not just internal politics. High-murmuration jobs get agenda priority. The community's voice has structural weight, not just symbolic weight.

---

## FWM Parallel (Community Board as Distributed Civic Work)

| FWM concept | CommunityBoard civic equivalent |
|-------------|--------------------------------|
| Thread | City Job (infrastructure problem, civic initiative) |
| Chunk | Specific repair task / council vote / volunteer action |
| Contractor | Volunteer, city worker, or funded hire |
| QB | City department lead / council member |
| Coach | City administrator / mayor |
| Blocker | Budget hold / political opposition / resource gap |
| Thread Pressure Alert | Murmuration signal — enough community force to unblock |
| Work Viability Score | Job viability: is this fixable? Does the city have authority? |
| Community Convergence | Citizens voting + contributing + volunteering on same job |

---

## What Makes This Different

Every civic platform collects complaints. None of them:
1. Require complaints to live inside the Job they belong to (structured evidence, not noise)
2. Show the community their own fractal back (you can see what others are doing)
3. Surface concrete participation fractals next to every complaint (you can do something NOW)
4. Show the city's own fractal structure (accountability made visible)
5. Signal murmuration moments (when enough force accumulates to unblock a thread)
6. Close the loop with the citizen whose vote/complaint is attached to an outcome

The vote is the beginning, not the end. The citizen is a data producer, a story teller, a funder, a worker, and a witness.

---

## Dispatch Recommendations

1. **communityboard QB** — add this as a major product feature concept: Civic Voice Architecture
2. **Coach** — evaluate alignment with CommunityBoard charter and FWM architecture. Is this a new thread or an extension of the existing CB thread?
3. **ffa QB** — note: murmuration signal + community convergence + thread pressure alert all connect here. Schema implications for CB civic layer.
4. **Book** — "The Fractal Civic System" is a chapter candidate (Chapter 7 or later). The city as a living tree. Citizens as tenders. Murmuration as the coordination signal.

---

## Open Questions (for Coach)

- Is the funding layer (citizens contributing money) in scope for CommunityBoard MVP? Or post-MVP?
- Who owns the job structure? Does the city create jobs, or can the community create them too?
- What's the accountability mechanism if the city doesn't respond to a murmuration-ready job?
- Does this civic layer live inside CommunityBoard or is it a separate product?
