CREATE TABLE chibi_purchases (
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  item TEXT NOT NULL CHECK (item IN ('lavender-knit', 'blue-hoodie', 'desk-plant', 'desk-clock')),
  cost INTEGER NOT NULL CHECK (cost > 0),
  PRIMARY KEY (user_id, item)
);

CREATE TABLE chibi_appearance (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  companion TEXT NOT NULL DEFAULT 'asal' CHECK (companion IN ('asal', 'girl', 'boy')),
  skin TEXT NOT NULL DEFAULT 'warm' CHECK (skin IN ('light', 'warm', 'deep')),
  hair TEXT NOT NULL DEFAULT 'brown' CHECK (hair IN ('brown', 'black', 'auburn')),
  outfit TEXT CHECK (outfit IS NULL OR outfit IN ('lavender-knit', 'blue-hoodie')),
  decor TEXT CHECK (decor IS NULL OR decor IN ('desk-plant', 'desk-clock'))
);

UPDATE system_metadata SET value = '14', updated_at = unixepoch() WHERE key = 'schema_version';
