# Dispatch: Participant Job Selection
From: Coach
To: Community Board QB
Date: 2026-03-04
Priority: Med
Thread: Participant Voice — Let participants choose what gets improved

---

## Fractal Thread

**So you want to:** Give community board participants a way to select the jobs they want the app to improve.

**Character:** A community board participant who shows up consistently and cares about the platform getting better. They have opinions — things that feel clunky, things they wish the app did — but no channel to say so. Their feedback evaporates after they leave a session.

**Current state:** No mechanism for participants to influence product direction. Feedback, if it exists, is informal and untracked.

**Destination:** A page (or section) where participants can browse a menu of jobs the app supports, mark the ones they want improved, and see that their input is being collected. Participants feel heard. Product direction is informed by actual actor input.

---

## What systems do we need?

1. **Job library** — A curated list of jobs the app currently supports (or should). Drawn from existing JTBD framework if one exists in the project; otherwise needs to be built.
2. **Selection UI** — A simple page where participants browse and select jobs. Could be checkboxes, voting, priority ranking, or a simple "I want this improved" flag.
3. **Aggregation view** — An internal view showing which jobs are most-selected across participants. Input to product decisions.
4. **Routing** — Where does this page live? Auth-gated? Part of onboarding? Post-session prompt?

---

## Does this apply elsewhere?

- **NDD platform** — Job selection is a research data collection mechanism. NDD may want a native version of this for any research project using community feedback.
- **Livability, Small Biz** — Other community-facing projects may want the same pattern.
- **FWM** — "Participant voice in what gets built" is a legitimate FWM use case — the actors (participants) are stakeholders in the work.

---

## QB Deliverables

1. Check: does a JTBD or jobs framework exist in this project already? If yes, use it as the job library source.
2. Check: is there any existing community feedback narrative or artifact?
3. Queue: scope the selection UI — what's the simplest version that collects real signal?
4. Escalate to Coach if job library needs to be built from scratch (NDD QB may have a shared framework).

---

## Notes from Coach

Troy's instinct: this is a "participant steering" feature — participants get to vote on what the app does better for them. The jobs framing (JTBD) is the right lens. Keep it simple: don't over-engineer the UI. The signal matters more than the interface.

If there's no existing jobs framework for community board, this is a research task before a build task.
