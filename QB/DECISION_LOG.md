---
type: decision-log
from: communityboard-qb
date: 2026-03-10
status: active
topics: [governance, decisions, release-readiness, architecture]
fractals: [communityboard]
cluster: qb-governance
---

# QB Decision Log

## 2026-03-01
- Decision: Adopt Chief/PM/QB operating model and Chief Operating Addendum v1.
- Rationale: Establish enforceable governance, release safety, and decision traceability.
- Impacted files/routes: QB governance docs and scripts.
- Owner: Chief of Staff.

## 2026-03-01 — Concerns on current ways of working (for Chief review)
- Concern: Plan/execution gap risk.
  - Recommendation: Enforce "no new strategy work until P0 runtime blockers close."
  - Operational impact: Reduces churn and prevents parallel drift while blockers remain unresolved.
- Concern: Status signal drift risk.
  - Recommendation: Require `QB/status.json` blocker sync before daily report generation.
  - Operational impact: Ensures Chief receives truthful operating status and sequencing decisions.
- Concern: Cross-thread terminology drift risk.
  - Recommendation: Add mandatory vocabulary QA in dispatch acceptance for all affected surfaces.
  - Operational impact: Prevents repeated UX/copy regressions and lowers rework cycles.
- Concern: Schema parity not consistently treated as hard release precondition.
  - Recommendation: Block release when `/api/health/schema` is not `ok: true` in both DEV and PROD.
  - Operational impact: Avoids production runtime failures tied to environment drift.
- Concern: Dual-model runtime risk (`poster_items` + legacy fallback).
  - Recommendation: Approve explicit deprecation timeline with owner/date and adapter boundaries.
  - Operational impact: Lowers data contract ambiguity and regression risk over time.

## 2026-03-01
- Decision: CommunityBoard will run as Pilot Source for interactive marketing/survey pages feeding SmallBiz productization.
- Rationale: validate behavior quickly with production-like surfaces and transfer reusable modules with evidence.
- Impacted files/routes: marketing/public surfaces, CTA instrumentation, alignment scans, pilot transfer notes.
- Owner: CommunityBoard PM.

## 2026-03-01 — Product area capture: taxonomy + filter-vote direction
- Decision: Track taxonomy/filter-pill content specification as a dedicated product workstream.
- Rationale: Filter quality and naming consistency are now core to discovery and must be defined before scaling filter interactions.
- Impacted files/routes: `/browse`, `/poster/[id]`, future taxonomy/copy artifacts.
- Owner: PM.

- Decision: Track filter-level upvote model as a candidate direction for community disagreement/personal preference handling.
- Rationale: Item-only upvotes do not capture user intent across preference dimensions (e.g., queer + music). Filter-level signals may improve relevance and user agency.
- Impacted files/routes: discovery ranking model, filter interaction model, moderation/governance policy.
- Owner: PM.

## 2026-03-01 — Fairness risk clarification: partisan visibility
- Decision: Track partisan visibility fairness as a first-class governance/product risk area.
- Rationale: Perceived suppression of one political viewpoint (e.g., Republican or Democrat events not visible) can undermine platform trust and legitimacy.
- Operational impact: Requires explicit neutrality policy, ranking transparency, representation telemetry, and escalation path for complaints.
- Owner: PM.

## 2026-03-01 — Epistemic action: fairness concern to testable hypothesis
- Decision: Convert partisan visibility concern into a formal assumption + hypothesis test.
- Rationale: Governance-sensitive concerns should be validated through measurable evidence rather than opinion-only debate.
- Impacted files/routes: QB/HYPOTHESIS_REGISTER.md, discovery ranking and filter model planning.
- Owner: PM.

## 2026-03-01 — Register expansion: assumption/hypothesis/opportunity/problem lenses
- Decision: Expand QB hypothesis register to a multi-lens model so one initiative can be represented as assumption, problem, opportunity, and hypothesis in a single row/spec.
- Rationale: Reduces translation overhead and ambiguity during planning and dispatch.
- Operational impact: Faster spec alignment, clearer experiment setup, and more consistent Chief reporting.
- Owner: PM.

## 2026-03-01 — Artifact placement review + Phase 2 loop stub
- Decision: Confirm current artifact placement model and add a Phase 2 learning-loop stub before runtime implementation.
- Rationale: Governance artifacts are mostly well-located, but research ownership lanes and iteration-loop triggers were implicit.
- Operational impact: Added explicit placement guidance in `QB/ARTIFACT_PLACEMENT_REVIEW_20260301.md` and future-loop structure in `QB/PHASE2_LEARNING_LOOP_STUB.md`; queued operationalization tasks (`wq_418`, `wq_419`).
- Owner: PM.

## 2026-03-01 — Governance model-switching PoC completed
- Decision: Run a SQLite proof-of-concept to pressure-test cross-framework switching and persona filtering using current known data.
- Rationale: Validate that hypotheses can be mapped to JTBD, OOUX, and pages and queried from multiple lenses before deeper system rollout.
- Operational impact: Added populated PoC artifacts under `QB/poc/` and results summary in `QB/POC_MODEL_PRESSURE_TEST_20260301.md`; marked `wq_420` completed.
- Owner: PM.

## 2026-03-01 — Task-flow table established and linked
- Decision: Add a canonical task-flow layer to connect assumptions/hypotheses to concrete user journeys and persona filters.
- Rationale: We needed direct flow-level traceability to pressure-test implications across frameworks and personas.
- Operational impact: Added task-flow tables and mappings in `QB/poc/communityboard_poc.db` plus `QB/TASK_FLOW_TABLE.md`; marked `wq_421` completed.
- Owner: PM.

## 2026-03-01 — Device context factored into hypothesis/flow model
- Decision: Add device context as a first-class filter dimension in the governance PoC model.
- Rationale: Hypotheses and IA behavior are materially device-dependent (mobile/touch/viewport/network), and this needs explicit query support.
- Operational impact: Added and seeded device-context tables and links (`device_context`, `persona_device_context`, `hypothesis_device_context`, `task_flow_device_context`), updated proof queries/results, and marked `wq_422` completed.
- Owner: PM.

## 2026-03-01 — Chief handoff product brief packaged
- Decision: Package a Chief-ready product brief for cross-project standardization of a photo-native evidence graph model.
- Rationale: Current governance foundation is sufficient to define a reusable model that links photo/pin observations to JTBD/OOUX/pages/personas/devices.
- Operational impact: Added `QB/PRODUCT_BRIEF_PHOTO_NATIVE_EVIDENCE_GRAPH_v0.1.md`; marked `wq_423` completed.
- Owner: PM.

## 2026-03-01 — Desired Outcomes refactored to first-class layer
- Decision: Promote Desired Outcomes from implicit outcome references to explicit first-class records in the governance model.
- Rationale: Outcomes are a core decision lens and must be queryable across hypotheses, personas, pages, and task flows.
- Operational impact: Added desired-outcome tables and mappings in PoC, updated hypothesis mapping schema and flow table references, extended proof queries with desired-outcome lens; marked `wq_424` completed.
- Owner: PM.

## 2026-03-01 — Chief ingest package consolidated and updated
- Decision: Publish a single consolidated Chief ingest package with ordered read path and updated standardization targets.
- Rationale: Prior handoff content was distributed across multiple artifacts without one canonical package index.
- Operational impact: Added `QB/CHIEF_INGEST_PACKAGE_20260301.md` and dispatch prompt `QB/dispatch/chief_ingest_package_update_20260301.md`; marked `wq_425` completed.
- Owner: PM.

## 2026-03-01 - FFA compaction rollout
- Decision: Enable QB-native `compact` command and FFA compaction policy for this repo.
- Rationale: Keep conversation history operationally clean by retaining only durable, linked, versioned FFA updates.
- Impacted files/routes: `QB/qb`, `QB/scripts/qb_compact.sh`, `QB/policies/ffa_compaction_policy.md`, `QB/README.md`.
- Owner: QB
- Status: Adopted.

## 2026-03-01 — Product area capture: known venues vs unknown venues
- Decision: Track known/unknown venue handling as a first-class product/governance workstream.
- Rationale: Venue identity is often incomplete at contribution time and needs explicit semantics for trust, discovery quality, and metadata improvement loops.
- Operational impact: Added hypothesis `h_20260301_known_unknown_venue_model` and queue item `wq_426` to define IA/copy/interaction rules across `/browse`, `/poster/[id]`, and `/builder/create`.
- Owner: PM.

## 2026-03-01 — Product area capture: place taxonomy + IA unification
- Decision: Track a dedicated taxonomy/IA task to unify place concepts (`venue`, `coffee shop`, `found at`, `seen at`) into one coherent place model.
- Rationale: Current language mixes place roles (capture place vs event venue vs business place), creating drift in copy, filters, and page hierarchy.
- Operational impact: Added queue item `wq_427` to define canonical place taxonomy, naming precedence, and page-level IA application contract.
- Owner: PM.

## 2026-03-01 — Coach dispatch: FFA layered inheritance ingest
- Decision: Ingested FFA layered inheritance policy and aligned local instance metadata to portfolio mapping.
- Rationale: Coach dispatch required local FFA instance to explicitly declare layer/parent/classification and match portfolio status.
- Operational impact:
  - Added `/Users/troyeffner/Dropbox/DEV/communityboard/uxos_foundation/08_Data_Model_and_API_Contracts/ffa_instance.json`.
  - Instance now matches portfolio map: `client_instance` -> parent `smallbiz_ffa_domain_template@smallbiz_ffa_domain_v0.1`.
  - Variance was present at check time (missing file) and is now remediated in the same cycle.
- Owner: COMMUNITYBOARD PM.

## 2026-03-01 — PM status update (Coach dispatch execution)
- Decision: Re-synced QB operational status and regenerated daily report per dispatch.
- What changed since last report:
  - Added venue-knownness track (`h_20260301_known_unknown_venue_model`, `wq_426`, blocker `b16`).
  - Added place-taxonomy/IA track (`wq_427`, blocker `b17`).
  - Regenerated `QB/report_20260301.md` and validated `qb check`.
- Current top 3 priorities:
  1. `wq_401` Schema parity for `seen_at_name` in DEV/PROD.
  2. `wq_409` Upvote design/process activation with production verification.
  3. `wq_402` Vocabulary lock on core routes and user-facing copy.
- Key risk needing Chief attention:
  - Competing vocabulary/model tracks may outpace runtime closure; maintain strict P0-first sequencing to prevent additional drift.
- Owner: PM.

## 2026-03-01 — Policy re-read acknowledgment (Coach directive)
- Decision: Re-read required QB and UXOS governance policies and confirm operational compliance baseline.
- Files acknowledged:
  - `QB/README.md`
  - `QB/policies/pm_hybrid_update_policy.md`
  - `QB/policies/pm_to_pm_handoffs.md`
  - `QB/policies/local_overrides.md`
  - `QB/RELEASE_GATE_CHECKLIST.md`
  - `QB/AUTONOMY_MATRIX.md`
  - `/Users/troyeffner/Dropbox/DEV/UXOS/07_Strategy_Canon_Artifacts/QB_PM_OPERATING_POLICY.md`
  - `/Users/troyeffner/Dropbox/DEV/UXOS/07_Strategy_Canon_Artifacts/CHIEF_OPERATING_ADDENDUM_V1.md`
  - `/Users/troyeffner/Dropbox/DEV/UXOS/07_Strategy_Canon_Artifacts/PM_TO_PM_QB_HANDOFF_POLICY.md`
  - `/Users/troyeffner/Dropbox/DEV/UXOS/07_Strategy_Canon_Artifacts/MARKETING_TELEMETRY_OPERATING_STANDARD.md`
- Compliance note:
  - No new policy blockers added beyond active runtime blockers already tracked in `QB/status.json`.
- Owner: PM.

## 2026-03-01
- Decision: Deliver current-cycle SmallBiz transfer packet to satisfy productization intake contract.
- Rationale: unblock SmallBiz intake gate and provide explicit promote/defer recommendation with evidence status.
- Impacted files/routes: `QB/dispatch/smallbiz_transfer_packet_20260301.md`.
- Owner: CommunityBoard PM.

## 2026-03-01
- Decision: FFA layered inheritance instance initialized.
- Rationale: align communityboard with portfolio FFA inheritance model and clean template separation.
- Impacted files/routes: `08_Data_Model_and_API_Contracts/ffa_instance.json`.
- Owner: COMMUNITYBOARD PM.

## 2026-03-01 — Ship lane lock + distraction capture protocol
- Decision: Execute strict production ship lane in order: `wq_401 -> wq_402 -> wq_403 -> wq_406 -> wq_409`.
- Rationale: Reduce thrash and ship safely by closing blocking/runtime-critical issues first.
- Protocol: Any new idea outside this lane is captured to FFA/QB artifacts (hypothesis + queue item) and deferred from execution until ship lane clears.
- Owner: PM.

## 2026-03-01 — Ship lane execution update: wq_401 blocked by schema parity failure
- Decision: Marked `wq_401` as blocked after running DEV/PROD schema health checks.
- Evidence:
  - DEV `/api/health/schema` => `{"ok":false,"missing":["poster_uploads.seen_at_name"]}`
  - PROD `/api/health/schema` => `{"ok":false,"missing":["poster_uploads.seen_at_name"]}`
- Operational impact: Cannot proceed to `wq_402+` until migration is applied to both environments and health checks return `ok:true`.
- Artifact: `QB/dispatch/wq_401_schema_parity_blocker_20260301.md`
- Owner: PM.

## 2026-03-01 — MVP scope confirmation: collapsible/collapsed browse panel
- Decision: Confirmed mobile browse panel default-collapsed behavior is in MVP scope.
- Operational impact: `wq_412` explicitly marked `[MVP]` in queue and retained in planned sequence after current ship-lane P0 closure.
- Owner: PM.

## 2026-03-01 — Design capture: poster-view labeling and details-card cleanup
- Decision: Capture latest poster-view design direction as explicit MVP tasking rather than ad-hoc implementation.
- Requirements captured:
  - Header should present seen-at and location context.
  - Browse panel should support collapsed default behavior.
  - Center panel title should reflect selected item type/name (replacing generic workspace naming).
  - Right rail title should reflect item details context.
  - Remove upvote button from poster details cards for now.
  - Improve spacing/typography for `Add to Google Calendar` and `Download .ics` links.
- Operational impact:
  - Added `wq_428` for focused implementation after current unblock steps.
  - Marked scope tension with `wq_409` (upvote activation) for PM/Coach resolution before execution.
- Owner: PM.

## 2026-03-01 — MVP guardrail: mobile friendliness error scan only
- Decision: Add a constrained mobile QA pass focused on errors/egregious issues only, with no redesign scope.
- Rationale: Improve ship confidence on mobile without reopening sizing/pattern decisions.
- Operational impact: Added `wq_429` with explicit no-redesign guardrail and iPhone 13+ target checks.
- Owner: PM.

## 2026-03-01 - Bidirectional FFA-plan alignment rollout completed
- Decision: Completed deployment of FFA-plan alignment enforcement (`ffa-plan-sync`) and validated passing checks/reports.
- Rationale: Ensure every FFA change projects into planning and every active plan item is tied back to FFA or explicit no-impact rationale.
- Impacted files/routes: `QB/qb`, `QB/scripts/qb_check.sh`, `QB/scripts/qb_report.sh`, `QB/scripts/qb_ffa_plan_sync.sh`, `QB/PLAN_ALIGNMENT_STATE.json`, `QB/WORK_QUEUE.md`, `QB/report_20260301.md`.
- Owner: Coach/QB
- Status: Adopted and verified.

## 2026-03-01 — FFA epistemic_state rollout completed
- Decision: Ran `ffa-state-migrate` and confirmed epistemic state policy is present for root and nested FFA instances.
- Rationale: enforce shared epistemic-state semantics (`seed|hypothesis|stabilized`) as required by Coach rollout.
- Impacted files/routes:
  - `08_Data_Model_and_API_Contracts/ffa_instance.json`
  - `uxos_foundation/08_Data_Model_and_API_Contracts/ffa_instance.json`
  - `QB/report_20260301.md`
- Owner: Coach/QB
- Status: Adopted and verified.

## 2026-03-01 — Bidirectional FFA-plan alignment v1 enforced
- Decision: Confirmed `ffa-plan-sync` alignment state is `aligned` with zero missing bindings.
- Rationale: satisfy Coach acceptance criteria for cross-repo plan/FFA contract enforcement.
- Impacted files/routes:
  - `QB/PLAN_ALIGNMENT_STATE.json`
  - `QB/WORK_QUEUE.md`
  - `QB/report_20260301.md`
- Owner: Coach/QB
- Status: Adopted and verified.

## 2026-03-01 - OST first-class in FFA adopted
- Decision: Adopted Opportunity Solution Tree primitives as first-class FFA structures linked to desired outcomes.
- Rationale: Keep opportunity/solution planning directly traceable to desired outcomes, jobs, and execution artifacts.
- Impacted files/routes: `08_Data_Model_and_API_Contracts/ffa_instance.json`, `QB/scripts/qb_check.sh`, `QB/report_YYYYMMDD.md`.
- Owner: Coach/QB
- Status: Adopted and verified.

## 2026-03-01 — Ship lane execution update: create selection parity + build verification
- Decision: Applied in-place item selection behavior on `/builder/create` to match poster/browse parity.
- Change: Item cards no longer reorder when selected; selected card auto-scrolls into view.
- Change: Builder copy aligned to `Seen at` in core create workflows.
- Verification: `npm run build` and `npm run lint` both pass (lint warnings only; no errors).
- Operational impact: `wq_406` implementation coverage expanded to `/builder/create`; visual QA still required before marking complete.
- Blocker unchanged: `wq_401` remains blocked until `seen_at_name` migration is applied in DEV and PROD.

## 2026-03-02 — Coach update return packet issued after compaction
- Decision: Issued compact Coach return packet with current ship-state, blocker evidence, and explicit unblock request.
- Artifact: `QB/dispatch/coach_qb_update_return_20260302.md`
- Verification: `./QB/qb check` passed; `QB/report_20260302.md` generated.
- Blocker unchanged: `wq_401` schema parity remains blocking.

## 2026-03-01 — New production usability blocker captured: 1MB submit upload failure
- Decision: Captured reported production issue where uploading a ~1MB photo on `/submit` fails, and elevated it to a release blocker.
- Queue: Added `wq_430` (P0, blocked) to investigate and fix upload path reliability.
- Blockers: Added `b19` to `QB/status.json`.
- Acceptance required: successful upload for ~1MB image on production via both camera and photo-picker flows, with evidence capture.
- Notes: likely intersects with current schema parity blocker (`wq_401`), so repro+logs are required to isolate root cause.

## 2026-03-02
- Decision: Local domain + offline continuity protocols auto-adopted across QB operations.
- Rationale: Remove manual handoff dependency and keep PM execution aligned by default.
- Impacted files/routes: QB/LOCAL_DOMAIN.json, QB/WEB_CAPTURE_TARGETS.json, QB/scripts/qb_check.sh, QB/scripts/qb_report.sh, QB/policies/local_domain_and_offline_continuity_protocol.md.
- Owner: Coach

## 2026-03-02
- Decision: Adopted first-run check-updates full-refresh flow.
- Rationale: Ensure WoW baseline and operating components refresh before every update cycle.
- Impacted files/routes: QB check-updates flow artifacts (`wow_refresh_20260302.md`, `update_summary_20260302.md`).
- Owner: QB

## 2026-03-03 — Schema audit: seen_at_name confirmed in PROD, health check false negative
- Decision: `seen_at_name` column confirmed present in production DB via direct SQL. Health check `/api/health/schema` returns false negative because `supabase.schema('information_schema')` via PostgREST likely lacks permission to query `information_schema.columns`. Health check route needs to use raw SQL or RPC instead.
- Operational impact: wq_401 blocker is a health-check-route bug, not a missing column. Unblocks ship lane.
- Owner: QB.

## 2026-03-03 — Root cause identified: poster_status enum mismatch causes upload failures (wq_430)
- Decision: Code writes status `'new'` on upload, but DB poster_status enum only has `uploaded, processing, needs_review, failed, published`. INSERT fails. Same issue for `'tending'` and `'done'`/`'processed'`. This is the root cause of wq_430.
- Resolution path: Update DB enum to add `new, tending, done` (less code churn than rewriting all status references). Pending Troy's approval.
- Owner: QB.

## 2026-03-03 — event_status 'unpublished' causes visible error on /manage
- Decision: Manage page queries for status `'unpublished'` which doesn't exist in DB event_status enum (`draft, published, archived`). Produces red error text on page load. Fix: replace `'unpublished'` references with `'draft'` in manage queries.
- Owner: QB.

## 2026-03-03 — Style consolidation over component library
- Decision: CommunityBoard does not need a managed component library. The audit found style drift between globals.css and ui-alignment.css (conflicting values for same classes, 4 different selection colors, hardcoded values vs tokens). Resolution is CSS consolidation, not component abstraction.
- Rationale: Standalone product with 7 pages and ~5 component patterns. Only ItemCard.tsx is genuinely shared. Over-engineering with a component library would add maintenance overhead without proportional value.
- Owner: QB.

## 2026-03-03 — Full audit completed: 10 bugs, content/vocab gaps, style drift cataloged
- Decision: Completed comprehensive bug review, content audit, component standardization audit, and CSS audit. Key findings: 2 enum mismatches (poster_status, event_status), health check false negative, 7 "Found at" vocabulary violations on /manage, "Event at" hardcoded where item-type-aware label needed, 4 conflicting selection state colors, CSS duplication between globals.css and ui-alignment.css.
- Owner: QB.

## 2026-03-05 — Corrected Supabase project IDs and re-applied migrations
- Decision: Previous session's poster_status enum migrations were applied to wrong Supabase project ID (`kfysfanfpdoopjqlayvq` — does not exist in project list). Correct IDs: **prod = `lybjnpuohkiklwyabmlr`**, **dev = `cykezapmsegygbzzrjwj`**. Re-applied both migrations (add enum values + set default) to correct instances. Verified via SQL query.
- Owner: QB.

## 2026-03-05 — Added is_done column to fix deployed upload failure
- Decision: Production upload failing with "Upload storage is not ready yet" because deployed code (old GitHub version) inserts with `is_done: false` but column doesn't exist. Error code 42703 caught by overbroad `missingSeenAtName` check which matches ANY missing column, not just `seen_at_name`. Fix: added `is_done boolean NOT NULL DEFAULT false` to both prod and dev. The local code (new 9-candidate fallback loop) handles this gracefully, but deployed code does not.
- Operational impact: Upload should work on production immediately. Code push still needed to deploy the improved fallback logic.
- Owner: QB.
