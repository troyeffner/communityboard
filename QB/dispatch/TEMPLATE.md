Project
__PROJECT__

Destination
<Codex Desktop - exact thread>

Prompt
<production-ready task prompt>
If this is a bootstrap thread introduction (00-08), include:
- Thread Responsibilities
- Thread Jobs
- Environment Variables
- First 3 Actions
- Acceptance Signals

Acceptance
- <required output>
- <validation/tests>

Return
- Return format: <files/diffs/results>
- Return location: <00_Original or QB report thread>
- Blocking policy: <how blockers are reported>

QB-to-QB Notes
- If this is cross-repo QB-to-QB, receiver must update QB/status.json and QB/DECISION_LOG.md.
- Escalate to Chief before execution for scope/contract/architecture changes.

Check Updates Request Rule
- For any "check updates" prompt, receiver must run `./QB/qb sync` (or `./QB/qb check-updates`).
- Reply must start with:
  1. What We Learned
  2. What Changed
  3. What Matters Next
