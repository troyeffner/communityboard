---
type: document
from: communityboard-qb
date: 2026-03-10
status: active
topics: [qb, governance, documentation]
fractals: [communityboard]
cluster: qb-docs
---

# Chief Ingest Package (2026-03-01)

## Purpose
Consolidated package for Chief review, standardization, and cross-project rollout.
This updates and supersedes prior fragmented handoff artifacts by providing one ordered ingestion path.

## FFA Contract
- `FFA` means **Foundational Framework Artifacts**.
- Hypotheses are first-class FFA artifacts and are required in the ingest package.
- Canonical hypothesis artifacts for this package:
  - `/Users/troyeffner/Dropbox/DEV/communityboard/QB/HYPOTHESIS_REGISTER.md`
  - `/Users/troyeffner/Dropbox/DEV/communityboard/QB/HYPOTHESIS_MAPPING_DB.v1.json`

## Read Order (Required)
1. `/Users/troyeffner/Dropbox/DEV/communityboard/QB/status.json`
2. `/Users/troyeffner/Dropbox/DEV/communityboard/QB/PLAN_20260301_PRODUCTION_READINESS.md`
3. `/Users/troyeffner/Dropbox/DEV/communityboard/QB/ARTIFACT_PLACEMENT_REVIEW_20260301.md`
4. `/Users/troyeffner/Dropbox/DEV/communityboard/QB/PHASE2_LEARNING_LOOP_STUB.md`
5. `/Users/troyeffner/Dropbox/DEV/communityboard/QB/PRODUCT_BRIEF_PHOTO_NATIVE_EVIDENCE_GRAPH_v0.1.md`
6. `/Users/troyeffner/Dropbox/DEV/communityboard/QB/HYPOTHESIS_REGISTER.md`
7. `/Users/troyeffner/Dropbox/DEV/communityboard/QB/HYPOTHESIS_MAPPING_DB.v1.json`
8. `/Users/troyeffner/Dropbox/DEV/communityboard/QB/TASK_FLOW_TABLE.md`
9. `/Users/troyeffner/Dropbox/DEV/communityboard/QB/POC_MODEL_PRESSURE_TEST_20260301.md`
10. `/Users/troyeffner/Dropbox/DEV/communityboard/QB/WORK_QUEUE.md`
11. `/Users/troyeffner/Dropbox/DEV/communityboard/QB/DECISION_LOG.md`

## What Is Now Standardized in This Package
1. Governance control loop in QB (status, queue, decisions, release gates).
2. Machine-readable hypothesis mapping to canonical JTBD/OOUX/pages.
3. Task-flow table linked to hypotheses, assumptions, and personas.
4. Device context as first-class filter dimension.
5. Desired Outcomes as first-class records linked to hypotheses/personas/pages/flows.
6. Chief-ready product brief for photo-native evidence graph standardization.

## Current State
- Completed governance model PoC: PASS (framework switching + persona filters + device filters + desired outcomes).
- Runtime product issues still tracked separately via blockers and queue (`wq_401`..).
- This package is governance/data-system scope only; no runtime schema or UI deployment implied.

## Standardization Targets for Chief
1. Adopt `HYPOTHESIS_MAPPING_DB.v1.json` pattern across projects.
2. Require `TASK_FLOW_TABLE` equivalent per project.
3. Require `device_context` and `desired_outcomes` dimensions in project governance models.
4. Enforce Phase 2 loop before major UI dispatches.
5. Enforce research owner lane convention in work queues.

## Open Governance Items (Not Yet Completed)
- `wq_418`: operationalize Phase 2 checklist into dispatch template usage.
- `wq_419`: codify research owner lane conventions (e.g., Matt-owned research tasks).

## PoC Data Package
Folder:
- `/Users/troyeffner/Dropbox/DEV/communityboard/QB/poc`

Included:
- schema: `schema.sql`
- seed data: `seed.sql`
- proof queries: `proof_queries.sql`
- proof output: `proof_results.txt`
- db: `communityboard_poc.db`
- how-to: `README.md`

## Acceptance Signal for Chief Ingest
Package accepted when Chief confirms:
1. Read order completed.
2. Standardization targets approved (or revised) for cross-project policy.
3. Decision recorded with rollout owner/date.
