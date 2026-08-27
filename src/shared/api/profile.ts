import { z } from 'zod'

export const profileSchema = z.object({
  id: z.string().min(1),
  email: z.string().min(1),
  displayName: z.string().min(2).max(40),
  avatarUrl: z.string().nullable(),
  role: z.enum(['member', 'admin']),
  theme: z.enum(['light', 'dark', 'system']),
})

export const profileResponseSchema = z.object({
  profile: profileSchema,
})

export const updateProfileInputSchema = z
  .object({
    displayName: z.string().trim().min(2).max(40).optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.displayName !== undefined || input.theme !== undefined,
    { message: 'At least one profile field is required.' },
  )

export type UserProfile = z.infer<typeof profileSchema>
export type UpdateProfileInput = z.infer<
  typeof updateProfileInputSchema
>
