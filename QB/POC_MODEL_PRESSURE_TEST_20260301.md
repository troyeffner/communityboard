---
type: document
from: communityboard-qb
date: 2026-03-10
status: active
topics: [qb, governance, documentation]
fractals: [communityboard]
cluster: qb-docs
---

# PoC Model Pressure Test (2026-03-01)

## What this pass checked
1. Artifact placement across `QB/`, `docs/`, and `uxos_foundation/`
2. Whether we can switch framework lenses quickly (JTBD, OOUX, IA, governance risk, release readiness)
3. Whether we can filter/sort by persona and see implications

## Placement verdict
### Correctly placed
- Governance runtime state: `QB/status.json`
- Decisions/rationale: `QB/DECISION_LOG.md`
- Execution queue: `QB/WORK_QUEUE.md`
- Human hypothesis narrative: `QB/HYPOTHESIS_REGISTER.md`
- Machine-readable hypothesis mapping: `QB/HYPOTHESIS_MAPPING_DB.v1.json`
- Canon IDs + canonical mapping: `uxos_foundation/09_Operationalization/communityboard_canonical_mapping.v1.json`
- Strategy canon narratives: `docs/product-dev/strategy/*`

### Watchlist (not blocking, but important)
- Duplicate conceptual narratives can drift across `docs/ooux-artifacts.md` and `uxos_foundation/*` if edits are not routed through one canonical path.
- Research ownership lanes are now identified as a governance gap; queue item `wq_419` covers codification.
- Phase 2 feedback loop is now stubbed but not operationalized (`wq_418`).

## PoC data system created
Folder: `/Users/troyeffner/Dropbox/DEV/communityboard/QB/poc`

Artifacts:
- `schema.sql` (normalized PoC tables)
- `seed.sql` (populated with known hypotheses, jobs, OOUX entities, pages, blockers, work items, personas)
- `proof_queries.sql` (framework/persona switch queries)
- `proof_results.txt` (query outputs)
- `communityboard_poc.db` (SQLite database)
- `TASK_FLOW_TABLE.md` (human-readable flow table linked to hypotheses/personas)

## Tables populated (what we know so far)
- frameworks: 5
- personas: 3
- hypotheses: 4
- jobs: 6
- pages: 7
- ooux_objects: 8
- ooux_actions: 16
- ooux_outcomes: 5
- desired_outcomes: 5
- capabilities: 12
- blockers: 13
- work_items: 11
- task_flows: 5
- task_flow_steps: 14
- persona_task_flow: 6
- hypothesis_task_flow: 5
- device_context: 4
- persona_device_context: 6
- hypothesis_device_context: 9
- task_flow_device_context: 10
- hypothesis_desired_outcome: 5
- task_flow_desired_outcome: 5
- persona_desired_outcome: 7
- page_desired_outcome: 7
- plus mapping tables linking hypotheses <-> jobs/pages/ooux/capabilities/blockers/work-items and personas <-> jobs/pages/hypotheses

## Pressure-test result
### Success criteria requested
- Switch between different frameworks easily
- See implications in different models easily
- Basic filter for each persona

### Result
- PASS (PoC level)

Evidence:
1. Framework switch query (`fw_jtbd`) returns hypothesis implications + affected jobs.
2. Framework switch query (`fw_page_ia`) returns hypothesis implications + affected routes.
3. Persona filters work for:
   - Public viewer
   - Public submitter
   - Community builder
4. Persona->hypothesis matrix shows which hypotheses matter to each persona.
5. Persona->task flow query shows role-specific journeys and priority ordering.
6. Persona->device-context query supports basic persona filtering by device class/input/viewport.
7. Hypothesis->task flow mapping ties assumptions/hypotheses to concrete user flows.
8. Hypothesis->device-context and flow->device-context mappings expose screen/device implications explicitly.
9. Desired outcome mappings are queryable across hypotheses, personas, pages, and task flows.
10. Hypothesis drilldown shows linked blockers and queue dependencies.

## Example queries to run
```bash
sqlite3 /Users/troyeffner/Dropbox/DEV/communityboard/QB/poc/communityboard_poc.db < /Users/troyeffner/Dropbox/DEV/communityboard/QB/poc/proof_queries.sql
```

## Next step to make this production-usable
1. Treat this PoC DB as analytics/governance model only (not app runtime source).
2. Add a tiny exporter that syncs `QB/status.json`, `QB/WORK_QUEUE.md`, and `QB/HYPOTHESIS_MAPPING_DB.v1.json` into this DB.
3. Add persona-specific dashboard views to Chief reporting output.
4. Complete `wq_418` and `wq_419` before expanding hypothesis count.
