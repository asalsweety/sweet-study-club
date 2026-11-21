-- There was no theme switch before, so "system" was never a member's choice:
-- start everyone on the light theme. Members can now pick dark or "system".
UPDATE "user" SET theme = 'light' WHERE theme = 'system';

UPDATE system_metadata SET value = '17', updated_at = unixepoch() WHERE key = 'schema_version';
