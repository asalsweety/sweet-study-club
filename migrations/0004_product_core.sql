-- Product core: personal settings, admin-managed study parts, pomodoro and
-- test tracking on study logs, and the personal daily/monthly planner.
-- All timestamps are epoch milliseconds; calendar dates are Tehran-local
-- YYYY-MM-DD strings because the product schedule is defined in Tehran time.

CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  friend_code TEXT NOT NULL UNIQUE CHECK (length(friend_code) BETWEEN 6 AND 12),
  bio TEXT CHECK (bio IS NULL OR length(bio) <= 280),
  show_on_leaderboard INTEGER NOT NULL DEFAULT 1 CHECK (show_on_leaderboard IN (0, 1)),
  live_visibility TEXT NOT NULL DEFAULT 'friends'
    CHECK (live_visibility IN ('everyone', 'friends', 'nobody')),
  timer_display TEXT NOT NULL DEFAULT 'digital'
    CHECK (timer_display IN ('digital', 'chibi')),
  chibi_scene TEXT NOT NULL DEFAULT 'night-desk'
    CHECK (chibi_scene IN ('night-desk', 'rainy-window', 'snow-cabin', 'sunny-library')),
  pomodoro_focus_minutes INTEGER NOT NULL DEFAULT 25
    CHECK (pomodoro_focus_minutes BETWEEN 5 AND 180),
  pomodoro_break_minutes INTEGER NOT NULL DEFAULT 5
    CHECK (pomodoro_break_minutes BETWEEN 1 AND 60),
  pomodoro_long_break_minutes INTEGER NOT NULL DEFAULT 15
    CHECK (pomodoro_long_break_minutes BETWEEN 1 AND 90),
  pomodoro_rounds INTEGER NOT NULL DEFAULT 4
    CHECK (pomodoro_rounds BETWEEN 1 AND 12),
  daily_goal_minutes INTEGER NOT NULL DEFAULT 240
    CHECK (daily_goal_minutes BETWEEN 0 AND 1440),
  notifications_enabled INTEGER NOT NULL DEFAULT 1
    CHECK (notifications_enabled IN (0, 1)),
  updated_at INTEGER NOT NULL
);

CREATE TABLE study_parts (
  id TEXT PRIMARY KEY NOT NULL,
  position INTEGER NOT NULL UNIQUE CHECK (position BETWEEN 1 AND 50),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  start_minute INTEGER NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
  end_minute INTEGER NOT NULL CHECK (end_minute BETWEEN 1 AND 1440),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (end_minute > start_minute)
);

-- A row with part_id NULL marks the whole date as a holiday.
CREATE TABLE schedule_overrides (
  id TEXT PRIMARY KEY NOT NULL,
  override_date TEXT NOT NULL
    CHECK (override_date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  part_id TEXT REFERENCES study_parts (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('holiday', 'cancelled')),
  note TEXT CHECK (note IS NULL OR length(note) <= 200),
  created_by TEXT REFERENCES "user" (id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  CHECK ((kind = 'holiday' AND part_id IS NULL) OR (kind = 'cancelled' AND part_id IS NOT NULL))
);

CREATE UNIQUE INDEX schedule_overrides_date_part_uidx
  ON schedule_overrides (override_date, COALESCE(part_id, ''));

ALTER TABLE study_logs ADD COLUMN test_count INTEGER NOT NULL DEFAULT 0
  CHECK (test_count BETWEEN 0 AND 10000);
ALTER TABLE study_logs ADD COLUMN note TEXT
  CHECK (note IS NULL OR length(note) <= 500);
ALTER TABLE study_logs ADD COLUMN pomodoro_focus_minutes INTEGER
  CHECK (pomodoro_focus_minutes IS NULL OR pomodoro_focus_minutes BETWEEN 5 AND 180);
ALTER TABLE study_logs ADD COLUMN pomodoro_break_minutes INTEGER
  CHECK (pomodoro_break_minutes IS NULL OR pomodoro_break_minutes BETWEEN 1 AND 60);
ALTER TABLE study_logs ADD COLUMN pomodoro_long_break_minutes INTEGER
  CHECK (pomodoro_long_break_minutes IS NULL OR pomodoro_long_break_minutes BETWEEN 1 AND 90);
ALTER TABLE study_logs ADD COLUMN pomodoro_rounds INTEGER
  CHECK (pomodoro_rounds IS NULL OR pomodoro_rounds BETWEEN 1 AND 12);

-- Pomodoro breaks are stored as the paused state with phase = 'break', so
-- break time never counts as study time and recovery after refresh is exact.
ALTER TABLE active_study_timers ADD COLUMN pomodoro_phase TEXT
  CHECK (pomodoro_phase IS NULL OR pomodoro_phase IN ('focus', 'break'));
ALTER TABLE active_study_timers ADD COLUMN pomodoro_round INTEGER
  CHECK (pomodoro_round IS NULL OR pomodoro_round BETWEEN 1 AND 12);
ALTER TABLE active_study_timers ADD COLUMN phase_started_at INTEGER;

CREATE INDEX study_logs_user_ended_subject_idx
  ON study_logs (user_id, ended_at, subject_name)
  WHERE ended_at IS NOT NULL;

CREATE TABLE planner_items (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  plan_date TEXT NOT NULL
    CHECK (plan_date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  kind TEXT NOT NULL CHECK (kind IN ('task', 'note')),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  details TEXT CHECK (details IS NULL OR length(details) <= 2000),
  subject_name TEXT CHECK (subject_name IS NULL OR length(subject_name) BETWEEN 1 AND 80),
  planned_minutes INTEGER CHECK (planned_minutes IS NULL OR planned_minutes BETWEEN 1 AND 1440),
  planned_tests INTEGER CHECK (planned_tests IS NULL OR planned_tests BETWEEN 1 AND 10000),
  is_done INTEGER NOT NULL DEFAULT 0 CHECK (is_done IN (0, 1)),
  remind_at INTEGER,
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX planner_items_user_date_idx
  ON planner_items (user_id, plan_date, position);
CREATE INDEX planner_items_user_remind_idx
  ON planner_items (user_id, remind_at)
  WHERE remind_at IS NOT NULL AND is_done = 0;

-- Default ten-part daily template. Admins can edit it at any time.
INSERT INTO study_parts (id, position, title, start_minute, end_minute, is_active, created_at, updated_at) VALUES
  ('part-01', 1, 'پارت ۱', 360, 435, 1, 0, 0),
  ('part-02', 2, 'پارت ۲', 450, 525, 1, 0, 0),
  ('part-03', 3, 'پارت ۳', 540, 615, 1, 0, 0),
  ('part-04', 4, 'پارت ۴', 630, 705, 1, 0, 0),
  ('part-05', 5, 'پارت ۵', 720, 780, 1, 0, 0),
  ('part-06', 6, 'پارت ۶', 840, 915, 1, 0, 0),
  ('part-07', 7, 'پارت ۷', 930, 1005, 1, 0, 0),
  ('part-08', 8, 'پارت ۸', 1020, 1095, 1, 0, 0),
  ('part-09', 9, 'پارت ۹', 1110, 1185, 1, 0, 0),
  ('part-10', 10, 'پارت ۱۰', 1200, 1275, 1, 0, 0);

UPDATE system_metadata
SET value = '4', updated_at = unixepoch()
WHERE key = 'schema_version';
