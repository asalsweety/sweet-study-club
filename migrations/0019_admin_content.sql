ALTER TABLE shop_products ADD COLUMN archived_at INTEGER;
ALTER TABLE learning_packs ADD COLUMN archived_at INTEGER;
ALTER TABLE learning_questions ADD COLUMN retired_at INTEGER;
ALTER TABLE shop_orders ADD COLUMN fulfilled_at INTEGER;

UPDATE system_metadata SET value = '19', updated_at = unixepoch() WHERE key = 'schema_version';
