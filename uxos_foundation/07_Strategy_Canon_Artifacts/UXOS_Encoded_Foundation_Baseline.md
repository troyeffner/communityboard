# UXOS Encoded Foundation Baseline (Current State)

## Purpose
This document captures what is already encoded in UXOS foundation artifacts so the same ways of working can be ported into an existing project and gap-assessed.

## Canonical Ways of Working Encoded
- Design and strategy structures are modeled as typed, versioned primitives.
- Canon lock is expected for canon-grade records; no direct canon mutation outside approved changesets.
- Governance is rule-based and machine-evaluable.
- Drift is a first-class system condition that triggers review workflows.
- Public-facing language is treated as operational structure, not free-form copy.

## Encoded Layer 1: Epistemic Layer (Assumptions vs Hypotheses)
Source files:
- `/08_Data_Model_and_API_Contracts/UXOS_Epistemic_Layer_Assumptions_vs_Hypotheses.md`
- `/08_Data_Model_and_API_Contracts/epistemic.types.ts`
- `/08_Data_Model_and_API_Contracts/epistemic.example.json`

### Entities encoded
- `Assumption`
- `Hypothesis`
- `Experiment`
- `Evidence`
- `Edge`
- `GovernanceRule`

### Epistemic lifecycle encoded
- Discovery -> assumptions dominate.
- Exploration -> assumptions refine into hypotheses.
- Delivery -> intervention-based hypotheses tested.
- Post-release -> evidence updates assumption confidence/risk.

### Epistemic graph loop encoded
- `assumption -> informs -> hypothesis -> tested_by -> experiment -> produces -> evidence -> updates -> assumption`

### Governance rules encoded (IDs)
- `GR1`: every hypothesis links to >=1 assumption.
- `GR2`: every experiment links to >=1 hypothesis.
- `GR3`: terminal hypothesis result requires evidence.
- `GR4`: canon assumption requires links + confidence/risk + evidence or pending reason.
- `GR5`: canonical-entity changes mark related epistemic records `needs_review`.

### Drift behavior encoded
- On canonical entity rename/remove/semantic change, linked assumptions/hypotheses are flagged for review.

## Encoded Layer 2: Metaphor + Public Surface Alignment Layer
Source files:
- `/08_Data_Model_and_API_Contracts/UXOS_Metaphor_Public_Surface_Alignment_Layer.md`
- `/08_Data_Model_and_API_Contracts/metaphor_and_copy.types.ts`
- `/08_Data_Model_and_API_Contracts/metaphor_and_copy.example.json`

### Entities encoded
- `Metaphor` (levels: `system | page | interaction`)
- `PublicCopyAtom` (types: `cta | headline | label | helper_text | error | marketing_claim`)
- `AlignmentIssue`
- `Edge`
- `GovernanceRule`

### Required alignment primitives encoded
- Copy intent and mappings to canonical structures (`job`, `object`, `action`, optionally `outcome`, `capability`).
- Metaphor applicability mappings to surfaces/interactions/OOUX semantics.

### Edge semantics encoded
- `frames`
- `implies`
- `aligns_with`
- `violates`
- `uses_term` (optional path reserved)

### Governance rules encoded (IDs)
- `MG1`: every page has active page metaphor or explicit system inheritance.
- `MG2`: interaction metaphor maps to at least one object or action.
- `MG3`: canon metaphor requires applies_to + do_not_do + owner.
- `CG1`: CTA requires >=1 action, >=1 object, and 1 primary job.
- `CG2`: marketing claim requires >=1 capability or blocking issue.
- `CG3`: canon copy requires mappings and no open blocking issues.
- `LK1`: canon changes require approved changeset.

### Drift + issue model encoded
- Drift triggers from OOUX, page-purpose/job mapping, and metaphor changes.
- `AlignmentIssue` taxonomy encoded:
  - `metaphor_conflict`
  - `metaphor_missing`
  - `copy_ooux_mismatch`
  - `copy_job_mismatch`
  - `copy_page_purpose_mismatch`
  - `claim_capability_gap`
  - `terminology_inconsistency`
- Severity scale encoded: `low | medium | high | blocking`.
- Rule-engine/manual detection source encoded.

## What is Already Operationally Reusable
- Portable typed contracts for epistemic and metaphor/copy alignment layers.
- Baseline governance rule sets with IDs suitable for direct rule-engine implementation.
- Example datasets that demonstrate:
  - evidence-supported and contradicted hypotheses,
  - confidence/risk update rationale,
  - metaphor conflict and CTA/OOUX misalignment,
  - blocking alignment issues.
- Drift scan command placeholder in spec:
  - `uxos align scan --surface <id> --since <version>`

## Known Gaps Before Applying to an Existing Product
- Runtime validators are not yet implemented in this layer (types/spec are present).
- No migration adapters yet for importing an external product's current jobs/objects/pages/copy.
- No suppression workflow object model beyond per-issue rationale field.
- No explicit terminology registry entity yet (`uses_term` edge exists but glossary type is not defined).
- No end-to-end CI gate wired to fail builds on blocking epistemic/alignment issues.

## Immediate Porting Checklist (Project Onboarding)
1. Map existing product entities to canonical IDs (`job`, `object`, `action`, `page`, `outcome`, `capability`).
2. Import current assumptions/hypotheses/evidence into epistemic contracts.
3. Import public CTAs/headlines/labels/claims as `PublicCopyAtom` records with mappings.
4. Register system/page/interaction metaphors and inheritance decisions.
5. Run first rule pass and produce baseline open issues.
6. Lock canon and require changesets for all remediations.
