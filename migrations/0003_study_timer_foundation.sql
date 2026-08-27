CREATE TABLE study_logs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('free', 'scheduled', 'pomodoro')),
  subject_name TEXT NOT NULL CHECK (length(subject_name) BETWEEN 1 AND 80),
  scheduled_session_id TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  focus_lock_enabled INTEGER NOT NULL DEFAULT 0 CHECK (focus_lock_enabled IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (
    (mode = 'scheduled' AND scheduled_session_id IS NOT NULL) OR
    (mode != 'scheduled' AND scheduled_session_id IS NULL)
  ),
  CHECK (
    (ended_at IS NULL AND duration_seconds IS NULL) OR
    (ended_at IS NOT NULL AND duration_seconds IS NOT NULL)
  )
);

CREATE TABLE active_study_timers (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  log_id TEXT NOT NULL UNIQUE REFERENCES study_logs (id) ON DELETE CASCADE,
  timer_status TEXT NOT NULL CHECK (timer_status IN ('running', 'paused')),
  current_segment_started_at INTEGER,
  paused_at INTEGER,
  accumulated_seconds INTEGER NOT NULL DEFAULT 0 CHECK (accumulated_seconds >= 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  last_command_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (
    (timer_status = 'running' AND current_segment_started_at IS NOT NULL AND paused_at IS NULL) OR
    (timer_status = 'paused' AND current_segment_started_at IS NULL AND paused_at IS NOT NULL)
  )
);

CREATE TABLE study_timer_commands (
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  command_id TEXT NOT NULL,
  command_type TEXT NOT NULL CHECK (command_type IN ('start', 'pause', 'resume', 'stop')),
  response_json TEXT NOT NULL CHECK (json_valid(response_json)),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, command_id)
);

CREATE INDEX study_logs_user_started_idx
  ON study_logs (user_id, started_at DESC);
CREATE INDEX study_logs_user_ended_idx
  ON study_logs (user_id, ended_at DESC)
  WHERE ended_at IS NOT NULL;
CREATE INDEX study_timer_commands_created_idx
  ON study_timer_commands (created_at);

UPDATE system_metadata
SET value = '3', updated_at = unixepoch()
WHERE key = 'schema_version';
