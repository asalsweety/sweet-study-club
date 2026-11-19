import { z } from 'zod'

export const FEEDBACK_MAX_LENGTH = 2000

export const createFeedbackInputSchema = z.strictObject({
  requestId: z.uuid(),
  message: z.string().trim().min(1).max(FEEDBACK_MAX_LENGTH).refine(message => !message.includes('\0')),
})

export const feedbackReceiptSchema = z.object({ received: z.literal(true) })

export const feedbackPageSchema = z.object({
  items: z.array(z.object({
    id: z.number().int().positive(),
    displayName: z.string(),
    message: z.string(),
    createdAt: z.iso.datetime(),
  })),
  nextCursor: z.number().int().positive().nullable(),
})

export type CreateFeedbackInput = z.infer<typeof createFeedbackInputSchema>
export type FeedbackPage = z.infer<typeof feedbackPageSchema>
