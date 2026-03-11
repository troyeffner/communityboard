Project
COMMUNITYBOARD

Destination
/Users/troyeffner/Dropbox/DEV/communityboard/00 (QB thread)

Prompt
Coach check-in: provide latest QB update now.

Required return fields:
1) Status
- health, mode, updated_at
- top 3 goals with progress

2) Blockers
- all blocking/high blockers with owner, ETA, and next mitigation action

3) Execution
- what changed since last report (files/artifacts)
- top 3 next actions for next cycle

4) Governance
- confirm ./QB/qb check pass status
- confirm report/status alignment (if drift, regenerate ./QB/qb report)

5) Risk to Coach
- one escalation requiring Coach decision (or explicitly "none")

Acceptance
- Update reflected in QB/status.json and QB/report_YYYYMMDD.md
- Decision log entry added if blockers/status materially changed
- Return posted as dated dispatch artifact in QB/dispatch/

Return
- File path to update artifact + one-line disposition (Aligned / Needs Coach decision)
