ALTER TABLE study_logs ADD COLUMN title TEXT CHECK (title IS NULL OR length(title) BETWEEN 1 AND 120);
ALTER TABLE study_logs ADD COLUMN recorded_manually INTEGER NOT NULL DEFAULT 0 CHECK (recorded_manually IN (0, 1));
ALTER TABLE active_study_timers ADD COLUMN interrupted_focus_seconds INTEGER CHECK (interrupted_focus_seconds IS NULL OR interrupted_focus_seconds >= 0);

UPDATE system_metadata
SET value = '20', updated_at = unixepoch()
WHERE key = 'schema_version';
