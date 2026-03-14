-- Durable enum/schema alignment for app statuses.

-- 1) Enum alignment: poster_status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'poster_status') THEN
    BEGIN
      ALTER TYPE poster_status ADD VALUE 'new';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE poster_status ADD VALUE 'tending';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE poster_status ADD VALUE 'done';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE poster_status ADD VALUE 'uploaded';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 2) Enum alignment: event_status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
    BEGIN
      ALTER TYPE event_status ADD VALUE 'draft';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE event_status ADD VALUE 'published';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE event_status ADD VALUE 'unpublished';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE event_status ADD VALUE 'planted';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 3) poster_uploads column alignment
ALTER TABLE poster_uploads
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS seen_at_name text,
  ADD COLUMN IF NOT EXISTS done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- Set default if status column exists.
ALTER TABLE poster_uploads
  ALTER COLUMN status SET DEFAULT 'new';

-- Normalize historical upload statuses.
UPDATE poster_uploads
SET status = CASE
  WHEN status IS NULL OR btrim(status) = '' THEN 'new'
  WHEN lower(status) = 'uploaded' THEN 'new'
  WHEN lower(status) = 'processed' THEN 'done'
  ELSE lower(status)
END;

UPDATE poster_uploads
SET is_done = COALESCE(is_done, done, false),
    done = COALESCE(done, is_done, false);

-- 4) events column alignment
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS event_category text,
  ADD COLUMN IF NOT EXISTS event_attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS event_audience text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS event_location_name text,
  ADD COLUMN IF NOT EXISTS event_location_address text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- published_by may exist in some environments; add without FK to avoid dependency errors.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS published_by uuid;

ALTER TABLE events
  ALTER COLUMN status SET DEFAULT 'draft';

UPDATE events
SET status = COALESCE(NULLIF(lower(status), ''), 'draft')
WHERE status IS NULL OR btrim(status) = '';
