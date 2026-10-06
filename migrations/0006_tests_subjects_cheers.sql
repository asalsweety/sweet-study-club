-- Konkur-style test accuracy, post-session reflection, konkur countdown,
-- personal subjects, and friend cheers.

ALTER TABLE study_logs ADD COLUMN tests_correct INTEGER NOT NULL DEFAULT 0
  CHECK (tests_correct BETWEEN 0 AND 10000);
ALTER TABLE study_logs ADD COLUMN tests_wrong INTEGER NOT NULL DEFAULT 0
  CHECK (tests_wrong BETWEEN 0 AND 10000);
ALTER TABLE study_logs ADD COLUMN focus_rating INTEGER
  CHECK (focus_rating IS NULL OR focus_rating BETWEEN 1 AND 5);

ALTER TABLE user_settings ADD COLUMN konkur_date TEXT
  CHECK (konkur_date IS NULL OR konkur_date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]');

CREATE TABLE user_subjects (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  color TEXT NOT NULL CHECK (color GLOB '#[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]'),
  emoji TEXT NOT NULL CHECK (length(emoji) BETWEEN 1 AND 8),
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, name)
);

CREATE INDEX user_subjects_user_idx ON user_subjects (user_id, position);

CREATE TABLE cheers (
  id TEXT PRIMARY KEY NOT NULL,
  from_user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (length(emoji) BETWEEN 1 AND 8),
  created_at INTEGER NOT NULL,
  seen_at INTEGER,
  CHECK (from_user_id != to_user_id)
);

CREATE INDEX cheers_to_idx ON cheers (to_user_id, created_at DESC);
CREATE INDEX cheers_from_idx ON cheers (from_user_id, created_at DESC);

UPDATE system_metadata
SET value = '6', updated_at = unixepoch()
WHERE key = 'schema_version';
