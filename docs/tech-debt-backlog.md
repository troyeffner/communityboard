---
type: tech-debt-backlog
from: communityboard-docs
date: 2026-03-10
status: active
topics: [technical-debt, backlog, prioritization]
fractals: [communityboard]
cluster: tech-debt
---

# CommunityBoard Prioritized Tech Debt Backlog

## Priority Order

1. **[P0] Add auth/role enforcement for all mutating manage/builder APIs**
- Effort: M
- Risk: Medium
- Why first: Service-role endpoints currently allow unauthenticated mutation/deletion.
- Scope: `/api/manage/*`, `/api/builder/*`, shared guard, role checks.

2. **[P1] Make delete workflows transactional**
- Effort: M
- Risk: Medium
- Why: Current multi-step delete paths can leave partial state.
- Scope: replace route-level multi-step deletes with SQL function/transaction + retry strategy for storage remove.

3. **[P1] Remove schema-error string parsing fallbacks**
- Effort: M
- Risk: Low
- Why: Fragile behavior and hidden schema drift.
- Scope: standardize DB feature flags/version checks; simplify fallback branches.

4. **[P1] Standardize event status model to `draft/published/unpublished` everywhere**
- Effort: S
- Risk: Low
- Why: Residual legacy status types in UI can reintroduce confusion.
- Scope: builder/public TS types and label helpers.

5. **[P2] Unify duplicate poster deletion endpoints**
- Effort: S
- Risk: Low
- Why: Avoid semantic drift between `delete-upload` and `delete-poster`.
- Scope: one canonical handler + aliases.

6. **[P2] Replace `prompt()` destructive flow in builder/create**
- Effort: S
- Risk: Low
- Why: UX reliability and accidental operator mistakes.
- Scope: modal with explicit choice and confirmation.

7. **[P2] Add minimal automated tests and `npm test` script**
- Effort: M
- Risk: Low
- Why: No test gate; regressions currently caught late.
- Scope: smoke API tests for submit/create/delete/publish/list + build lint in CI.

8. **[P2] Extract large page components into modules/hooks**
- Effort: L
- Risk: Medium
- Why: `manage` and `builder/create` are too large and fragile.
- Scope: split viewer, forms, filters, linked-items, submission list.

9. **[P2] Timezone normalization utility**
- Effort: S
- Risk: Low
- Why: Mixed `toLocaleString()` behavior creates time confusion.
- Scope: central formatter in `lib/date.ts`, adopt across pages.

10. **[P2] Migrate away from body-password admin route**
- Effort: S
- Risk: Low
- Why: `ADMIN_PASSWORD` request body pattern is weaker and inconsistent.
- Scope: deprecate `/api/manage/create-event` or guard with shared auth middleware.

11. **[P3] Resolve hook dependency warnings**
- Effort: S
- Risk: Low
- Why: Prevent stale closure bugs and noisy lint output.
- Scope: useCallback/useMemo around loaders and effects.

12. **[P3] Selective `next/image` adoption**
- Effort: S
- Risk: Low
- Why: Improve performance on non-transform image surfaces.
- Scope: submit preview and static thumbnails first.

## Already Completed In This Pass

- Status fallback fix (`on_board` query removal) in public reads.
- Seen-at single-source normalization (`poster_uploads.seen_at_name`).
- Added `PATCH /api/manage/update-poster`.
- Added seen-at cleanup migration.
- Removed remote Google font dependency in root layout for build robustness.
