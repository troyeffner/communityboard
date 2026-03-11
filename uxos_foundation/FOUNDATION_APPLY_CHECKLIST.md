# UXOS Foundation Apply Checklist

Generated: 2026-02-28T19:59:09.882Z
Output root: /Users/troyeffner/Dropbox/DEV/communityboard/uxos_foundation

## FFA Contract
- `FFA` = **Foundational Framework Artifacts**.
- FFA scope includes epistemic artifacts (assumptions, hypotheses, experiments, evidence), not only static strategy docs.
- Project-level FFA hypothesis records live in:
  - `/Users/troyeffner/Dropbox/DEV/communityboard/QB/HYPOTHESIS_REGISTER.md`
  - `/Users/troyeffner/Dropbox/DEV/communityboard/QB/HYPOTHESIS_MAPPING_DB.v1.json`

## Step 1: Canonical entity mapping
- Map existing IDs to canonical entities: `job`, `actor`, `object`, `action`, `page`, `capability`, `outcome`.
- Record unresolved mappings as blockers.

## Step 2: Epistemic ingest
- Import current assumptions/hypotheses/experiments/evidence using `epistemic.types.ts`.
- Flag missing assumption links on hypotheses.

## Step 3: Public surface + metaphor ingest
- Import CTAs/headlines/labels/claims using `metaphor_and_copy.types.ts`.
- Register system, page, and interaction metaphors with OOUX/page/job links.

## Step 4: Governance activation
- Enable canon lock for canon records.
- Enable rule IDs: `GR1..GR5`, `MG1..MG3`, `CG1..CG3`, `LK1`.

## Step 5: First drift and alignment scan
- Run baseline scan (placeholder command):
`uxos align scan --surface <id> --since <version>`
- Triage blocking issues first: `copy_ooux_mismatch`, `claim_capability_gap`, CTA missing required mappings.

## Step 6: Merge gate
- Prevent canon merges if blocking issues are open unless explicitly suppressed with rationale and owner.
