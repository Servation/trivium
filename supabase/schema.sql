-- Run this in the Supabase dashboard: SQL Editor > New query > paste > Run

-- Games: one row per hosted game
CREATE TABLE IF NOT EXISTS games (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code         CHAR(6)     UNIQUE NOT NULL,
  topic        TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'lobby',
  questions    JSONB       NOT NULL DEFAULT '[]',
  current_q    INT         NOT NULL DEFAULT 0,
  q_started_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT games_status_check CHECK (
    status IN ('lobby', 'starting', 'question', 'reveal', 'finished')
  )
);

-- Players: one row per person in a game (host included)
CREATE TABLE IF NOT EXISTS players (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id   UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name      TEXT        NOT NULL,
  is_host   BOOLEAN     NOT NULL DEFAULT false,
  score     INT         NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT now()
);

-- Answers: one row per player per question (UNIQUE enforces single submission)
CREATE TABLE IF NOT EXISTS answers (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id        UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id      UUID        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  question_index INT         NOT NULL,
  choice         INT         NOT NULL CHECK (choice BETWEEN 0 AND 3),
  is_correct     BOOLEAN     NOT NULL,
  points         INT         NOT NULL DEFAULT 0,
  answered_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, question_index)
);

-- Indexes for Realtime filter performance
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_answers_game_id  ON answers(game_id);
CREATE INDEX IF NOT EXISTS idx_games_code       ON games(code);

-- RLS: required for Supabase Realtime to stream rows to the browser.
-- Policies are permissive for now (no auth). Tighten when you add accounts.
ALTER TABLE games   ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON games   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON answers FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime streaming on all three tables
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE answers;
