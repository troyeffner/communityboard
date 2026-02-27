alter table if exists public.poster_uploads
  drop column if exists seen_at_label,
  drop column if exists seen_at,
  drop column if exists source_place;
