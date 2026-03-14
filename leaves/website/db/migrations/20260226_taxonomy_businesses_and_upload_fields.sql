-- Poster upload metadata and processing flags.
ALTER TABLE poster_uploads
  ADD COLUMN IF NOT EXISTS seen_at_category text,
  ADD COLUMN IF NOT EXISTS is_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS object_type text NOT NULL DEFAULT 'event_poster';

ALTER TABLE poster_uploads
  ADD CONSTRAINT poster_uploads_object_type_check
  CHECK (object_type IN ('event_poster', 'business_cards', 'mixed'));

CREATE INDEX IF NOT EXISTS idx_poster_uploads_created_done_type
  ON poster_uploads (created_at DESC, is_done, object_type);

-- Event tagging and location fields.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS event_category text,
  ADD COLUMN IF NOT EXISTS event_attributes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS event_audience text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS event_location_name text,
  ADD COLUMN IF NOT EXISTS event_location_address text;

CREATE INDEX IF NOT EXISTS idx_events_status_start_recurring_category
  ON events (status, start_at, is_recurring, event_category);

-- Business/service records.
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  description text,
  phone text,
  email text,
  url text,
  address text,
  attributes text[] NOT NULL DEFAULT '{}',
  audience text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_businesses_status_category_created
  ON businesses (status, category, created_at DESC);

CREATE TABLE IF NOT EXISTS poster_business_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_upload_id uuid NOT NULL REFERENCES poster_uploads(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  bbox jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_poster_business_links_upload
  ON poster_business_links (poster_upload_id);

CREATE INDEX IF NOT EXISTS idx_poster_business_links_business
  ON poster_business_links (business_id);
