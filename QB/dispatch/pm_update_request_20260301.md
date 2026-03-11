Project
COMMUNITYBOARD

Destination
/Users/troyeffner/Dropbox/DEV/communityboard/00 (PM thread)

Prompt
Chief request: Provide immediate PM status update.

Action
1. Update `QB/status.json` with current truth (goals, blockers, next_actions, updated_at).
2. Add a dated entry in `QB/DECISION_LOG.md` with:
- what changed since last report
- current top 3 priorities
- key risk/blocker needing Chief attention (if any)
3. Run:
- `./QB/qb check`
- `./QB/qb report`

Acceptance
- `QB/status.json` timestamp updated today.
- `QB/DECISION_LOG.md` contains a dated PM update entry.
- `QB/report_20260301.md` regenerated and aligned with status.
- `qb check` passes.

Return
- Return format: changed files + qb check result + blocker list.
- Return location: `QB/dispatch` + `QB/report_YYYYMMDD.md`.
- Blocking policy: same-day escalation to Chief with owner + ETA.
