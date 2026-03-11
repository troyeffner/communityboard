# All QB Seed Data Policy Rollout

Project
All active repos (`SmallBiz`, `communityboard`, `tyfbaf`, `Livability`, `SoundPad`, `xmind`, `satbuttons`, `nojarg`)

Destination
`00_QB` in each project

Prompt
Adopt and enforce FFA seed data semantics.

Tasks
1. Pull latest QB scripts from UXOS templates (`qb_check.sh`, `qb_ffa_state_migrate.sh`).
2. Run `./QB/qb ffa-state-migrate`.
3. Confirm every `epistemic_state: seed` record has `seed_metadata` with:
- `seed_label`
- `evaluation_status` (`research_backed|research_needed`)
- `probe_intent`
4. Run `./QB/qb ffa-plan-sync --backfill-notes`.
5. Run `./QB/qb check`.
6. Run `./QB/qb report`.
7. Add decision log entry: `FFA seed data policy adopted`.

Acceptance
1. `./QB/qb check` passes.
2. Seed records are explicitly labeled and include evaluation/probe fields.
3. Latest report includes `FFA plan alignment: aligned`.

Return
Return per repo: result + blocker (if any) + evidence paths.
