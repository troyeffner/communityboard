# Communityboard

## High-Level Infrastructure

### Frontend / App
- Next.js App Router app.
- Key pages:
- `/`: public events list
- `/submit`: public poster uploader
- `/manage`: admin flow to map poster uploads to events with image pins

### Backend
- Next.js Route Handlers under `app/api/**`.
- Supabase for:
- Postgres (events, uploads, links)
- Storage bucket (`posters`)
- Server-side API access via `@supabase/supabase-js` with Service Role key.

### Deployment
- Code is in GitHub.
- Typical path: local changes -> commit -> push -> deploy on hosting platform.

## Environment Variables

Required in `.env.local` and production:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase admin key. Server-side only; never expose in client code.

Optional (only if adding client-side Supabase usage):

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Supabase Storage

- Bucket: `posters`
- Upload route currently writes keys like:
- `uploads/<timestamp>-<random>.<ext>`
- Historical keys may look like:
- `posters/<uuid>.jpeg`

`/api/manage/list-uploads` computes `public_url` with:

- `supabase.storage.from('posters').getPublicUrl(file_path)`

## Database Tables

### `poster_uploads`
- `id` (uuid, PK)
- `file_path` (text)
- `status` (text)
- `created_at` (timestamptz)
- `seen_at_name` (text, nullable)

### `events`
- `id` (uuid, PK)
- `title` (text)
- `location` (text, nullable)
- `start_at` (timestamptz)
- `status` (`draft` | `published`)

### `poster_items`
- `id` (uuid, PK)
- `poster_id` (uuid, FK -> `poster_uploads.id`)
- `type` (text; e.g. `event`, `recurring_event`, `class_program`, `business_service`, `opportunity`, `announcement`)
- `x`, `y` (float, normalized 0..1)
- `title` (text)
- `start_date` (date, nullable)
- `time_of_day` (time, nullable)
- `location_text` (text, nullable)
- `details_json` (jsonb)
- `status` (`draft` | `published` | `archived`)
- `upvote_count` (int)

### `poster_item_upvotes`
- `id` (uuid, PK)
- `poster_item_id` (uuid, FK -> `poster_items.id`)
- `viewer_id` (uuid)
- `created_at` (timestamptz)
- unique `(poster_item_id, viewer_id)`

### `poster_event_links`
- `id` (uuid, PK)
- `poster_upload_id` (uuid, FK -> `poster_uploads.id`)
- `event_id` (uuid, FK -> `events.id`)
- `bbox` (jsonb, nullable; stores normalized `{ x, y }` values)
- `created_at` (timestamptz)

## API Routes

### Public submission
- `POST /api/submit/upload`
- Accepts multipart file upload.
- Stores file in `posters` bucket.
- Inserts `poster_uploads` row (`seen_at_name` optional via form field).
- Returns `{ ok: true, id }`.

### Manage: list uploads
- `GET /api/manage/list-uploads`
- Returns recent uploads with computed `public_url`, `seen_at_name`, and linked event counts.

### Manage: update poster metadata
- `PATCH /api/manage/update-poster`
- Body: `{ poster_upload_id, seen_at_name?, status? }`
- Updates `poster_uploads` only.

### Manage: create event from poster
- `POST /api/manage/create-event-from-poster`
- Creates `events` row.
- Creates `poster_event_links` row with `bbox`.

### Manage: list events linked to poster
- `GET /api/manage/poster-events?poster_upload_id=<uuid>`
- Returns rows shaped as:
- `{ link_id, bbox, created_at, event: { id, title, location, start_at, status } }`
- Reads `poster_items` first (legacy fallback supported).

### Public browse
- `GET /api/public/browse?poster=<id>&seenAt=<value>&tags=...`
- Returns poster list + facets + published item pins for active poster.

### Item upvotes
- `POST /api/items/:id/upvote`
- `DELETE /api/items/:id/upvote`
- Uses anonymous `viewer_id` cookie (or `x-cb-vid`) and enforces one vote per viewer/item.

### Manage: delete linked event
- `POST /api/manage/delete-poster-event` with `{ link_id }`
- Deletes link row, then deletes the linked event row.
- Returns `{ ok: true }` or `{ error: ... }`.

## Local Workflow Notes

- Only one Next dev server can hold `.next/dev/lock` at a time.
- If a local dev server is already running, avoid starting another in automation contexts.
- Preferred non-port checks:
- `npm run lint`
- `npm run build`

## Seen-at Curl Checks

Upload with seen-at:

```bash
curl -X POST http://localhost:3000/api/submit/upload \
  -F "file=@/absolute/path/to/poster.jpg" \
  -F "seen_at_name=Emmerson Cafe Community Board"
```

List uploads (verify `seen_at_name` + `linked_events_count`):

```bash
curl http://localhost:3000/api/manage/list-uploads
```

Browse by seen-at:

```bash
curl "http://localhost:3000/api/public/browse?seenAt=Emmerson%20Cafe%20Community%20Board"
```

## Regression Tests

Run lightweight regression checks (no `dev` server required):

```bash
npm run test
```

Run full regression gate (tests + lint + build):

```bash
npm run test:regression
```

Optional DB enum/status smoke test (runs real inserts/links against Supabase):

```bash
RUN_DB_REGRESSION=1 npm test -- tests/regression/db-status-smoke.test.mjs
```

## Enum / Schema Alignment (DEV + PROD)

Use migration:

`db/migrations/20260226_enum_schema_alignment.sql`

This migration aligns:
- `poster_status` enum to support `new`, `tending`, `done`, `uploaded`
- `event_status` enum to support `draft`, `published`, `unpublished`, `planted`
- additive columns on `poster_uploads` and `events` used by the app

Before applying, you can inspect enum values in SQL editor:

```sql
select unnest(enum_range(null::poster_status)) as v;
select unnest(enum_range(null::event_status)) as v;
```

Apply order:
1. Apply enum/schema migration first (DEV, then PROD).
2. Deploy app code that writes `poster_uploads.status='new'`.
