DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type
  INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'events'
    AND column_name = 'event_attributes';

  IF col_type IS NULL THEN
    ALTER TABLE events
      ADD COLUMN event_attributes jsonb NOT NULL DEFAULT '{}'::jsonb;
  ELSIF col_type <> 'jsonb' THEN
    ALTER TABLE events
      ALTER COLUMN event_attributes TYPE jsonb
      USING CASE
        WHEN event_attributes IS NULL THEN '{}'::jsonb
        ELSE to_jsonb(event_attributes)
      END;
    ALTER TABLE events
      ALTER COLUMN event_attributes SET DEFAULT '{}'::jsonb;
    UPDATE events
      SET event_attributes = '{}'::jsonb
      WHERE event_attributes IS NULL;
  END IF;
END $$;
