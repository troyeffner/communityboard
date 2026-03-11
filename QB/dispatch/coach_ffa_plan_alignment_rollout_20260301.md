# All QB Bidirectional FFA-Plan Alignment Rollout

Project
All active repos (`SmallBiz`, `communityboard`, `tyfbaf`, `Livability`, `SoundPad`, `xmind`, `satbuttons`, `nojarg`)

Destination
`00_QB` in each project

Prompt
Implement and verify bidirectional FFA-plan alignment policy.

Tasks
1. Sync latest QB tooling from UXOS (includes `ffa-plan-sync`).
2. Run `./QB/qb ffa-plan-sync --backfill-notes`.
3. Confirm `QB/PLAN_ALIGNMENT_STATE.json` exists and `alignment_status` is `aligned`.
4. Confirm active `QB/WORK_QUEUE.md` rows include either:
- `ffa_ref:<id>`
- `no_ffa_impact_reason:<reason>`
5. Run `./QB/qb check`.
6. Run `./QB/qb report`.
7. Add decision log entry: `Bidirectional FFA-plan alignment v1 enforced`.

Acceptance
1. `./QB/qb check` passes.
2. `QB/PLAN_ALIGNMENT_STATE.json.last_ffa_hash` matches current `ffa_instance.json` hash.
3. No active queue rows are missing alignment markers.
4. New report contains `FFA plan alignment: aligned`.

Return
Return one status block per repo:
- repo
- result: aligned | blocked
- blocker (if any)
- evidence paths (`QB/PLAN_ALIGNMENT_STATE.json`, report file, decision log entry)
