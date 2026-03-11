# UXOS Epistemic Layer: Assumptions vs Hypotheses

## Definitions
- **Assumption**: A versioned belief about reality that shapes decisions (actor, job, problem, need, context, capability, system). It may be broad, may be untested early, and must remain traceable to canonical entities.
- **Hypothesis**: A falsifiable prediction derived from one or more assumptions. It must include an intervention, metric, success threshold, and timeframe (or an explicit instrumentation gap reason).
- **Experiment**: A planned or executed test that evaluates one or more hypotheses and emits evidence.
- **Evidence**: Structured signal (qualitative or quantitative) that supports or contradicts assumptions/hypotheses and updates epistemic confidence/risk.

## Lifecycle by Phase
- **Discovery**: Assumptions dominate. Teams capture reality claims and link them to canonical entities.
- **Exploration**: Assumptions are refined; selected assumptions convert into testable hypotheses.
- **Delivery**: Hypotheses dominate. Interventions are tested against explicit metrics/timeframes.
- **Post-release**: Evidence is ingested; assumption confidence/risk is updated; canon is revised through versioned changes.

Epistemic loop:
- `assumption -> informs -> hypothesis -> tested_by -> experiment -> produces -> evidence -> updates -> assumption`

## Data Model
- Epistemic entities are first-class, versioned records.
- Assumptions and hypotheses are graph-linked to canonical entities (`job`, `actor`, `object`, `page`, `capability`, `outcome`, `thread`).
- Transport JSON uses `snake_case`; internal TypeScript contracts use `camelCase`.
- Required primitives:
  - Assumption
  - Hypothesis
  - Experiment
  - Evidence
  - Edge

## Graph Edges
- Required edge types:
  - `informs`
  - `tested_by`
  - `produces`
  - `updates`
  - `supports`
  - `contradicts`
  - `depends_on`
  - `conflicts_with`
- Edge fields:
  - `from_id`
  - `to_id`
  - `type`
  - `created_version_id`
  - `metadata` (optional)

## Governance Rules
1. Every hypothesis must link to at least one assumption.
2. Every experiment must link to at least one hypothesis.
3. A hypothesis cannot transition to `confirmed`, `rejected`, or `inconclusive` without at least one linked evidence object.
4. An assumption can enter `canon` only when all are true:
   - `linked_entities` is non-empty.
   - `risk` and `confidence` are set.
   - At least one `evidence_ref` exists **or** `evidence_pending_reason` is provided.
5. All epistemic updates are versioned; locked canon prohibits direct mutation outside approved changesets.

## Drift Detection
- Trigger: linked canonical entity changes (rename, removal, semantic change).
- Action:
  - Mark related assumptions/hypotheses `needs_review = true`.
  - Emit drift event with impacted entity IDs and edge paths.
  - Require review before promoting related records to `canon` or merging high-impact changes.

## MVP Scope
- In scope:
  - Assumption/hypothesis/experiment/evidence CRUD
  - Typed edge graph
  - Lifecycle states
  - Governance checks (rules 1-5)
  - Drift flagging via linked canonical entity changes
  - Version linkage on all epistemic records and edges
- Out of scope (MVP):
  - Automated experiment design
  - Bayesian scoring engines
  - Causal inference beyond explicit evidence links
