ALTER TABLE poster_uploads
ADD COLUMN IF NOT EXISTS processed_at timestamptz NULL;
