Project
SMALLBIZ

Destination
/Users/troyeffner/Dropbox/DEV/CommunityBoard/00 (CommunityBoard PM thread)

Prompt
SmallBiz productization intake is blocked. Send required pilot artifacts through QB today per the canonical contract.

Scope
In-scope:
- Current-cycle transfer note for SmallBiz intake
- Current-cycle evidence package with promote/defer signal
- Contract minimum verification for event schema + CTA alignment + drift blockers

Out-of-scope:
- New feature implementation in CommunityBoard
- Refactors unrelated to pilot-to-product transfer
- Net-new strategy changes outside active contract

Required artifacts (current cycle)
1. Transfer note
- module candidate summary
- what can move to SmallBiz now
- what needs hardening first
- known risks and guardrails

2. Evidence package
- hypothesis id(s)
- experiment id
- measured outcomes
- go/no-go recommendation

3. Contract minimum verification
- event schema mapping for required fields:
  - `event_name`
  - `surface_id`
  - `copy_atom_id`
  - `primary_job_id`
  - `object_ids[]`
  - `action_ids[]`
  - `session_id`
  - `timestamp`
- CTA alignment status (object/action/primary job)
- open blocking drift issues (if any)

Contract reference
- /Users/troyeffner/Dropbox/DEV/UXOS/08_Data_Model_and_API_Contracts/communityboard_smallbiz_pilot_contract.md

Constraints
- Use existing QB dispatch conventions and dated artifacts.
- No silent contract changes.
- If artifacts are incomplete by EOD, include explicit blocker owner + ETA + mitigation.

Validation commands
- `ls -la /Users/troyeffner/Dropbox/DEV/CommunityBoard/QB/dispatch/`
- `rg -n "hypothesis|experiment|go/no-go|event_name|surface_id|primary_job_id|CTA|drift" /Users/troyeffner/Dropbox/DEV/CommunityBoard/QB/dispatch/*.md`
- `cat /Users/troyeffner/Dropbox/DEV/CommunityBoard/QB/status.json`

Acceptance
- Transfer note delivered and linked in CommunityBoard QB dispatch.
- Evidence package delivered with explicit promote/defer recommendation.
- Contract minimum verification included.
- Any blockers include owner + ETA + mitigation.

Return
- Return format: file paths + concise summary + blocker list.
- Return location: `/Users/troyeffner/Dropbox/DEV/CommunityBoard/QB/dispatch/` and ping in SmallBiz QB report thread.
- Blocking policy: same-day escalation if artifacts cannot be delivered by EOD.
