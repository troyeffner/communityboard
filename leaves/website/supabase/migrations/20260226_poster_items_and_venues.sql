-- Phase-2 seam: structured venues + generic poster_items model.
-- Safe/additive migration; leaves legacy events/poster_event_links intact.

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table if exists public.poster_uploads
  add column if not exists venue_id uuid references public.venues(id);

create table if not exists public.poster_items (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.poster_uploads(id) on delete cascade,
  type text not null,
  x double precision not null,
  y double precision not null,
  title text,
  start_date timestamptz,
  end_date timestamptz,
  time_of_day text,
  location_text text,
  contact_text text,
  details_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists poster_items_poster_idx on public.poster_items(poster_id);
create index if not exists poster_items_status_idx on public.poster_items(status);
create index if not exists poster_items_type_idx on public.poster_items(type);

-- Backfill legacy pinned events into poster_items as type='event'.
insert into public.poster_items (
  poster_id,
  type,
  x,
  y,
  title,
  start_date,
  location_text,
  details_json,
  status
)
select
  pel.poster_upload_id as poster_id,
  'event' as type,
  coalesce((pel.bbox->>'x')::double precision, 0.5) as x,
  coalesce((pel.bbox->>'y')::double precision, 0.5) as y,
  e.title,
  e.start_at as start_date,
  e.location as location_text,
  jsonb_build_object('legacy_event_id', e.id) as details_json,
  case when e.status in ('published','draft','archived') then e.status else 'draft' end as status
from public.poster_event_links pel
join public.events e on e.id = pel.event_id
where not exists (
  select 1
  from public.poster_items pi
  where pi.poster_id = pel.poster_upload_id
    and pi.type = 'event'
    and coalesce(pi.details_json->>'legacy_event_id', '') = e.id::text
);
