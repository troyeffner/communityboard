ALTER TABLE poster_uploads
ADD COLUMN IF NOT EXISTS seen_at_type text,
ADD COLUMN IF NOT EXISTS seen_at_name text,
ADD COLUMN IF NOT EXISTS seen_at_address text,
ADD COLUMN IF NOT EXISTS seen_at_lat double precision,
ADD COLUMN IF NOT EXISTS seen_at_lng double precision,
ADD COLUMN IF NOT EXISTS seen_at_notes text,
ADD COLUMN IF NOT EXISTS seen_at_confidence text,
ADD COLUMN IF NOT EXISTS done boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS poster_uploads_seen_at_type_idx ON poster_uploads (seen_at_type);
CREATE INDEX IF NOT EXISTS poster_uploads_done_idx ON poster_uploads (done);
