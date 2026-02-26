ALTER TABLE poster_uploads
  ADD COLUMN IF NOT EXISTS seen_at_name text NULL;

ALTER TABLE poster_uploads
  DROP COLUMN IF EXISTS seen_at_category,
  DROP COLUMN IF EXISTS seen_at_label,
  DROP COLUMN IF EXISTS seen_at_type,
  DROP COLUMN IF EXISTS seen_at_address,
  DROP COLUMN IF EXISTS seen_at_lat,
  DROP COLUMN IF EXISTS seen_at_lng,
  DROP COLUMN IF EXISTS seen_at_notes,
  DROP COLUMN IF EXISTS seen_at_confidence;

