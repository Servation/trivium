-- Run in Supabase SQL Editor after schema.sql
ALTER TABLE games ADD COLUMN IF NOT EXISTS question_count SMALLINT NOT NULL DEFAULT 5;
ALTER TABLE games ADD COLUMN IF NOT EXISTS custom_questions JSONB NOT NULL DEFAULT '[]';
