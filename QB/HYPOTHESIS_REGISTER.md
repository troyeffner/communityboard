---
type: document
from: communityboard-qb
date: 2026-03-10
status: active
topics: [qb, governance, documentation]
fractals: [communityboard]
cluster: qb-docs
---

# QB Hypothesis Register

This register tracks one initiative in multiple lenses so planning can translate cleanly:
- Assumption
- Hypothesis
- Opportunity
- Problem to Solve

## Field Model (single row, four lenses)
Use this structure for every entry:

- `id`: stable hypothesis/problem thread id
- `status`: proposed | planned | running | concluded
- `owner`: accountable PM/lead
- `priority`: p0 | p1 | p2
- `assumption`: what we currently believe is true
- `problem_to_solve`: user/system pain expressed as a solvable problem
- `opportunity`: upside if solved (business/community/experience)
- `hypothesis`: testable if/then statement
- `intervention`: what we will change/test
- `metrics_primary`: success metrics
- `metrics_guardrail`: safety/fairness metrics
- `fail_conditions`: what invalidates the bet
- `dependencies`: required prerequisite work queue items
- `evidence_artifacts`: outputs required for decision
- `decision_rule`: explicit go/no-go threshold

## Quick View (portfolio)
| id | status | priority | mapped_job_ids | mapped_page_ids | mapped_desired_outcome_ids | problem_to_solve (short) | opportunity (short) |
|---|---|---|---|---|
| h_20260301_viewpoint_fairness_filter_signal | proposed | p1 | job_discover_board_items, job_review_poster_items | page_public_browse, page_public_poster | do_clear_public_discovery | Users may perceive partisan suppression in discovery | Improve trust + relevance via transparent preference signals |
| h_20260301_known_unknown_venue_model | proposed | p1 | job_discover_board_items, job_review_poster_items, job_tend_and_pin_board | page_public_browse, page_public_poster, page_builder_create | do_clear_public_discovery, do_high_metadata_integrity | Venue identity is often missing or ambiguous at capture time | Improve discovery and trust with explicit known vs unknown venue state |

## Canonical Mapping Database
- Machine-readable map file: `/Users/troyeffner/Dropbox/DEV/communityboard/QB/HYPOTHESIS_MAPPING_DB.v1.json`
- Purpose: map each hypothesis row to canonical JTBD IDs, OOUX entities (actors/objects/actions/outcomes/capabilities), desired outcomes, and page routes.
- Rule: use only canonical IDs from `/Users/troyeffner/Dropbox/DEV/communityboard/uxos_foundation/09_Operationalization/communityboard_canonical_mapping.v1.json`.

## h_20260301_viewpoint_fairness_filter_signal
- Status: proposed
- Owner: PM
- Priority: p1

### Assumption
Users across differing viewpoints (e.g., Republican/Democrat communities) will distrust the platform if they perceive one viewpoint as suppressed in discovery surfaces.

### Problem to Solve
Current discovery signals may not reflect individual preference intent, leading some users to believe certain viewpoints or event types are systematically underrepresented.

### Opportunity
Create a transparent discovery model where users can intentionally combine filters (e.g., queer + music) and receive results ranked by those selected filter signals, improving trust, agency, and relevance.

### Hypothesis
If ranking includes transparent, user-selectable filter-level signals (in addition to item-level signals), users will report higher perceived fairness and find relevant events faster without reducing overall content quality.

### Intervention
- Introduce filter-level upvote/signal model as an experiment variant.
- Keep current item-level upvote ranking as control.

### Proposed Test
- Test type: controlled product experiment (A/B or staged rollout)
- Variants:
  - Control: current item-level upvote ranking only
  - Variant: filter-level signal weighting enabled

### Primary Success Metrics
1. Perceived fairness score (survey/intercept)
2. Task success rate for "find something to do tonight"
3. Median time-to-relevant-item

### Guardrail Metrics
1. Complaint rate by viewpoint category
2. Moderation incident rate
3. Diversity of surfaced items

### Fail Conditions
1. Increased viewpoint-suppression complaints
2. Measurable degradation in relevance or trust
3. Increased moderation escalations tied to ranking output

### Dependencies
- Taxonomy spec finalized (`wq_413`)
- Filter-level model spec finalized (`wq_414`)
- Fairness policy draft (`wq_415`)

### Evidence Artifacts
- Experiment brief
- Metric dashboard snapshot
- Fairness/risk memo
- Go/No-Go recommendation memo

### Decision Rule
Proceed only if primary metrics improve and no guardrail exceeds baseline by >10% adverse change.

## h_20260301_known_unknown_venue_model
- Status: proposed
- Owner: PM
- Priority: p1

### Assumption
Some contributions come from boards where the venue is known, while others are not yet identified, and this difference should be explicit in product behavior.

### Problem to Solve
When known and unknown venues are treated the same, users cannot tell whether missing venue context is unresolved data or intentional omission, which hurts trust and discovery.

### Opportunity
Model known/unknown venue state explicitly so unknown venues remain discoverable while creating a clear path to improve metadata quality over time.

### Hypothesis
If venue state is explicitly represented (known vs unknown) and reflected in browse/poster/builder surfaces, users will complete discovery tasks faster and venue metadata completion will improve without reducing submission volume.

### Intervention
- Define explicit known/unknown venue handling in IA and copy contracts.
- Introduce clear prompts to help identify unknown venues.

### Proposed Test
- Test type: staged rollout with before/after comparison
- Variants:
  - Control: current mixed venue handling
  - Variant: explicit known/unknown venue state shown across core surfaces

### Primary Success Metrics
1. Venue metadata completion rate
2. Median discovery time in browse/poster tasks
3. User trust score for location clarity

### Guardrail Metrics
1. Submission completion rate
2. Increase in moderation burden from venue disputes
3. Bounce rate on poster view pages with unknown venues

### Fail Conditions
1. Metadata completion does not improve
2. Discovery performance declines
3. Friction increases for contribution flow

### Dependencies
- Taxonomy/filter content spec (`wq_413`)
- Poster IA parity (`wq_403`)
- CTA canonical mapping completion (`wq_404`)

### Evidence Artifacts
- Known vs unknown venue IA/copy spec
- Browse/poster analytics before/after report
- Usability review summary with representative tasks

### Decision Rule
Proceed only if primary metrics improve and no guardrail worsens by more than 10% from baseline.

## Entry Template (copy/paste)
```md
## h_YYYYMMDD_slug
- Status: proposed
- Owner: PM
- Priority: p1

### Assumption
...

### Problem to Solve
...

### Opportunity
...

### Hypothesis
...

### Intervention
...

### Proposed Test
- Test type: ...
- Variants:
  - Control: ...
  - Variant: ...

### Primary Success Metrics
1. ...

### Guardrail Metrics
1. ...

### Fail Conditions
1. ...

### Dependencies
- wq_xxx

### Evidence Artifacts
- ...

### Decision Rule
...
```
