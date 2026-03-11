# All QB OST-in-FFA Rollout Dispatch

Project
All active repos (`SmallBiz`, `communityboard`, `tyfbaf`, `Livability`, `SoundPad`, `xmind`, `satbuttons`, `nojarg`)

Destination
`00_QB` in each project

Prompt
Implement OST as first-class in FFA and verify alignment.

Tasks
1. Pull latest QB tooling from UXOS templates.
2. Run `./QB/qb ffa-state-migrate`.
3. Confirm `framework_foundation` includes arrays:
- `desired_outcomes`
- `opportunities`
- `solutions`
- `ost_links`
4. Run `./QB/qb ffa-plan-sync --backfill-notes`.
5. Run `./QB/qb check`.
6. Run `./QB/qb report`.
7. Add decision log entry: `OST first-class in FFA adopted`.

Acceptance
1. `./QB/qb check` passes.
2. OST arrays exist in `ffa_instance.json`.
3. Latest report includes `FFA plan alignment: aligned`.
4. Decision log entry exists.

Return
Return one block per repo:
- repo
- result: aligned | blocked
- blocker (if any)
- evidence paths (`ffa_instance.json`, report, decision log)
