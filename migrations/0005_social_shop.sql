-- Social graph, presence, gamification seen-state, shop/entitlements,
-- Plan by Asal requests and admin broadcasts.

CREATE TABLE friendships (
  user_low TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  user_high TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_low, user_high),
  CHECK (user_low < user_high),
  CHECK (requested_by IN (user_low, user_high))
);

CREATE INDEX friendships_high_idx ON friendships (user_high, status);

CREATE TABLE user_blocks (
  blocker_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

CREATE INDEX user_blocks_blocked_idx ON user_blocks (blocked_id);

-- Only a SHA-256 hash of the invite secret is stored.
CREATE TABLE friend_invites (
  token_hash TEXT PRIMARY KEY NOT NULL CHECK (length(token_hash) = 64),
  inviter_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE INDEX friend_invites_inviter_idx ON friend_invites (inviter_id, created_at DESC);

CREATE TABLE user_presence (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  last_seen_at INTEGER NOT NULL
);

CREATE TABLE badge_awards (
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL CHECK (length(badge_id) BETWEEN 1 AND 40),
  awarded_at INTEGER NOT NULL,
  seen_at INTEGER,
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE gamification_state (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  last_seen_level INTEGER NOT NULL DEFAULT 1 CHECK (last_seen_level BETWEEN 1 AND 100),
  updated_at INTEGER NOT NULL
);

CREATE TABLE shop_products (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE CHECK (length(slug) BETWEEN 2 AND 60),
  kind TEXT NOT NULL
    CHECK (kind IN ('planner', 'study_plan', 'package', 'plan_by_asal', 'dna_plan', 'subscription')),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  summary TEXT NOT NULL CHECK (length(summary) BETWEEN 1 AND 300),
  description TEXT NOT NULL CHECK (length(description) <= 4000),
  price_toman INTEGER NOT NULL CHECK (price_toman >= 0),
  duration_days INTEGER CHECK (duration_days IS NULL OR duration_days BETWEEN 1 AND 3650),
  content_json TEXT CHECK (content_json IS NULL OR json_valid(content_json)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE shop_orders (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES shop_products (id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled', 'failed')),
  amount_toman INTEGER NOT NULL CHECK (amount_toman >= 0),
  provider TEXT NOT NULL CHECK (length(provider) BETWEEN 1 AND 40),
  provider_reference TEXT,
  idempotency_key TEXT NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 80),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  paid_at INTEGER,
  UNIQUE (user_id, idempotency_key),
  CHECK ((status = 'paid' AND paid_at IS NOT NULL) OR (status != 'paid'))
);

CREATE INDEX shop_orders_user_idx ON shop_orders (user_id, created_at DESC);

CREATE TABLE entitlements (
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES shop_products (id),
  source_order_id TEXT REFERENCES shop_orders (id) ON DELETE SET NULL,
  granted_at INTEGER NOT NULL,
  expires_at INTEGER,
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE plan_requests (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES shop_products (id),
  goal TEXT NOT NULL CHECK (length(goal) BETWEEN 1 AND 200),
  details TEXT NOT NULL CHECK (length(details) <= 3000),
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'in_progress', 'delivered')),
  response TEXT CHECK (response IS NULL OR length(response) <= 20000),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX plan_requests_status_idx ON plan_requests (status, created_at);
CREATE INDEX plan_requests_user_idx ON plan_requests (user_id, created_at DESC);

CREATE TABLE broadcasts (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_by TEXT REFERENCES "user" (id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER
);

CREATE INDEX broadcasts_created_idx ON broadcasts (created_at DESC);

INSERT INTO shop_products (id, slug, kind, title, summary, description, price_toman, duration_days, content_json, is_active, position, created_at, updated_at) VALUES
  ('prod-planner', 'sweet-planner', 'planner', 'پلنر Sweet',
   'پلنر روزانه و ماهانه با یادآور و قالب‌های آماده.',
   'قالب‌های آماده‌ی روزانه و ماهانه، یادآور هوشمند و برنامه‌ی هفتگی قابل ویرایش.',
   99000, NULL, NULL, 1, 1, 0, 0),
  ('prod-ready-plan', 'ready-plan-30', 'study_plan', 'برنامه‌ی آماده‌ی ۳۰ روزه',
   'برنامه‌ی مطالعاتی آماده برای جمع‌بندی ۳۰ روزه.',
   'برنامه‌ی روزبه‌روز با تعداد تست و زمان پیشنهادی برای هر درس. بعد از خرید به پلنر اضافه می‌شود.',
   149000, NULL, '{"days":30}', 1, 2, 0, 0),
  ('prod-med-pack', 'med-package', 'package', 'پکیج پزشکی',
   'پکیج کمک‌آموزشی برای داوطلب‌های پزشکی.',
   'مجموعه‌ی برنامه، منابع پیشنهادی و نکات مطالعه برای داوطلب‌های رشته‌های پزشکی.',
   249000, NULL, NULL, 1, 3, 0, 0),
  ('prod-plan-asal', 'plan-by-asal', 'plan_by_asal', 'برنامه‌ی شخصی با Asal',
   'برنامه‌ی اختصاصی که Asal برای تو می‌نویسد.',
   'بعد از خرید، هدف و شرایطت را می‌نویسی و برنامه‌ی شخصی‌ات داخل برنامه تحویل داده می‌شود.',
   390000, NULL, NULL, 1, 4, 0, 0),
  ('prod-dna-plan', 'dna-plan', 'dna_plan', 'برنامه بر اساس Study DNA',
   'برنامه‌ای که از الگوی واقعی مطالعه‌ات ساخته می‌شود.',
   'بر اساس ساعت‌های پربازده، طول جلسه‌ها و درس‌های محبوبت یک برنامه‌ی هفتگی پیشنهادی ساخته می‌شود.',
   79000, NULL, NULL, 1, 5, 0, 0),
  ('prod-sweet-plus', 'sweet-plus-monthly', 'subscription', 'Sweet Plus ماهانه',
   'تحلیل پیشرفته، خروجی‌های بیشتر و تم‌های ویژه.',
   'گزارش‌های پیشرفته، قالب‌های خروجی بیشتر، صحنه‌های ویژه‌ی چیبی و برنامه‌ی Study DNA.',
   129000, 30, NULL, 1, 6, 0, 0);

UPDATE system_metadata
SET value = '5', updated_at = unixepoch()
WHERE key = 'schema_version';
