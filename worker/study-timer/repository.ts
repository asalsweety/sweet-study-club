import { z } from 'zod'
import {
  studyTimerStateSchema,
  type StudyTimerState,
} from '../../src/shared/api/study-timer'

const activeTimerRowSchema = z.object({
  logId: z.string().min(1),
  mode: z.enum(['free', 'scheduled', 'pomodoro']),
  subjectName: z.string().min(1).max(80),
  sessionId: z.string().nullable(),
  timerStatus: z.enum(['running', 'paused']),
  startedAt: z.number().int().nonnegative(),
  currentSegmentStartedAt: z.number().int().nonnegative().nullable(),
  pausedAt: z.number().int().nonnegative().nullable(),
  accumulatedSeconds: z.number().int().nonnegative(),
  focusLockEnabled: z.union([z.literal(0), z.literal(1)]),
  version: z.number().int().positive(),
})

type ActiveTimerRow = z.infer<typeof activeTimerRowSchema>

function toIsoDate(milliseconds: number | null) {
  return milliseconds === null
    ? null
    : new Date(milliseconds).toISOString()
}

export async function findActiveTimerByUserId(
  database: D1Database,
  userId: string,
): Promise<StudyTimerState | null> {
  const value = await database
    .prepare(
      `
        SELECT
          timer.log_id AS logId,
          log.mode,
          log.subject_name AS subjectName,
          log.scheduled_session_id AS sessionId,
          timer.timer_status AS timerStatus,
          log.started_at AS startedAt,
          timer.current_segment_started_at AS currentSegmentStartedAt,
          timer.paused_at AS pausedAt,
          timer.accumulated_seconds AS accumulatedSeconds,
          log.focus_lock_enabled AS focusLockEnabled,
          timer.version
        FROM active_study_timers AS timer
        INNER JOIN study_logs AS log ON log.id = timer.log_id
        WHERE timer.user_id = ?
      `,
    )
    .bind(userId)
    .first<ActiveTimerRow>()

  if (value === null) return null

  const row = activeTimerRowSchema.parse(value)

  return studyTimerStateSchema.parse({
    ...row,
    startedAt: toIsoDate(row.startedAt),
    currentSegmentStartedAt: toIsoDate(
      row.currentSegmentStartedAt,
    ),
    pausedAt: toIsoDate(row.pausedAt),
    focusLockEnabled: row.focusLockEnabled === 1,
  })
}
