> **SUPERSEDED** — 2026-03-09. WoW v3.60.0 propagated to all Custodians. These principles are now in WOW_BASELINE.json. No action required.

# WoW Dispatch — Operating Philosophy Clarifications
From: TroyOS Coach
Date: 2026-03-04
Audience: All QBs → relay to Running Backs

---

## What This Is

Three operating philosophy clarifications from Troy. These are now canonical WoW.
QBs: absorb and relay to your Running Back on the next /send brief or BOOTSTRAP update.

---

## 1. Use /close frequently — it creates valued friction

**The principle:**
/close is not just for end-of-night. Use it between project hops too.

The friction of closing a context and intentionally reopening it is a feature, not a cost.
A clean close makes you more reluctant to reopen without purpose — that reluctance forces intentionality.
It prevents reactive drift. It enforces that the next entry is a choice, not an accident.

**What this means for QBs and RBs:**
- When wrapping a thread — even a short one — close cleanly before moving on.
- When you return to a context, treat it as a fresh open: orient, read queue, confirm state.
- Don't tab-switch. Close. Then open.

---

## 2. Moving between QBs and RBs: use /open + /close each time

**The pattern:**
- Closing a QB session → /close (ingest, flush to disk, primer)
- Opening a new QB or RB → /open (orient, queue, confirm state)
- Never carry state from one context into another through memory alone — the file is the truth.

This applies at every level: Coach↔QB, QB↔RB, and between projects.

---

## 3. RBs should get maximum context — pack the brief

**The principle:**
When dispatching to a Running Back, give them everything they need to solve the problem without coming back to ask.

- Don't assume the RB has project context — they don't, unless it's in the brief.
- Include: the problem, the goal, relevant file paths, current state, blockers, constraints.
- A thin brief creates a thin result. A full brief creates a complete deliverable.

**The bash relay pattern:**
Running Backs don't have file/terminal access. If an RB needs data from a repo file:
- RB should explicitly ask Troy to run a bash command (e.g. `cat /DEV/satbuttons/CLAUDE.md`)
- Troy pastes the output back into the Chat thread
- RB proceeds with full context

This is the bridge for RBs when they hit a data gap. Ask Troy. He can run it.

---

## Action for QBs

1. Absorb these three principles — they apply to your sessions too.
2. On your next /send brief to your Running Back: include these operating principles as context.
3. Optional: add the bash relay pattern to your QB/BOOTSTRAP.md so future RBs know to ask.

---

## Reference Decisions

| id | decision |
|----|----------|
| d_033 | Use /close between project hops — protective friction is a feature |
| d_034 | RBs receive maximum context; bash relay pattern: RB asks Troy to cat files |
