import { z } from 'zod'

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

export const studyPartSchema = z.object({
  id: z.string().min(1),
  position: z.number().int().min(1).max(50),
  title: z.string().min(1).max(80),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
  isActive: z.boolean(),
})

export const scheduledSessionSchema = z.object({
  id: z.string().min(1),
  partId: z.string().min(1),
  title: z.string().min(1),
  sessionDate: isoDateSchema,
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  isCancelled: z.boolean(),
})

export const dayScheduleSchema = z.object({
  date: isoDateSchema,
  isHoliday: z.boolean(),
  holidayNote: z.string().nullable(),
  sessions: z.array(scheduledSessionSchema),
})

export const dayScheduleResponseSchema = z.object({
  schedule: dayScheduleSchema,
})

export const studyPartsResponseSchema = z.object({
  parts: z.array(studyPartSchema),
})

export const upsertStudyPartInputSchema = z
  .object({
    position: z.number().int().min(1).max(50),
    title: z.string().trim().min(1).max(80),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
    isActive: z.boolean(),
  })
  .refine((part) => part.endMinute > part.startMinute, {
    path: ['endMinute'],
    message: 'A part must end after it starts.',
  })

export const scheduleOverrideSchema = z.object({
  id: z.string(),
  date: isoDateSchema,
  partId: z.string().nullable(),
  kind: z.enum(['holiday', 'cancelled']),
  note: z.string().nullable(),
})

export const createOverrideInputSchema = z
  .object({
    date: isoDateSchema,
    partId: z.string().min(1).nullable(),
    kind: z.enum(['holiday', 'cancelled']),
    note: z.string().trim().max(200).nullable(),
  })
  .refine((input) => (input.kind === 'holiday') === (input.partId === null), {
    path: ['partId'],
    message: 'Holidays cover the whole day; cancellations name a part.',
  })

export const overridesResponseSchema = z.object({
  overrides: z.array(scheduleOverrideSchema),
})

export type StudyPart = z.infer<typeof studyPartSchema>
export type ScheduledSession = z.infer<typeof scheduledSessionSchema>
export type DaySchedule = z.infer<typeof dayScheduleSchema>
export type UpsertStudyPartInput = z.infer<typeof upsertStudyPartInputSchema>
export type ScheduleOverride = z.infer<typeof scheduleOverrideSchema>
export type CreateOverrideInput = z.infer<typeof createOverrideInputSchema>
