-- Run in Supabase SQL Editor after migration_001.sql
CREATE TABLE IF NOT EXISTS reports (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question    TEXT        NOT NULL,
  topic       TEXT        NOT NULL,
  reason      TEXT        NOT NULL DEFAULT 'unspecified',
  game_id     UUID        REFERENCES games(id) ON DELETE SET NULL,
  player_id   UUID        REFERENCES players(id) ON DELETE SET NULL,
  reported_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_insert" ON reports FOR INSERT WITH CHECK (true);
