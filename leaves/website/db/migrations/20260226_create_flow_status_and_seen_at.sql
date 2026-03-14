-- Create-flow normalization: no object_type, seen_at_name as single source, status queue values.
ALTER TABLE poster_uploads
  ADD COLUMN IF NOT EXISTS seen_at_name text,
  ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE poster_uploads
  ALTER COLUMN status SET DEFAULT 'new';

UPDATE poster_uploads
SET status = CASE
  WHEN status IS NULL OR btrim(status) = '' THEN 'new'
  WHEN lower(status) = 'uploaded' THEN 'new'
  WHEN lower(status) = 'processed' THEN 'done'
  ELSE lower(status)
END;

ALTER TABLE poster_uploads
  DROP COLUMN IF EXISTS object_type,
  DROP COLUMN IF EXISTS type,
  DROP COLUMN IF EXISTS seen_at_category,
  DROP COLUMN IF EXISTS seen_at_label;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'poster_uploads_status_check'
  ) THEN
    ALTER TABLE poster_uploads
      ADD CONSTRAINT poster_uploads_status_check
      CHECK (status IN ('new', 'tending', 'done'));
  END IF;
END $$;
