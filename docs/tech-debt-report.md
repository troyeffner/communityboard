# CommunityBoard Technical Debt Report

Date: 2026-02-26

## Summary
This review covered `app/**`, `app/api/**`, migrations in `db/migrations/**`, and build/runtime behavior for Next.js + Supabase + Vercel.

This pass also implemented low-risk repairs for:
- Legacy `on_board` status fallback causing enum failures.
- `seen_at` single-source normalization around `poster_uploads.seen_at_name`.
- New `PATCH /api/manage/update-poster` endpoint for explicit poster metadata updates.
- Build resilience by removing remote Google font fetch from layout.

## Correctness

### 1) Legacy event status fallback still modeled in types and UI
- Severity: P1
- Location: `app/builder/tend/page.tsx:19`, `app/components/PublicEventsList.tsx:11`
- Impact: UI and parsing still encode `on_board/planted/archived` legacy values while core APIs now operate on `draft/published/unpublished`; creates drift risk and confusing filters.
- Recommendation: Remove legacy status variants from client types and normalize status labels in one shared helper.

### 2) API fallbacks rely on substring matching of DB errors
- Severity: P1
- Location: `app/api/manage/update-event/route.ts:19`, `app/api/manage/poster-events/route.ts:8`, `app/api/manage/all-events/route.ts:40`
- Impact: `message.includes(...)` fallback logic can hide real schema issues and silently degrade behavior.
- Recommendation: Replace message parsing with explicit migration gating/version checks (or feature flags), and log structured diagnostics server-side.

### 3) Timezone formatting is inconsistent in UI
- Severity: P2
- Location: `app/poster/[id]/page.tsx:165`, `app/manage/page.tsx:281`, `app/builder/create/CreateClient.tsx:434`
- Impact: Some views use browser local timezone (`toLocaleString()`), others use America/New_York; users see inconsistent event times.
- Recommendation: centralize date formatting utility with fixed `America/New_York` for display.

## Security

### 4) Manage/Builder mutating endpoints are unauthenticated while using service-role key
- Severity: P0
- Location: `app/api/manage/delete-event/route.ts:8`, `app/api/manage/delete-upload/route.ts:8`, `app/api/manage/update-event/route.ts:47`, `app/api/builder/delete-event/route.ts:8`
- Impact: Any caller with network access to the app can mutate/delete records because handlers do not verify identity/role.
- Recommendation: Add server-side auth/role guard for `/api/manage/*` and `/api/builder/*` (Supabase auth or signed admin secret middleware).

### 5) Raw database errors are returned to clients
- Severity: P1
- Location: widespread; e.g. `app/api/manage/delete-upload/route.ts:28`, `app/api/manage/update-event/route.ts:128`
- Impact: Schema/table details leak externally and increase attack surface.
- Recommendation: Return user-safe errors and log detailed diagnostics internally.

### 6) Password-in-body pattern for admin route
- Severity: P2
- Location: `app/api/manage/create-event/route.ts:29-42`
- Impact: In-band password transport is easy to misuse and bypasses unified auth model.
- Recommendation: Deprecate this route or move to shared auth guard. Avoid body password checks.

## DX / Build / Infra

### 7) No automated test suite configured
- Severity: P2
- Location: `package.json:5-10`
- Impact: Regressions land without CI verification beyond build/lint.
- Recommendation: Add minimal API smoke tests or Playwright health checks and a `test` script.

### 8) Very large client components reduce maintainability
- Severity: P2
- Location: `app/manage/page.tsx:1` (~1100+ LOC), `app/builder/create/CreateClient.tsx:1` (~700+ LOC)
- Impact: Harder reasoning, frequent hook-dependency lint warnings, higher regression risk.
- Recommendation: Extract stateful hooks and subcomponents (poster viewer, form, linked-list, filters).

### 9) Hook dependency warnings unresolved
- Severity: P3
- Location: `app/manage/page.tsx:367`, `app/manage/page.tsx:391`, `app/builder/create/CreateClient.tsx:126`
- Impact: Stale closures and subtle refresh bugs.
- Recommendation: Wrap loaders in `useCallback` and use explicit dependencies.

## Performance

### 10) `<img>` used across critical screens
- Severity: P3
- Location: `app/manage/page.tsx:845`, `app/poster/[id]/PosterViewer.tsx:251`, `app/submit/page.tsx:168`
- Impact: Missed Next image optimizations and potential bandwidth/LCP cost.
- Recommendation: Migrate non-interactive images to `next/image`; keep raw `<img>` only where transform math demands it.

### 11) Vote counts fetched by scanning full vote rows
- Severity: P2
- Location: `app/page.tsx:176-198`, `app/api/events/route.ts:108-133`
- Impact: O(n) payload and CPU growth with vote volume.
- Recommendation: Use aggregated counts in SQL/RPC (`count(*) group by event_id`) and separate per-user vote lookup.

## UX / IA

### 12) Prompt-based destructive action mode selection
- Severity: P2
- Location: `app/builder/create/CreateClient.tsx:292`
- Impact: `prompt()` is error-prone and inconsistent with rest of UI controls.
- Recommendation: Replace with modal/radio choice (same pattern already used in selected poster delete flow).

### 13) Mixed interaction patterns between `/manage` and `/builder/create`
- Severity: P3
- Location: `app/manage/page.tsx`, `app/builder/create/CreateClient.tsx`
- Impact: Two admin surfaces diverge in controls, defaults, and delete semantics.
- Recommendation: Consolidate shared primitives and align workflows.

## Data Integrity

### 14) Multi-step destructive operations are non-transactional
- Severity: P1
- Location: `app/api/manage/delete-upload/route.ts:31-94`, `app/api/manage/delete-poster/route.ts:30-58`
- Impact: Partial failures can leave dangling DB/storage state.
- Recommendation: Move delete workflows to a Postgres function/transaction; run storage delete after DB commit with retry queue.

### 15) Duplicate deletion endpoints with overlapping semantics
- Severity: P2
- Location: `app/api/manage/delete-upload/route.ts`, `app/api/manage/delete-poster/route.ts`
- Impact: Divergent behavior over time and duplicated bug fixes.
- Recommendation: Keep one canonical endpoint/service and alias others.

### 16) Schema drift in migrations (seen_at legacy columns still in historical migrations)
- Severity: P2
- Location: `db/migrations/20260226_add_seen_at_to_poster_uploads.sql:2-8`, `db/migrations/20260226_taxonomy_businesses_and_upload_fields.sql:3`
- Impact: Fresh environments may reintroduce obsolete columns unless cleanup migration applied.
- Recommendation: Ensure latest migration (`20260226_seen_at_name_single_source.sql`) is always included in bootstrap and document required order.

## Fixed In This Pass

1. Removed `on_board` fallback queries that were producing enum errors:
- `app/page.tsx`
- `app/api/events/route.ts`
- `app/api/public/events-grouped/route.ts`

2. Normalized `seen_at` write/read path to `poster_uploads.seen_at_name`:
- `app/api/submit/upload/route.ts`
- `app/api/manage/create-event-from-poster/route.ts`
- `app/api/manage/list-uploads-with-counts/route.ts`
- `app/api/manage/list-uploads/route.ts`
- `app/submit/page.tsx`
- `app/manage/page.tsx`
- `app/builder/create/CreateClient.tsx`
- `app/poster/[id]/page.tsx`

3. Added explicit poster update endpoint:
- `app/api/manage/update-poster/route.ts`

4. Removed remote Google font dependency from root layout to make build verification more reliable in restricted environments:
- `app/layout.tsx`

5. Added migration to keep seen-at single-source model:
- `db/migrations/20260226_seen_at_name_single_source.sql`
