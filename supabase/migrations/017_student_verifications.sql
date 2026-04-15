-- Student verification data per team
CREATE TABLE student_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL,
  school_name TEXT NOT NULL,
  card_image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lookup by team name (case-insensitive)
CREATE INDEX idx_student_verifications_team ON student_verifications (lower(team_name));

ALTER TABLE student_verifications ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public booking page)
CREATE POLICY "Anyone can insert student verification"
  ON student_verifications FOR INSERT WITH CHECK (true);

-- Allow reads for checking existing verifications
CREATE POLICY "Anyone can read student verifications"
  ON student_verifications FOR SELECT USING (true);
