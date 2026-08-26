CREATE TABLE IF NOT EXISTS system_metadata (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT INTO system_metadata (key, value)
VALUES ('schema_version', '1')
ON CONFLICT (key) DO UPDATE SET
  value = excluded.value,
  updated_at = unixepoch();
