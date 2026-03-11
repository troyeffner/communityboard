Project
COMMUNITYBOARD

Destination
/Users/troyeffner/Dropbox/DEV/communityboard/00 (PM thread)

Prompt
Chief directive: Re-read all active QB and UXOS governance policies today and confirm operational compliance.

Required reading (repo-local):
- `QB/README.md`
- `QB/policies/pm_hybrid_update_policy.md`
- `QB/policies/pm_to_pm_handoffs.md`
- `QB/policies/local_overrides.md`
- `QB/RELEASE_GATE_CHECKLIST.md`
- `QB/AUTONOMY_MATRIX.md`

Required reading (UXOS canon):
- `/Users/troyeffner/Dropbox/DEV/UXOS/07_Strategy_Canon_Artifacts/QB_PM_OPERATING_POLICY.md`
- `/Users/troyeffner/Dropbox/DEV/UXOS/07_Strategy_Canon_Artifacts/CHIEF_OPERATING_ADDENDUM_V1.md`
- `/Users/troyeffner/Dropbox/DEV/UXOS/07_Strategy_Canon_Artifacts/PM_TO_PM_QB_HANDOFF_POLICY.md`
- `/Users/troyeffner/Dropbox/DEV/UXOS/07_Strategy_Canon_Artifacts/MARKETING_TELEMETRY_OPERATING_STANDARD.md` (if marketing_surface_enabled=true)

Action
1. Re-read all listed policies.
2. Add acknowledgment entry to `QB/DECISION_LOG.md` with date, owner, and any ambiguity needing Chief clarification.
3. Update `QB/status.json` if any compliance gaps or blockers are identified.
4. Run `./QB/qb check` and `./QB/qb report`.

Acceptance
- Dated acknowledgment entry exists in `QB/DECISION_LOG.md`.
- Any policy gaps are logged in `QB/status.json` blockers with owner/ETA.
- `qb check` passes.
- Daily report regenerated after acknowledgment.

Return
- Return format: changed files + qb check result + blocker list (if any).
- Return location: `QB/dispatch` + `QB/report_YYYYMMDD.md`.
- Blocking policy: escalate to Chief same day if policy ambiguity blocks execution.
