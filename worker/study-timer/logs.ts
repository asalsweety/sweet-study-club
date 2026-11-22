import type { ManualStudyLogInput } from '../../src/shared/api/study-timer'
import { startOfTehranDay, tehranClock, tehranDateMinuteToEpoch } from '../../src/shared/lib/tehran'
import { ApiError, conflict, notFound } from '../http/errors'
import { completedLogColumns, toCompletedLog } from './repository'

export async function recordManualStudyLog(db: D1Database, userId: string, input: ManualStudyLogInput, now = Date.now()) {
  const durationSeconds = input.durationMinutes * 60

  const dayStart = startOfTehranDay(input.date)
  const durationMs = durationSeconds * 1000
  const startedAt = input.startMinute === undefined
    ? Math.min(dayStart + 86_400_000, now) - durationMs
    : tehranDateMinuteToEpoch(input.date, input.startMinute)
  const endedAt = startedAt + durationMs
  if (endedAt > now || startedAt < dayStart || tehranClock(dayStart).date !== input.date) {
    throw new ApiError(400, 'STUDY_LOG_TIME_INVALID', 'زمان پایان مطالعه باید گذشته باشد. تاریخ یا مدت مطالعه را بررسی کن.')
  }

  const result = await db.prepare(
    `INSERT INTO study_logs (id, user_id, mode, subject_name, title, started_at, ended_at, duration_seconds,
      recorded_manually, created_at, updated_at)
     VALUES (?, ?, 'free', ?, ?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT (id) DO NOTHING RETURNING ${completedLogColumns}`,
  ).bind(input.recordId, userId, input.subjectName, input.title ?? null, startedAt, endedAt, durationSeconds, now, now).first()
  if (result !== null) return toCompletedLog(result)
  const saved = await db.prepare(
    `SELECT ${completedLogColumns} FROM study_logs
     WHERE id = ? AND user_id = ? AND recorded_manually = 1 AND ended_at IS NOT NULL`,
  ).bind(input.recordId, userId).first()
  if (saved !== null) {
    const log = toCompletedLog(saved)
    const clock = tehranClock(Date.parse(log.startedAt))
    if (log.subjectName === input.subjectName && log.title === (input.title ?? null) && log.durationSeconds === durationSeconds &&
        clock.date === input.date && (input.startMinute === undefined || clock.minuteOfDay === input.startMinute)) return log
  }
  throw conflict('STUDY_LOG_ID_USED', 'این شناسه برای گزارش دیگری استفاده شده است.')
}

export async function removeCompletedStudyLog(db: D1Database, userId: string, id: string) {
  const result = await db.prepare(
    'DELETE FROM study_logs WHERE id = ? AND user_id = ? AND ended_at IS NOT NULL',
  ).bind(id, userId).run()
  if (!result.meta.changes) throw notFound('گزارش مطالعه پیدا نشد.')
}
