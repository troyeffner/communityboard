# All QB FFA Epistemic State Rollout Dispatch

## Dispatch 1
Project
All active repos (`SmallBiz`, `communityboard`, `tyfbaf`, `Livability`, `SoundPad`, `xmind`, `satbuttons`, `nojarg`)

Destination
`00_QB` in each project

Prompt
Implement FFA epistemic state canon in this repo.

Tasks
1. Run `./QB/qb ffa-state-migrate`.
2. Open `08_Data_Model_and_API_Contracts/ffa_instance.json` and confirm:
- `meta.epistemic_state_scale` contains `seed|hypothesis|stabilized`
- `framework_foundation.epistemic_state_policy` exists
- every object in every framework array has `epistemic_state`
3. Run `./QB/qb check`.
4. Run `./QB/qb report`.
5. Add decision log entry: `FFA epistemic_state rollout completed` with date, owner, and impacted files.

Acceptance
1. `./QB/qb check` passes.
2. `ffa_instance.json` includes policy + scale and no framework record missing `epistemic_state`.
3. Daily report is regenerated after rollout.
4. Decision log entry exists.

Return
Return one status block:
- repo
- result: aligned | blocked
- blocker (if any)
- evidence paths (`ffa_instance.json`, report file, decision log entry)

## Dispatch 2
Project
`communityboard` additional path

Destination
`00_QB` (`communityboard`)

Prompt
Apply the same migration to nested foundation copy:
- `uxos_foundation/08_Data_Model_and_API_Contracts/ffa_instance.json`

Acceptance
1. Nested foundation file has matching `epistemic_state` policy and populated record states.
2. Repo `./QB/qb check` remains green.

Return
Include nested file path in evidence output.
