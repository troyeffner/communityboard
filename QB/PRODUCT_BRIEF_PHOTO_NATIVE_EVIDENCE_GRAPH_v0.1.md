---
type: document
from: communityboard-qb
date: 2026-03-10
status: active
topics: [qb, governance, documentation]
fractals: [communityboard]
cluster: qb-docs
---

# Product Brief: Photo-Native Evidence Graph (v0.1)

## Status
Draft for Chief standardization and cross-project portability.

## Executive Summary
Teams currently collect UX evidence in fragmented formats (notes, screenshots, comments, tickets) with weak structural linkage to assumptions, hypotheses, jobs-to-be-done, OOUX objects, and route-level implications. This creates analysis drift and slows decision quality.

This brief proposes a photo-native evidence system where users (PMs, researchers, engineers, field contributors) capture an image, drop pins, and attach structured observations that map to canonical frameworks.

## Problem Statement
1. Evidence is spatially rich but structurally poor: observations are rarely anchored to exact UI/field context.
2. Assumption/hypothesis mapping is often retrospective and manual.
3. Framework switching (JTBD vs OOUX vs IA vs risk) is slow.
4. Device-specific behavior is under-modeled in evidence intake.

## Opportunity
Create a single system where field capture becomes structured evidence that can be:
- queried by persona, framework, page, object, and device context
- clustered by repeated observations over time
- translated into prioritized work and measurable hypotheses

## Users / Personas
1. Public-facing PM / Product lead
2. Research owner (example lane: Matt)
3. Engineer or designer validating behavior in context
4. Chief/governance reviewer consuming decision-ready summaries

## Core Concept Model
### Primary Objects
1. Contribution (photo-first artifact)
- image/file
- contributed_at
- found_at/seen_at context
- contributed_by (future)

2. Pin
- x,y normalized coordinate in image space
- references Contribution

3. Observation
- typed annotation attached to Pin
- observation_type examples:
  - assumption
  - hypothesis
  - opportunity
  - problem
  - risk
  - object-note
  - job-note

4. Mapping Links
- Observation links to canonical IDs:
  - JTBD IDs
  - OOUX object/action/outcome IDs
  - page/route IDs
  - persona IDs
  - device_context IDs

5. Cluster
- aggregation of related observations across contributions
- supports trend detection and confidence signals

## Canon and Vocabulary
- Keep existing lock:
  - Item / Item type
  - Pin to board / Pinned
  - Seen at canonical field model
- For this brief: preserve "first contributed" provenance language in strategic narrative.

## In-Scope MVP (Governance/Data Layer)
1. Structured intake model (photo + pin + typed observation)
2. Canonical mapping requirement (observation must map to at least one framework ID)
3. Persona + device context filtering
4. Desired Outcomes as first-class records linked to hypotheses, flows, pages, and personas
5. Framework switching views:
- JTBD
- OOUX
- Page IA
- Desired Outcomes
- Governance/Risk
- Release readiness
6. Task-flow linkage from observations to work queue

## Out of Scope (Now)
1. Runtime app UI overhaul
2. Automated clustering/ML
3. Cross-project sync automation
4. Identity/permissions hardening beyond current governance assumptions

## Data Contract (PoC-aligned)
Leverage and extend current PoC structure in `QB/poc`:
- hypotheses
- desired_outcomes
- task_flows + task_flow_steps
- persona_* mappings
- hypothesis_* mappings
- device_context mappings

Add future tables (conceptual):
- contributions
- pins
- observations
- observation_mappings
- clusters

## Example Workflow
1. Field contributor uploads screenshot/photo.
2. Drops pin on UI element/location.
3. Adds observation: "Assumption: mobile users miss primary workspace because filter panel is expanded."
4. Maps observation to:
- `job_discover_board_items`
- `obj_community_board`
- `/browse`
- `persona_public_viewer`
- `dc_mobile_touch_small_good`
5. Observation appears in framework views and queue recommendation outputs.

## Success Metrics
1. Time-to-structured-insight from capture
2. % observations mapped to canonical IDs
3. % hypotheses with direct observation evidence
4. Reduction in unmapped backlog items
5. Decision latency reduction for go/no-go on major UX changes

## Risks and Mitigations
1. Taxonomy overload
- Mitigation: minimum required fields + progressive enrichment
2. Mapping inconsistency
- Mitigation: canonical ID picklists only
3. Governance drift
- Mitigation: QB phase-2 loop and release gates
4. Ownership ambiguity
- Mitigation: codify research owner lane conventions (`wq_419`)

## Rollout Plan (Phased)
### Phase 0 (Completed PoC groundwork)
- Hypothesis mapping DB
- Task-flow table
- Persona/device context filtering

### Phase 1
- Define observation schema and mapping constraints
- Add observation intake template and checklist in QB

### Phase 2
- Connect design/page changes to hypothesis refresh loop (operationalize `wq_418`)
- Require observation evidence in dispatch acceptance for high-impact UI changes

### Phase 3
- Standardize for cross-project adoption under Chief governance

## Dependencies
- `wq_418`: operationalize phase-2 loop
- `wq_419`: research owner lane conventions
- Existing canonical ID source in `uxos_foundation/09_Operationalization/communityboard_canonical_mapping.v1.json`

## Chief Handoff Notes
This brief is intentionally architecture-first and UI-agnostic so Chief can standardize it across projects. It extends the current governance system rather than replacing runtime product architecture.
