import { z } from 'zod'

export const studyTimerStateSchema = z.object({
  logId: z.string().min(1),
  mode: z.enum(['free', 'scheduled', 'pomodoro']),
  subjectName: z.string().min(1).max(80),
  sessionId: z.string().nullable(),
  timerStatus: z.enum(['running', 'paused']),
  startedAt: z.iso.datetime(),
  currentSegmentStartedAt: z.iso.datetime().nullable(),
  pausedAt: z.iso.datetime().nullable(),
  accumulatedSeconds: z.number().int().nonnegative(),
  focusLockEnabled: z.boolean(),
  version: z.number().int().positive(),
})

export const studyTimerStateResponseSchema = z.object({
  timer: studyTimerStateSchema.nullable(),
})

export type StudyTimerState = z.infer<typeof studyTimerStateSchema>
