# WQ-401 Blocker Evidence — Seen-at Schema Parity

Date
2026-03-01

Queue item
`wq_401` Schema parity DEV/PROD for `seen_at_name`

## Check executed
```bash
curl -sS -m 8 http://localhost:3000/api/health/schema
curl -sS -m 12 https://uticacommunityboard.vercel.app/api/health/schema
```

## Results
- DEV: `{"ok":false,"missing":["poster_uploads.seen_at_name"]}`
- PROD: `{"ok":false,"missing":["poster_uploads.seen_at_name"]}`

## Status
`wq_401` moved to `blocked`.

## Required remediation
Apply migration `supabase/migrations/20260227_add_seen_at_name_to_poster_uploads.sql`
to both DEV and PROD Supabase projects.

Fallback SQL (if migration runner unavailable):
```sql
alter table if exists public.poster_uploads
  add column if not exists seen_at_name text;
```

## Exit criteria
`/api/health/schema` returns `{"ok":true,"missing":[]}` in both environments.
