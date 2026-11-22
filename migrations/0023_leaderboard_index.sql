CREATE INDEX study_logs_leaderboard_period_idx
  ON study_logs (started_at, user_id, duration_seconds)
  WHERE ended_at IS NOT NULL AND duration_seconds > 0;

UPDATE system_metadata SET value = '23', updated_at = unixepoch() WHERE key = 'schema_version';
