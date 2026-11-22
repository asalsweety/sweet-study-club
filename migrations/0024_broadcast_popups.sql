ALTER TABLE broadcasts ADD COLUMN popup INTEGER NOT NULL DEFAULT 0 CHECK (popup IN (0, 1));
ALTER TABLE broadcasts ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0);

-- A content change is a new notice for people who acknowledged the previous text.
CREATE TRIGGER broadcasts_content_revision
AFTER UPDATE OF title, body, tone, destination ON broadcasts
WHEN OLD.title IS NOT NEW.title OR OLD.body IS NOT NEW.body
  OR OLD.tone IS NOT NEW.tone OR OLD.destination IS NOT NEW.destination
BEGIN
  UPDATE broadcasts SET revision = OLD.revision + 1 WHERE id = NEW.id;
END;

UPDATE system_metadata SET value = '24', updated_at = unixepoch() WHERE key = 'schema_version';
