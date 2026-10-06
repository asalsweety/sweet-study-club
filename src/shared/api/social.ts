import { z } from 'zod'

export const presenceStatusSchema = z.enum(['studying', 'break', 'online', 'offline'])

export const personSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
})

export const friendSchema = personSchema.extend({
  status: presenceStatusSchema,
  subjectName: z.string().nullable(),
  studyingSince: z.iso.datetime().nullable(),
  todaySeconds: z.number().int().nonnegative(),
})

export const friendRequestSchema = personSchema.extend({
  createdAt: z.iso.datetime(),
})

export const friendsResponseSchema = z.object({
  friends: z.array(friendSchema),
  incoming: z.array(friendRequestSchema),
  outgoing: z.array(friendRequestSchema),
  blocked: z.array(personSchema),
})

export const friendCodeInputSchema = z.object({
  friendCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6,12}$/),
})

export const inviteResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.iso.datetime(),
})

export const inviteTokenInputSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{20,80}$/),
})

export const targetUserInputSchema = z.object({
  userId: z.string().min(1).max(64),
})

export const respondRequestInputSchema = targetUserInputSchema.extend({
  accept: z.boolean(),
})

export const liveScopeSchema = z.enum(['friends', 'everyone'])

export const livePersonSchema = friendSchema.extend({
  isFriend: z.boolean(),
  elapsedSeconds: z.number().int().nonnegative(),
})

export const liveResponseSchema = z.object({
  people: z.array(livePersonSchema),
  counts: z.object({ studying: z.number(), online: z.number(), offline: z.number() }),
})

export const leaderboardPeriodSchema = z.enum(['day', 'week', 'month'])

export const leaderboardEntrySchema = personSchema.extend({
  rank: z.number().int().positive(),
  seconds: z.number().int().nonnegative(),
  isMe: z.boolean(),
  isFriend: z.boolean(),
})

export const leaderboardResponseSchema = z.object({
  period: leaderboardPeriodSchema,
  scope: liveScopeSchema,
  entries: z.array(leaderboardEntrySchema),
  me: leaderboardEntrySchema.nullable(),
  optedIn: z.boolean(),
})

export const cheerInputSchema = targetUserInputSchema.extend({
  emoji: z.enum(['💖', '🔥', '👏', '🌟', '☕']),
})

export const cheerSchema = z.object({
  id: z.string(),
  from: personSchema,
  emoji: z.string(),
  createdAt: z.iso.datetime(),
})

export const cheersResponseSchema = z.object({
  cheers: z.array(cheerSchema),
})

export type PresenceStatus = z.infer<typeof presenceStatusSchema>
export type Person = z.infer<typeof personSchema>
export type Friend = z.infer<typeof friendSchema>
export type FriendRequest = z.infer<typeof friendRequestSchema>
export type FriendsResponse = z.infer<typeof friendsResponseSchema>
export type LivePerson = z.infer<typeof livePersonSchema>
export type LiveResponse = z.infer<typeof liveResponseSchema>
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>
export type Cheer = z.infer<typeof cheerSchema>
