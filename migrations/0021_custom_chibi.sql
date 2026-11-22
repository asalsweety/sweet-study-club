ALTER TABLE chibi_appearance ADD COLUMN customization TEXT
  CHECK (customization IS NULL OR json_valid(customization));

UPDATE system_metadata SET value = '21', updated_at = unixepoch() WHERE key = 'schema_version';
