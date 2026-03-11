Project
communityboard

Destination
00_QB

Prompt
Coach protocol update is now active: "check for updates" means full operating baseline refresh plus automatic update processing.

Required first-run action (execute now):
1. Run `./QB/qb check-updates`
2. Confirm `QB/dispatch/wow_refresh_20260302.md` exists
3. Confirm `QB/dispatch/update_summary_20260302.md` exists and starts with:
   - What We Learned
   - What Changed
   - What Matters Next
4. Record one-line adoption note in `QB/DECISION_LOG.md`.

Acceptance
- First-run check-updates completes without error.
- WoW baseline refresh artifact exists.
- Human summary artifact exists and is correctly structured.
- Decision log includes adoption note.

Return
- One-line disposition + blocker (if any)
- Artifact paths for wow refresh + update summary
