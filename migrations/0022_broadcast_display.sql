ALTER TABLE broadcasts ADD COLUMN is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1));
ALTER TABLE broadcasts ADD COLUMN starts_at INTEGER;
ALTER TABLE broadcasts ADD COLUMN tone TEXT NOT NULL DEFAULT 'notice' CHECK (tone IN ('notice', 'maintenance', 'important'));
ALTER TABLE broadcasts ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1));
ALTER TABLE broadcasts ADD COLUMN destination TEXT CHECK (destination IN ('planner', 'learning', 'shop', 'feedback', 'ranking'));

UPDATE system_metadata SET value = '22', updated_at = unixepoch() WHERE key = 'schema_version';
