CREATE TABLE IF NOT EXISTS event_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  voter_vid text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, voter_vid)
);

CREATE INDEX IF NOT EXISTS idx_event_votes_event_id ON event_votes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_votes_created_at ON event_votes(created_at);
