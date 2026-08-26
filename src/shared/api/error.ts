import { z } from 'zod'

export const apiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: z.string().min(1).optional(),
  }),
})

export type ApiErrorEnvelope = z.infer<typeof apiErrorEnvelopeSchema>
