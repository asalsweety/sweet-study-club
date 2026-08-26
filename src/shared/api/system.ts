import { z } from 'zod'

export const serviceStatusSchema = z.object({
  service: z.literal('sweet-study-club-api'),
  status: z.enum(['ok', 'unavailable']),
  environment: z.string().min(1),
  timestamp: z.string().datetime(),
  requestId: z.string().min(1),
})

export type ServiceStatus = z.infer<typeof serviceStatusSchema>
