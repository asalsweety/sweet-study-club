-- D1 caps LIKE/GLOB pattern length, so the 6-class hex GLOB on
-- user_subjects.color failed every insert ("pattern too complex").
-- SQLite cannot drop a CHECK in place, so rebuild the table. The API
-- validates the full #RRGGBB format; the database keeps a cheap shape check.

CREATE TABLE user_subjects_next (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  color TEXT NOT NULL CHECK (length(color) = 7 AND substr(color, 1, 1) = '#'),
  emoji TEXT NOT NULL CHECK (length(emoji) BETWEEN 1 AND 8),
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, name)
);

INSERT INTO user_subjects_next (id, user_id, name, color, emoji, position, created_at)
SELECT id, user_id, name, color, emoji, position, created_at FROM user_subjects;

DROP TABLE user_subjects;
ALTER TABLE user_subjects_next RENAME TO user_subjects;
CREATE INDEX user_subjects_user_idx ON user_subjects (user_id, position);

UPDATE system_metadata
SET value = '7', updated_at = unixepoch()
WHERE key = 'schema_version';
