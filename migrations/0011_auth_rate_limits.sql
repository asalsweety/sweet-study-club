-- Persistent authentication throttling shared across Worker instances.
CREATE TABLE "rateLimit" (
  id TEXT PRIMARY KEY NOT NULL,
  "key" TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL,
  "lastRequest" INTEGER NOT NULL
);
UPDATE system_metadata SET value = '11', updated_at = unixepoch() WHERE key = 'schema_version';
