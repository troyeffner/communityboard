-- Additive seam for admin user stub + anonymous viewer upvotes on poster_items.

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email text,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.poster_item_upvotes (
  id uuid primary key default gen_random_uuid(),
  poster_item_id uuid not null references public.poster_items(id) on delete cascade,
  viewer_id uuid not null,
  user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (poster_item_id, viewer_id)
);

alter table public.poster_items
  add column if not exists upvote_count integer not null default 0;

create index if not exists poster_item_upvotes_item_idx on public.poster_item_upvotes(poster_item_id);
create index if not exists poster_item_upvotes_viewer_idx on public.poster_item_upvotes(viewer_id);

insert into public.users (display_name, role)
select 'Troy', 'admin'
where not exists (
  select 1 from public.users where lower(display_name) = 'troy'
);
