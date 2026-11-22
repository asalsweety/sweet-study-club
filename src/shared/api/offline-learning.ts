import { z } from 'zod'
import { attemptItemSchema, questionSourceSchema, topicSchema, trackSchema } from './learning'

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/)

export const offlinePackRequestSchema = z.object({
  cursor: id.optional(),
})

export const offlinePackInfoSchema = z.object({
  id,
  title: z.string(),
  track: trackSchema,
  isSample: z.boolean(),
  attribution: z.string(),
})

export const offlineQuestionSchema = attemptItemSchema.pick({
  questionId: true,
  subjectId: true,
  chapter: true,
  prompt: true,
  options: true,
  images: true,
  language: true,
}).extend({
  source: questionSourceSchema.nullable(),
  topic: topicSchema.nullable(),
})

export const offlinePackPageSchema = z.object({
  pack: offlinePackInfoSchema,
  questions: z.array(offlineQuestionSchema),
  next: id.nullable(),
})

export type OfflinePackInfo = z.infer<typeof offlinePackInfoSchema>
export type OfflineQuestion = z.infer<typeof offlineQuestionSchema>
export type OfflinePackPage = z.infer<typeof offlinePackPageSchema>
