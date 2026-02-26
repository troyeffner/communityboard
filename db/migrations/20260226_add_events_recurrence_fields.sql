ALTER TABLE events
ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_rule text NULL;
