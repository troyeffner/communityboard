-- Ensure poster metadata field used by the app exists everywhere.
alter table if exists public.poster_uploads
  add column if not exists seen_at_name text;

-- Backfill from legacy columns when present.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'poster_uploads'
      and column_name = 'seen_at_label'
  ) then
    execute $sql$
      update public.poster_uploads
      set seen_at_name = coalesce(seen_at_name, seen_at_label)
      where seen_at_name is null and seen_at_label is not null
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'poster_uploads'
      and column_name = 'seen_at'
  ) then
    execute $sql$
      update public.poster_uploads
      set seen_at_name = coalesce(seen_at_name, seen_at)
      where seen_at_name is null and seen_at is not null
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'poster_uploads'
      and column_name = 'source_place'
  ) then
    execute $sql$
      update public.poster_uploads
      set seen_at_name = coalesce(seen_at_name, source_place)
      where seen_at_name is null and source_place is not null
    $sql$;
  end if;
end $$;
