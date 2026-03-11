# UXOS Metaphor + Public Surface Alignment Layer

## Metaphor Primitives (Levels, Fields)
- Metaphor is a first-class, versioned operational primitive.
- Levels:
  - `system`: product-wide framing
  - `page`: surface-specific framing
  - `interaction`: microinteraction framing
- Required fields:
  - `id`, `level`, `name`, `statement`, `applies_to`, `do_not_do`, `status`, `version_id`, `timestamps`
- Optional fields:
  - `description`, `tone_tags`, `owner`

## How Metaphors Link to Jobs/OOUX/Pages
- `applies_to.page_ids[]` links metaphor to surfaces.
- `applies_to.interaction_ids[]` and/or `applies_to.surface_element_ids[]` links interaction scope.
- `applies_to.object_ids[]` and `applies_to.action_ids[]` bind metaphors to canonical OOUX semantics.
- `applies_to.job_ids[]` optionally binds framing to job support intent.
- Edge semantics:
  - `frames`: metaphor -> page/interaction
  - `aligns_with`: copy_atom <-> metaphor

## Public Surface Objects (CTA/Copy Atoms)
- PublicCopyAtom is a first-class, versioned content primitive.
- Copy atom types:
  - `cta`, `headline`, `label`, `helper_text`, `error`, `marketing_claim`
- Copy atom fields enforce intent and semantic mappings:
  - `surface_id`, `placement`, `text`
  - `intent.primary_job_id` (required for `cta`/`headline`/`marketing_claim`)
  - `references.object_ids[]`, `references.action_ids[]`, `references.capability_ids[]`
  - `constraints.must_not_imply[]`, `constraints.required_disclaimer`

## Alignment Rules (Copy <-> OOUX <-> Page Purpose <-> Job/Outcome)
- Copy must resolve to canonical semantics, not inferred prose intent.
- CTA rule:
  - Must map to >=1 `action_id`, >=1 `object_id`, and exactly 1 `primary_job_id`.
- Claim rule:
  - `marketing_claim` must map to >=1 `capability_id`; otherwise emit blocking `claim_capability_gap` unless suppressed with rationale.
- Surface rule:
  - Copy on a surface must match that surface's page purpose/job support map.
- Metaphor rule:
  - Copy on a surface should align to the active page/system metaphor and not violate `do_not_do` guardrails.

## Drift Detection (Triggers, Severity)
- Trigger: OOUX object/action rename, removal, or semantic change.
  - Re-evaluate linked metaphors and copy atoms.
  - Typical issues: `copy_ooux_mismatch` (`high`/`blocking`), `terminology_inconsistency` (`medium`).
- Trigger: page purpose or page-job mapping change.
  - Re-evaluate all copy atoms on that surface.
  - Typical issue: `copy_page_purpose_mismatch` (`high`).
- Trigger: system/page metaphor change.
  - Re-evaluate dependent page/interaction metaphors and aligned copy atoms.
  - Typical issues: `metaphor_conflict` (`high`), `metaphor_missing` (`medium`).

## Governance Rules + Canon Locking
- Metaphor governance:
  - Every page must have an active page metaphor or explicit `inherits_system_metaphor=true`.
  - Every interaction metaphor must reference >=1 object or action.
  - Canon metaphor requires non-empty `applies_to`, non-empty `do_not_do`, and `owner`.
- Public copy governance:
  - Every CTA must satisfy action/object/job mapping requirements.
  - Canon copy atoms require required mappings and zero open blocking alignment issues.
- Canon lock:
  - Mutations to canon metaphor/copy records require approved changesets.
  - Rule suppressions require rationale, owner, and versioned audit metadata.

## MVP Scope
- Ship first:
  - Metaphor registry (`system`/`page`/`interaction`) with typed links
  - PublicCopyAtom registry with required mappings
  - Alignment rule engine producing AlignmentIssue objects for:
    - `cta` missing required mappings (`blocking`)
    - `copy_ooux_mismatch` (`blocking`/`high`)
    - `terminology_inconsistency` (`medium`)
    - `metaphor_missing` (`medium`)
    - `metaphor_conflict` (`high`)
  - Drift scan command:
    - `uxos align scan --surface <id> --since <version>`
