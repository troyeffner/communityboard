ALTER TABLE poster_uploads
ADD COLUMN IF NOT EXISTS seen_at_label text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'poster_uploads'
      AND column_name = 'seen_at_name'
  ) THEN
    UPDATE poster_uploads
    SET seen_at_label = seen_at_name
    WHERE seen_at_label IS NULL
      AND seen_at_name IS NOT NULL;
  END IF;
END $$;
