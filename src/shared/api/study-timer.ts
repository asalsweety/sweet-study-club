import { z } from 'zod'

export const timerModeSchema = z.enum(['free', 'scheduled', 'pomodoro'])
const studyTitleSchema = z.string().trim().min(1).max(120)

export const pomodoroPlanSchema = z.object({
  focusMinutes: z.number().int().min(5).max(180),
  breakMinutes: z.number().int().min(1).max(60),
  longBreakMinutes: z.number().int().min(1).max(90),
  rounds: z.number().int().min(1).max(12),
})

export const pomodoroStateSchema = z.object({
  plan: pomodoroPlanSchema,
  phase: z.enum(['focus', 'break']),
  round: z.number().int().min(1).max(12),
  phaseStartedAt: z.iso.datetime(),
  interruptedFocusSeconds: z.number().int().nonnegative().nullable().default(null),
})

export const studyTimerStateSchema = z.object({
  logId: z.string().min(1),
  mode: timerModeSchema,
  subjectName: z.string().min(1).max(80),
  title: studyTitleSchema.nullable().default(null),
  sessionId: z.string().nullable(),
  timerStatus: z.enum(['running', 'paused']),
  startedAt: z.iso.datetime(),
  currentSegmentStartedAt: z.iso.datetime().nullable(),
  pausedAt: z.iso.datetime().nullable(),
  accumulatedSeconds: z.number().int().nonnegative(),
  focusLockEnabled: z.boolean(),
  testCount: z.number().int().min(0).max(10000),
  pomodoro: pomodoroStateSchema.nullable(),
  version: z.number().int().positive(),
})

export const studyTimerStateResponseSchema = z.object({
  timer: studyTimerStateSchema.nullable(),
})

const commandIdSchema = z.uuid()

export const startTimerInputSchema = z
  .object({
    commandId: commandIdSchema,
    mode: timerModeSchema,
    subjectName: z.string().trim().min(1).max(80),
    title: studyTitleSchema.optional(),
    sessionId: z.string().min(1).max(80).nullable(),
    focusLockEnabled: z.boolean(),
    pomodoro: pomodoroPlanSchema.nullable(),
  })
  .superRefine((input, context) => {
    if ((input.mode === 'scheduled') !== (input.sessionId !== null)) {
      context.addIssue({
        code: 'custom',
        path: ['sessionId'],
        message: 'Only scheduled study has a session.',
      })
    }

    if ((input.mode === 'pomodoro') !== (input.pomodoro !== null)) {
      context.addIssue({
        code: 'custom',
        path: ['pomodoro'],
        message: 'Only pomodoro study has a pomodoro plan.',
      })
    }
  })

export const timerCommandInputSchema = z.object({
  commandId: commandIdSchema,
  expectedVersion: z.number().int().positive(),
})

export const updateTimerInputSchema = timerCommandInputSchema.extend({
  testCount: z.number().int().min(0).max(10000).optional(),
  focusLockEnabled: z.boolean().optional(),
})

export const stopTimerInputSchema = timerCommandInputSchema
  .extend({
    testCount: z.number().int().min(0).max(10000),
    testsCorrect: z.number().int().min(0).max(10000),
    testsWrong: z.number().int().min(0).max(10000),
    focusRating: z.number().int().min(1).max(5).nullable(),
    title: studyTitleSchema.nullable().optional(),
    note: z.string().trim().max(500).nullable(),
  })
  .refine((input) => input.testsCorrect + input.testsWrong <= input.testCount, {
    path: ['testsCorrect'],
    message: 'Correct and wrong answers cannot exceed the tests answered.',
  })

export const completedStudyLogSchema = z.object({
  id: z.string().min(1),
  mode: timerModeSchema,
  subjectName: z.string().min(1).max(80),
  title: studyTitleSchema.nullable().default(null),
  recordedManually: z.boolean().default(false),
  sessionId: z.string().nullable(),
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime(),
  durationSeconds: z.number().int().nonnegative(),
  testCount: z.number().int().min(0),
  testsCorrect: z.number().int().min(0),
  testsWrong: z.number().int().min(0),
  focusRating: z.number().int().min(1).max(5).nullable(),
  note: z.string().nullable(),
})

export const stopTimerResponseSchema = z.object({
  log: completedStudyLogSchema,
})

export const studyLogListResponseSchema = z.object({
  logs: z.array(completedStudyLogSchema),
})

export const manualStudyLogInputSchema = z.object({
  recordId: z.uuid(),
  subjectName: z.string().trim().min(1).max(80),
  title: studyTitleSchema.optional(),
  date: z.iso.date(),
  startMinute: z.number().int().min(0).max(1439).optional(),
  durationMinutes: z.number().int().min(1).max(1440),
})

export type TimerMode = z.infer<typeof timerModeSchema>
export type PomodoroPlan = z.infer<typeof pomodoroPlanSchema>
export type StudyTimerState = z.infer<typeof studyTimerStateSchema>
export type StartTimerInput = z.infer<typeof startTimerInputSchema>
export type TimerCommandInput = z.infer<typeof timerCommandInputSchema>
export type UpdateTimerInput = z.infer<typeof updateTimerInputSchema>
export type StopTimerInput = z.infer<typeof stopTimerInputSchema>
export type CompletedStudyLog = z.infer<typeof completedStudyLogSchema>
export type ManualStudyLogInput = z.infer<typeof manualStudyLogInputSchema>
