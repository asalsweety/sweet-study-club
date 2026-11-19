CREATE TABLE member_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 2000),
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, request_id)
);

UPDATE system_metadata SET value = '15', updated_at = unixepoch() WHERE key = 'schema_version';
