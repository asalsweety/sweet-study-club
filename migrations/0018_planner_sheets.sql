-- Printable planner sheets filled in inside the app. Each page stores its
-- fields as a small JSON object; members can add as many pages as they need.
CREATE TABLE planner_sheets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('identity', 'monthly', 'habits', 'weekly', 'daily', 'review', 'chapter')),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  data TEXT NOT NULL DEFAULT '{}' CHECK (length(data) <= 65536),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX planner_sheets_user ON planner_sheets (user_id, updated_at DESC);

UPDATE system_metadata SET value = '18', updated_at = unixepoch() WHERE key = 'schema_version';
