# CommunityBoard UXOS Gap Audit (Initial)

Generated: 2026-02-28  
Scope: checklist steps 1-5 (`FOUNDATION_APPLY_CHECKLIST.md`)

## Completed In This Pass
- Canonical ID mapping created:
  - [`communityboard_canonical_mapping.v1.json`](/Users/troyeffner/Dropbox/DEV/communityboard/uxos_foundation/09_Operationalization/communityboard_canonical_mapping.v1.json)
- Epistemic ingest draft created:
  - [`communityboard_epistemic_ingest.v1.json`](/Users/troyeffner/Dropbox/DEV/communityboard/uxos_foundation/09_Operationalization/communityboard_epistemic_ingest.v1.json)
- Metaphor/public copy ingest draft created:
  - [`communityboard_metaphor_copy_ingest.v1.json`](/Users/troyeffner/Dropbox/DEV/communityboard/uxos_foundation/09_Operationalization/communityboard_metaphor_copy_ingest.v1.json)
- First blocking audit completed (below).

## Blocking Issues (Open First)
### 1) `copy_ooux_mismatch` — Seen-at vocabulary drift (blocking)
- Problem:
  - Canonical field is `poster_uploads.seen_at_name`, but UI copy still mixes `Found at` and `Seen at`.
- Why blocking:
  - Users and builders see inconsistent object identity for the same field.
- Evidence:
  - [CreateClient.tsx](/Users/troyeffner/Dropbox/DEV/communityboard/app/builder/create/CreateClient.tsx)
  - [SubmitClient.tsx](/Users/troyeffner/Dropbox/DEV/communityboard/app/submit/SubmitClient.tsx)
  - [PosterViewer.tsx](/Users/troyeffner/Dropbox/DEV/communityboard/app/poster/[id]/PosterViewer.tsx)
  - [manage/page.tsx](/Users/troyeffner/Dropbox/DEV/communityboard/app/manage/page.tsx)
- Immediate fix direction:
  - Lock public and builder display copy to one term (`Seen at`) while keeping DB field unchanged.

### 2) `copy_ooux_mismatch` — Pin-to-board vocabulary drift (blocking)
- Problem:
  - `/builder/tend` still uses `Publish` / `Published` in controls and filters.
- Why blocking:
  - Conflicts with intended action model (`Pin to board`, `Pinned`) and keeps mixed semantics.
- Evidence:
  - [tend/page.tsx](/Users/troyeffner/Dropbox/DEV/communityboard/app/builder/tend/page.tsx)
- Immediate fix direction:
  - Convert visible copy to pin vocabulary; preserve backend status codes.

### 3) `claim_capability_gap` — schema remediation shown to non-admin users (blocking)
- Problem:
  - Runtime surfaces display migration remediation copy (e.g., “run migration”) on end-user pages.
- Why blocking:
  - Claims implicit user capability to fix infra state they do not control.
- Evidence:
  - [CreateClient.tsx](/Users/troyeffner/Dropbox/DEV/communityboard/app/builder/create/CreateClient.tsx)
  - [PosterViewer.tsx](/Users/troyeffner/Dropbox/DEV/communityboard/app/poster/[id]/PosterViewer.tsx)
- Immediate fix direction:
  - Gate schema diagnostics to dev/admin only; keep user-safe fallback in public views.

### 4) Missing primary CTA mappings (blocking)
- Problem:
  - Several high-impact CTAs exist in UI but are not operationalized in canonical copy mappings.
- Missing mapping candidates:
  - `Upload and select`
  - `Next untended poster`
  - `Mark Done`
  - `Delete poster`
- Evidence:
  - [CreateClient.tsx](/Users/troyeffner/Dropbox/DEV/communityboard/app/builder/create/CreateClient.tsx)
- Immediate fix direction:
  - Add copy atoms with explicit `primary_job_id`, `action_ids`, and `object_ids`.

## Additional High-Priority Gaps (Non-Blocking)
- Dual storage model still active:
  - `poster_items` + legacy `events/poster_event_links` fallback logic.
  - Evidence:
    - [create-event-from-poster route](/Users/troyeffner/Dropbox/DEV/communityboard/app/api/builder/create-event-from-poster/route.ts)
    - [public browse route](/Users/troyeffner/Dropbox/DEV/communityboard/app/api/public/browse/route.ts)
    - [builder events route](/Users/troyeffner/Dropbox/DEV/communityboard/app/api/builder/events/route.ts)
- Builder nav still embedded in create page while being treated as standalone IA elsewhere:
  - [CreateClient.tsx](/Users/troyeffner/Dropbox/DEV/communityboard/app/builder/create/CreateClient.tsx)

## Suggested Next Execution Order
1. Vocabulary lock pass (`Seen at`, `Pin to board`, `Pinned`) on public + builder surfaces.
2. CTA mapping completion in metaphor/copy ingest for all builder primary actions.
3. Public-safe error copy pass (remove migration instructions from non-admin UI).
4. Poster IA parity pass (single list hierarchy + selected state without reorder side effects).
5. Run first governance check against `MG*`, `CG*`, `LK1`; mark any suppressions explicitly.

## Notes
- This pass intentionally did not alter runtime code.
- Governance rule IDs in ingest files include:
  - Epistemic: `GR1..GR5`
  - Metaphor/copy: `MG1..MG3`, `CG1..CG3`, `LK1`
