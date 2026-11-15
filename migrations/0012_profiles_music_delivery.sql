-- Education profile (who the learner is, so subjects, exams and the AI
-- assistant fit them), saved music links for the focus room, time-matched
-- names for the default daily parts, tripled shop prices, and delivery
-- details for physical products such as the printed Sweet planner.

ALTER TABLE user_settings ADD COLUMN education_group TEXT
  CHECK (education_group IS NULL OR education_group IN ('school', 'medicine', 'dentistry', 'bachelor-medicine', 'pharmacy', 'other'));
ALTER TABLE user_settings ADD COLUMN education_stage TEXT
  CHECK (education_stage IS NULL OR length(education_stage) BETWEEN 1 AND 40);
ALTER TABLE user_settings ADD COLUMN study_goals TEXT
  CHECK (study_goals IS NULL OR length(study_goals) <= 200);
ALTER TABLE user_settings ADD COLUMN music_links TEXT
  CHECK (music_links IS NULL OR (length(music_links) <= 4000 AND json_valid(music_links)));

-- Default part names only; titles an admin already changed stay as they are.
UPDATE study_parts SET title = 'سحرخیزها', updated_at = unixepoch() * 1000 WHERE id = 'part-01' AND title = 'پارت ۱';
UPDATE study_parts SET title = 'صبح تازه', updated_at = unixepoch() * 1000 WHERE id = 'part-02' AND title = 'پارت ۲';
UPDATE study_parts SET title = 'اوج صبح', updated_at = unixepoch() * 1000 WHERE id = 'part-03' AND title = 'پارت ۳';
UPDATE study_parts SET title = 'پیش از ظهر', updated_at = unixepoch() * 1000 WHERE id = 'part-04' AND title = 'پارت ۴';
UPDATE study_parts SET title = 'ظهر آرام', updated_at = unixepoch() * 1000 WHERE id = 'part-05' AND title = 'پارت ۵';
UPDATE study_parts SET title = 'بعدازظهر پرانرژی', updated_at = unixepoch() * 1000 WHERE id = 'part-06' AND title = 'پارت ۶';
UPDATE study_parts SET title = 'عصرانه', updated_at = unixepoch() * 1000 WHERE id = 'part-07' AND title = 'پارت ۷';
UPDATE study_parts SET title = 'غروب طلایی', updated_at = unixepoch() * 1000 WHERE id = 'part-08' AND title = 'پارت ۸';
UPDATE study_parts SET title = 'سرِ شب', updated_at = unixepoch() * 1000 WHERE id = 'part-09' AND title = 'پارت ۹';
UPDATE study_parts SET title = 'شب‌زنده‌دارها', updated_at = unixepoch() * 1000 WHERE id = 'part-10' AND title = 'پارت ۱۰';

UPDATE shop_products SET price_toman = price_toman * 3, updated_at = unixepoch() * 1000;

ALTER TABLE shop_products ADD COLUMN requires_delivery INTEGER NOT NULL DEFAULT 0
  CHECK (requires_delivery IN (0, 1));
UPDATE shop_products SET requires_delivery = 1,
  summary = 'پلنر چاپی Sweet با قالب‌های روزانه و ماهانه؛ تحویل حضوری یا ارسال پستی.',
  updated_at = unixepoch() * 1000
WHERE id = 'prod-planner';

ALTER TABLE shop_orders ADD COLUMN delivery_method TEXT
  CHECK (delivery_method IS NULL OR delivery_method IN ('pickup', 'shipping'));
ALTER TABLE shop_orders ADD COLUMN delivery_details TEXT
  CHECK (delivery_details IS NULL OR (length(delivery_details) <= 1500 AND json_valid(delivery_details)));

UPDATE system_metadata SET value = '12', updated_at = unixepoch() WHERE key = 'schema_version';
