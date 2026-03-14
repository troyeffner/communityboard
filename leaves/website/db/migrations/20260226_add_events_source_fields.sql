ALTER TABLE events
ADD COLUMN IF NOT EXISTS source_type text,
ADD COLUMN IF NOT EXISTS source_place text,
ADD COLUMN IF NOT EXISTS source_detail text;
