import { z } from 'zod'
import { isoDateSchema } from './schedule'

export const plannerItemSchema = z.object({
  id: z.string().min(1),
  date: isoDateSchema,
  kind: z.enum(['task', 'note']),
  title: z.string().min(1).max(120),
  details: z.string().nullable(),
  subjectName: z.string().nullable(),
  plannedMinutes: z.number().int().nullable(),
  plannedTests: z.number().int().nullable(),
  isDone: z.boolean(),
  remindAt: z.iso.datetime().nullable(),
  position: z.number().int(),
})

export const plannerItemsResponseSchema = z.object({
  items: z.array(plannerItemSchema),
})

export const plannerItemResponseSchema = z.object({
  item: plannerItemSchema,
})

const editablePlannerFields = {
  kind: z.enum(['task', 'note']),
  title: z.string().trim().min(1).max(120),
  details: z.string().trim().max(2000).nullable(),
  subjectName: z.string().trim().min(1).max(80).nullable(),
  plannedMinutes: z.number().int().min(1).max(1440).nullable(),
  plannedTests: z.number().int().min(1).max(10000).nullable(),
  remindAt: z.iso.datetime().nullable(),
}

export const createPlannerItemInputSchema = z.object({
  id: z.uuid().optional(),
  date: isoDateSchema,
  ...editablePlannerFields,
})

export const updatePlannerItemInputSchema = z
  .object({
    date: isoDateSchema,
    ...editablePlannerFields,
    isDone: z.boolean(),
    position: z.number().int().min(0).max(10000),
  })
  .partial()

export const plannerRangeQuerySchema = z
  .object({ from: isoDateSchema, to: isoDateSchema })
  .refine((range) => range.from <= range.to, { message: 'from must not be after to' })

export type PlannerItem = z.infer<typeof plannerItemSchema>
export type CreatePlannerItemInput = z.infer<typeof createPlannerItemInputSchema>
export type UpdatePlannerItemInput = z.infer<typeof updatePlannerItemInputSchema>
