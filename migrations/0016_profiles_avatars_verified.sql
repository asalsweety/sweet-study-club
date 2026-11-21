-- Verified ("authentic account") tag, granted only by admins.
ALTER TABLE "user" ADD COLUMN verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1));

-- The club founder's account is verified from day one.
UPDATE "user" SET verified = 1 WHERE lower(email) = 'asal.abouali@gmail.com';

-- Profile pictures are small (256px, resized in the browser), so they live
-- next to the account instead of in a separate bucket.
CREATE TABLE user_avatars (
  user_id TEXT PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('image/webp', 'image/jpeg', 'image/png')),
  bytes BLOB NOT NULL CHECK (length(bytes) BETWEEN 1 AND 262144),
  updated_at INTEGER NOT NULL
);

UPDATE system_metadata SET value = '16', updated_at = unixepoch() WHERE key = 'schema_version';
