-- User roles for governance flows.
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  name text,
  email text,
  role text NOT NULL DEFAULT 'public',
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_check CHECK (role IN ('public', 'community_builder', 'owner'));
  END IF;
END $$;

-- Event lifecycle + publishing metadata.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS end_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

ALTER TABLE events
  ALTER COLUMN status SET DEFAULT 'planted';

-- Activity log for collective tending actions.
CREATE TABLE IF NOT EXISTS event_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  action text NOT NULL,
  user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_activity_log_action_check'
  ) THEN
    ALTER TABLE event_activity_log
      ADD CONSTRAINT event_activity_log_action_check
      CHECK (action IN ('published', 'edited', 'removed', 'tag_override'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_event_activity_event_created
  ON event_activity_log (event_id, created_at DESC);

-- Positive-only tags + votes.
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  kind text NOT NULL,
  slug text NOT NULL UNIQUE
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tags_kind_check'
  ) THEN
    ALTER TABLE tags
      ADD CONSTRAINT tags_kind_check CHECK (kind IN ('category', 'attribute', 'audience'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS event_tags (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  applied_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'community',
  PRIMARY KEY (event_id, tag_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_tags_source_check'
  ) THEN
    ALTER TABLE event_tags
      ADD CONSTRAINT event_tags_source_check CHECK (source IN ('community', 'community_builder'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS tag_votes (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  voter_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, tag_id, voter_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_tag_votes_fingerprint_created
  ON tag_votes (voter_fingerprint, created_at DESC);

-- Helpful lifecycle index.
CREATE INDEX IF NOT EXISTS idx_events_lifecycle
  ON events (status, start_at, is_recurring);
