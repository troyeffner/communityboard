# Session Close — 2026-03-05

## What Happened
Short hotfix session. Troy reported upload still broken on production ("Upload storage is not ready yet"). Discovered previous session's migrations were applied to wrong Supabase project ID. Re-applied enum migrations to correct prod/dev instances. Then root-caused a second upload failure: deployed code inserts with `is_done` column that doesn't exist, triggering overbroad error handling that falsely blames `seen_at_name`. Added `is_done` column to fix. Also scanned 7 new INBOX dispatches from Coach.

## Decisions Made
- Corrected Supabase project IDs: prod = `lybjnpuohkiklwyabmlr`, dev = `cykezapmsegygbzzrjwj` (old ID `kfysfanfpdoopjqlayvq` was invalid)
- Added `is_done boolean NOT NULL DEFAULT false` to poster_uploads on both environments to fix deployed code's upload path

## Files Touched
- QB/DECISION_LOG.md — 2 new entries (project ID correction, is_done fix)
- QB/WORK_QUEUE.md — updated wq_430 notes with correct project IDs and is_done fix

## Work Queue Changes
- wq_430 notes updated with full root cause (enum + is_done + correct project IDs)

## DB Migrations Applied (both prod + dev)
- `add_poster_status_enum_values` — added new/tending/done to poster_status enum (RE-APPLIED to correct projects)
- `set_poster_status_default_new` — set default to 'new' (RE-APPLIED)
- `add_is_done_column` — added is_done boolean column

## Open Threads
- Local code changes (wq_435 event_status fixes) still not committed/pushed to GitHub
- Ship lane next: wq_438 (vocab fix), wq_436 (health check), then rest of lane

## INBOX Dispatches Received (7 new)
1. `dispatch_community_venmo_voting_20260305` — Venmo-style subscriber voting on job priorities
2. `dispatch_infra_update_20260304` — All projects deploy via Vercel; screenshot requirement for returns
3. `dispatch_participant_job_selection_20260304` — Job selection page for community participants
4. `dispatch_subscriber_contractor_connection_20260305` — Show subscribers who executes their funded jobs
5. `dispatch_subscription_voting_20260305` — Transparent live dashboard for subscriber finances
6. `dispatch_wow_20260304` — WoW updates: use /close often, /open+/close between contexts, max context in briefs
7. `notice_html5_interaction_layer_20260305` — NDD QB building shared interaction components; wait for spec

## Fractional Health Updates
Thread: none active this session

## Parking Lot
- Deployed code has overbroad error handling in upload route (42703 catches any missing column, not just seen_at_name). Local code fixes this with 9-candidate fallback loop but needs to be pushed.

## Blockers for Troy
- **Git push needed**: Local code changes (wq_435 + improved upload fallback) are not deployed. Production is running old GitHub code. DB fixes work around this, but pushing the new code would be more robust.

## Next Session Primer
Push local code changes to GitHub so production gets the improved upload route and event_status fixes. Then continue ship lane: wq_438 (vocab fix), wq_436 (health check). Process the 7 new INBOX dispatches — several may generate new WQ items.
