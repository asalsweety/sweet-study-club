import { z } from 'zod'
import {
  completedStudyLogSchema,
  studyTimerStateSchema,
  type CompletedStudyLog,
  type StudyTimerState,
} from '../../src/shared/api/study-timer'

const nullableInt = z.number().int().nonnegative().nullable()

const activeTimerRowSchema = z.object({
  logId: z.string().min(1),
  mode: z.enum(['free', 'scheduled', 'pomodoro']),
  subjectName: z.string().min(1).max(80),
  sessionId: z.string().nullable(),
  timerStatus: z.enum(['running', 'paused']),
  startedAt: z.number().int().nonnegative(),
  currentSegmentStartedAt: nullableInt,
  pausedAt: nullableInt,
  accumulatedSeconds: z.number().int().nonnegative(),
  focusLockEnabled: z.union([z.literal(0), z.literal(1)]),
  testCount: z.number().int().nonnegative(),
  focusMinutes: nullableInt,
  breakMinutes: nullableInt,
  longBreakMinutes: nullableInt,
  rounds: nullableInt,
  phase: z.enum(['focus', 'break']).nullable(),
  round: nullableInt,
  phaseStartedAt: nullableInt,
  version: z.number().int().positive(),
})

export type ActiveTimerRow = z.infer<typeof activeTimerRowSchema>

const iso = (milliseconds: number) => new Date(milliseconds).toISOString()
const isoOrNull = (milliseconds: number | null) =>
  milliseconds === null ? null : iso(milliseconds)

export async function findActiveTimerRow(
  database: D1Database,
  userId: string,
): Promise<ActiveTimerRow | null> {
  const value = await database
    .prepare(
      `SELECT
        timer.log_id AS logId, log.mode, log.subject_name AS subjectName,
        log.scheduled_session_id AS sessionId, timer.timer_status AS timerStatus,
        log.started_at AS startedAt,
        timer.current_segment_started_at AS currentSegmentStartedAt,
        timer.paused_at AS pausedAt, timer.accumulated_seconds AS accumulatedSeconds,
        log.focus_lock_enabled AS focusLockEnabled, log.test_count AS testCount,
        log.pomodoro_focus_minutes AS focusMinutes,
        log.pomodoro_break_minutes AS breakMinutes,
        log.pomodoro_long_break_minutes AS longBreakMinutes,
        log.pomodoro_rounds AS rounds, timer.pomodoro_phase AS phase,
        timer.pomodoro_round AS round, timer.phase_started_at AS phaseStartedAt,
        timer.version
      FROM active_study_timers AS timer
      INNER JOIN study_logs AS log ON log.id = timer.log_id
      WHERE timer.user_id = ?`,
    )
    .bind(userId)
    .first()

  return value === null ? null : activeTimerRowSchema.parse(value)
}

export function toTimerState(row: ActiveTimerRow): StudyTimerState {
  const hasPomodoro =
    row.mode === 'pomodoro' &&
    row.focusMinutes !== null &&
    row.breakMinutes !== null &&
    row.longBreakMinutes !== null &&
    row.rounds !== null &&
    row.phase !== null &&
    row.round !== null &&
    row.phaseStartedAt !== null

  return studyTimerStateSchema.parse({
    logId: row.logId,
    mode: row.mode,
    subjectName: row.subjectName,
    sessionId: row.sessionId,
    timerStatus: row.timerStatus,
    startedAt: iso(row.startedAt),
    currentSegmentStartedAt: isoOrNull(row.currentSegmentStartedAt),
    pausedAt: isoOrNull(row.pausedAt),
    accumulatedSeconds: row.accumulatedSeconds,
    focusLockEnabled: row.focusLockEnabled === 1,
    testCount: row.testCount,
    pomodoro: hasPomodoro
      ? {
          plan: {
            focusMinutes: row.focusMinutes,
            breakMinutes: row.breakMinutes,
            longBreakMinutes: row.longBreakMinutes,
            rounds: row.rounds,
          },
          phase: row.phase,
          round: row.round,
          phaseStartedAt: iso(row.phaseStartedAt as number),
        }
      : null,
    version: row.version,
  })
}

export async function findActiveTimerByUserId(
  database: D1Database,
  userId: string,
): Promise<StudyTimerState | null> {
  const row = await findActiveTimerRow(database, userId)
  return row === null ? null : toTimerState(row)
}

const logRowSchema = z.object({
  id: z.string(),
  mode: z.enum(['free', 'scheduled', 'pomodoro']),
  subjectName: z.string(),
  sessionId: z.string().nullable(),
  startedAt: z.number().int(),
  endedAt: z.number().int(),
  durationSeconds: z.number().int().nonnegative(),
  testCount: z.number().int().nonnegative(),
  testsCorrect: z.number().int().nonnegative(),
  testsWrong: z.number().int().nonnegative(),
  focusRating: z.number().int().min(1).max(5).nullable(),
  note: z.string().nullable(),
})

export const completedLogColumns = `id, mode, subject_name AS subjectName,
  scheduled_session_id AS sessionId, started_at AS startedAt,
  ended_at AS endedAt, duration_seconds AS durationSeconds,
  test_count AS testCount, tests_correct AS testsCorrect,
  tests_wrong AS testsWrong, focus_rating AS focusRating, note`

export function toCompletedLog(value: unknown): CompletedStudyLog {
  const row = logRowSchema.parse(value)
  return completedStudyLogSchema.parse({
    ...row,
    startedAt: iso(row.startedAt),
    endedAt: iso(row.endedAt),
  })
}

export async function listCompletedLogs(
  database: D1Database,
  userId: string,
  fromMs: number,
  toMs: number,
): Promise<CompletedStudyLog[]> {
  const result = await database
    .prepare(
      `SELECT ${completedLogColumns} FROM study_logs
       WHERE user_id = ? AND ended_at IS NOT NULL
         AND started_at >= ? AND started_at < ?
       ORDER BY started_at DESC LIMIT 2000`,
    )
    .bind(userId, fromMs, toMs)
    .all()

  return result.results.map(toCompletedLog)
}
