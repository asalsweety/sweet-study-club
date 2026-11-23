import { completedStudyLogSchema, type CompletedStudyLog, type SyncOfflineTimerInput } from '../../src/shared/api/study-timer'
import { conflict, invalidInput } from '../http/errors'
import { assertScheduledSessionOpen } from '../schedule/service'
import { findActiveTimerRow } from './repository'

const offlineConflict = () => conflict('OFFLINE_TIMER_CONFLICT', 'این جلسه با تایمر دیگری هم‌پوشانی دارد یا روی دستگاه دیگری تغییر کرده است.')

export async function syncOfflineTimer(db: D1Database, userId: string, input: SyncOfflineTimerInput, now = Date.now()) {
  if (input.accountId !== userId) throw conflict('ACCOUNT_CHANGED', 'حساب کاربری تغییر کرده است.')
  const { log, baseVersion } = input
  const started = Date.parse(log.startedAt)
  const ended = Date.parse(log.endedAt)
  if (started < 0 || ended > now + 120_000) throw invalidInput('تاریخ و ساعت دستگاه را بررسی کن.')

  const commandId = `offline:${log.id}`
  const readReceipt = async () => {
    const row = await db.prepare('SELECT response_json AS json FROM study_timer_commands WHERE user_id = ? AND command_id = ?')
      .bind(userId, commandId).first<{ json: string }>()
    if (!row) return null
    const saved = completedStudyLogSchema.parse(JSON.parse(row.json))
    if (JSON.stringify(saved) !== JSON.stringify(completedStudyLogSchema.parse(log))) throw offlineConflict()
    return saved
  }
  const previous = await readReceipt()
  if (previous) return previous

  const timeValues = [ended, log.durationSeconds, log.testCount, log.testsCorrect, log.testsWrong,
    log.focusRating, log.note, now] as const
  let write: D1PreparedStatement
  if (baseVersion === null) {
    if (log.sessionId) await assertScheduledSessionOpen(db, log.sessionId, started)
    // Do not credit a second timer over an interval another device already timed.
    write = db.prepare(`INSERT INTO study_logs (id, user_id, mode, subject_name, title, scheduled_session_id,
      started_at, ended_at, duration_seconds, test_count, tests_correct, tests_wrong, focus_rating, note, updated_at, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM study_logs WHERE user_id = ? AND recorded_manually = 0
        AND started_at < ? AND (ended_at IS NULL OR ended_at > ?))
      ON CONFLICT(id) DO NOTHING`)
      .bind(log.id, userId, log.mode, log.subjectName, log.title, log.sessionId, started, ...timeValues, now, userId, ended, started)
  } else {
    const row = await findActiveTimerRow(db, userId)
    if (!row || row.logId !== log.id || row.version !== baseVersion || row.startedAt !== started ||
      row.sessionId !== log.sessionId || row.mode !== log.mode || row.subjectName !== log.subjectName ||
      log.durationSeconds < row.accumulatedSeconds) {
      const retried = await readReceipt()
      if (retried) return retried
      throw offlineConflict()
    }
    write = db.prepare(`UPDATE study_logs SET ended_at = ?, duration_seconds = ?, test_count = ?, tests_correct = ?,
      tests_wrong = ?, focus_rating = ?, note = ?, updated_at = ?, title = ?
      WHERE id = ? AND user_id = ? AND ended_at IS NULL AND EXISTS (
        SELECT 1 FROM active_study_timers WHERE user_id = ? AND log_id = ? AND version = ?)`).bind(
        ...timeValues, log.title, log.id, userId, userId, log.id, baseVersion)
  }

  const saveReceipt = db.prepare(`INSERT INTO study_timer_commands (user_id, command_id, command_type, response_json, created_at)
      SELECT ?, ?, 'stop', ?, ? WHERE changes() > 0`)
    .bind(userId, commandId, JSON.stringify(log), now)
  const clearTimer = db.prepare('DELETE FROM active_study_timers WHERE user_id = ? AND log_id = ? AND version = ? AND changes() > 0')
    .bind(userId, log.id, baseVersion)
  await db.batch([write, saveReceipt, clearTimer])
  const saved: CompletedStudyLog | null = await readReceipt()
  if (!saved) throw offlineConflict()
  return saved
}
