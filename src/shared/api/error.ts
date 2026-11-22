import { z } from 'zod/mini'

export const apiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().check(z.minLength(1)),
    message: z.string().check(z.minLength(1)),
    requestId: z.optional(z.string().check(z.minLength(1))),
  }),
})

export type ApiErrorEnvelope = z.infer<typeof apiErrorEnvelopeSchema>
