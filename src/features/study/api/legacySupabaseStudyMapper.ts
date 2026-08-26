import { z } from 'zod'
import type {
  ActiveStudyState,
  StudySession,
} from '../../../entities/study/model'

const legacyStudySessionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  session_date: z.string().min(1),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
  is_cancelled: z.boolean(),
})

const legacyActiveStudyStateSchema = z.object({
  user_id: z.string().min(1),
  log_id: z.string().min(1),
  mode: z.enum(['free', 'scheduled', 'pomodoro']),
  subject_name: z.string().min(1),
  session_id: z.string().nullable(),
  timer_status: z.enum(['running', 'paused']),
  started_at: z.string().min(1),
  current_segment_started_at: z.string().nullable(),
  paused_at: z.string().nullable(),
  accumulated_seconds: z.number().nonnegative(),
  focus_lock_enabled: z.boolean(),
})

const legacyStopTimerResultSchema = z
  .array(
    z.object({
      final_duration_seconds: z.number().nonnegative(),
    }),
  )
  .min(1)

export function mapLegacyStudySession(value: unknown): StudySession {
  const session = legacyStudySessionSchema.parse(value)

  return {
    id: session.id,
    title: session.title,
    sessionDate: session.session_date,
    startsAt: session.starts_at,
    endsAt: session.ends_at,
    isCancelled: session.is_cancelled,
  }
}

export function mapLegacyActiveStudyState(
  value: unknown,
): ActiveStudyState {
  const state = legacyActiveStudyStateSchema.parse(value)

  return {
    userId: state.user_id,
    logId: state.log_id,
    mode: state.mode,
    subjectName: state.subject_name,
    sessionId: state.session_id,
    timerStatus: state.timer_status,
    startedAt: state.started_at,
    currentSegmentStartedAt: state.current_segment_started_at,
    pausedAt: state.paused_at,
    accumulatedSeconds: state.accumulated_seconds,
    focusLockEnabled: state.focus_lock_enabled,
  }
}

export function readLegacyStopDuration(value: unknown) {
  const result = legacyStopTimerResultSchema.safeParse(value)
  return result.success
    ? result.data.at(0)?.final_duration_seconds
    : undefined
}
