# CommunityBoard OOUX Artifacts

## Object Map
- `PosterUpload` (`poster_uploads`): captured image, source context (`seen_at_name`), queue state.
- `PosterItem` (`poster_items`): pin-linked listing object with `type`, title, date/time, location, status.
- `Pin` (embedded on `PosterItem`): normalized `x,y` on poster image.
- `ViewerVote` (`poster_item_upvotes`): anonymous preference signal tied to `viewer_id`.

## Relationship Matrix
- `PosterUpload 1 -> N PosterItem` via `poster_items.poster_id`.
- `PosterItem 1 -> 1 Pin` via `poster_items.x,y`.
- `PosterItem 1 -> N ViewerVote` via `poster_item_upvotes.poster_item_id`.

## CTA Matrix
- Create drafts (`/builder/create`):
  - `Upload and select`
  - `Next untended poster`
  - `Add item` / `Save changes`
  - `Mark Done`
- Tend board (`/builder/tend`):
  - `Pin to board`
  - `Edit`
  - `Remove`
- Public browse/poster:
  - `Browse posters`
  - `Return to Community Board`
  - `Upvote`
  - `Add to Google Calendar` (time-bound item types only)
  - `Download .ics` (time-bound item types only)

## State Transition Table
- Poster upload:
  - `new` -> `uploaded` (submit/finalize routes)
  - `uploaded` -> `tending` (first linked item created)
  - `tending|uploaded|new` -> `processed` (`/api/builder/mark-upload-done`)
- Poster item:
  - `draft` -> `published` (`/api/builder/publish-event`)
  - `published` -> `draft` (edit flow can set to draft)

## Route/File Mapping
- Create workflow UI: `app/builder/create/CreateClient.tsx`
- Tend workflow UI: `app/builder/tend/page.tsx`
- Public board list: `app/page.tsx`, `app/components/PublicEventsList.tsx`
- Poster viewer: `app/poster/[id]/page.tsx`, `app/poster/[id]/PosterViewer.tsx`
- Seen-at canonical helper: `lib/seenAt.ts`
- Status canonical helper: `lib/statuses.ts`
- Item type canonical helper: `lib/itemTypes.ts`

