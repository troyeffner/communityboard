# Coach Update - Portfolio Changes (2026-03-01)

Project
All active repos (`SmallBiz`, `communityboard`, `tyfbaf`, `Livability`, `SoundPad`, `xmind`, `satbuttons`, `nojarg`)

Destination
`00_QB` in each repo

Prompt
Ingest the following canon and tooling updates immediately.

What changed
1. FFA now enforces `epistemic_state` on framework records (`seed|hypothesis|stabilized`).
2. FFA-plan alignment is now bidirectional and enforced:
- FFA changes require `./QB/qb ffa-plan-sync`
- active queue rows require `ffa_ref:<id>` or `no_ffa_impact_reason:<reason>`
3. OST is first-class in FFA:
- `desired_outcomes`, `opportunities`, `solutions`, `ost_links`
4. Seed data policy is now canonical:
- seed records are exploratory by default
- seed records require `seed_metadata` (`seed_label`, `evaluation_status`, `probe_intent`)
5. Framework input guidance registry was added in UXOS canon, including hints/tricks for each framework.
6. Communication style WoW is now canonical:
- keep responses short, plain-language, and human-first by default.

Required actions
1. Run `./QB/qb ffa-state-migrate`.
2. Run `./QB/qb ffa-plan-sync --backfill-notes`.
3. Run `./QB/qb check`.
4. Run `./QB/qb report`.
5. Add decision log entry: `Coach change update 2026-03-01 ingested`.

Acceptance
1. Check passes.
2. Report regenerated with `FFA plan alignment: aligned`.
3. Decision log ingestion entry exists.

Return
Return per repo:
- result: aligned | blocked
- blocker (if any)
- evidence paths (report, decision log)
