import { z } from 'zod'

const dayTotalSchema = z.object({
  date: z.string(),
  seconds: z.number(),
  sessions: z.number(),
  tests: z.number(),
})

export const periodStatsSchema = z.object({
  from: z.string(),
  to: z.string(),
  totalSeconds: z.number(),
  sessions: z.number(),
  studyDays: z.number(),
  averageSecondsPerStudyDay: z.number(),
  bestDay: z.object({ date: z.string(), seconds: z.number() }).nullable(),
  longestSessionSeconds: z.number(),
  favoriteSubject: z.string().nullable(),
  tests: z.object({
    total: z.number(),
    correct: z.number(),
    wrong: z.number(),
    percent: z.number().nullable(),
  }),
  bySubject: z.array(
    z.object({ name: z.string(), seconds: z.number(), tests: z.number(), percent: z.number().nullable() }),
  ),
  byDay: z.array(dayTotalSchema),
})

export const periodKindSchema = z.enum(['day', 'week', 'month'])

export const progressResponseSchema = z.object({
  period: periodKindSchema,
  current: periodStatsSchema,
  previous: periodStatsSchema,
  change: z.object({
    totalSeconds: z.number().nullable(),
    sessions: z.number().nullable(),
    averageSecondsPerStudyDay: z.number().nullable(),
  }),
  streak: z.object({ current: z.number(), best: z.number() }),
  today: z.object({ seconds: z.number(), goalMinutes: z.number() }),
})

export const heatmapResponseSchema = z.object({
  days: z.array(dayTotalSchema),
})

export const badgeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  emoji: z.string(),
  tier: z.enum(['bronze', 'silver', 'gold', 'special']),
  earned: z.boolean(),
  awardedAt: z.iso.datetime().nullable(),
  seen: z.boolean(),
})

export const gamificationResponseSchema = z.object({
  level: z.object({
    level: z.number(),
    experience: z.number(),
    levelStart: z.number(),
    nextLevelAt: z.number(),
    progress: z.number(),
  }),
  badges: z.array(badgeSchema),
  levelUp: z.object({ from: z.number(), to: z.number() }).nullable(),
})

export const studyDnaResponseSchema = z.object({
  dna: z.object({
    chronotype: z.enum(['early-bird', 'afternoon-focus', 'evening-scholar', 'night-owl', 'discovering']),
    style: z.enum(['deep-focus', 'sprint-learner', 'balanced', 'discovering']),
    confidence: z.number(),
    sessionsAnalyzed: z.number(),
    averageSessionMinutes: z.number(),
    preferredHour: z.number().nullable(),
    hourlyMinutes: z.array(z.number()),
  }),
})

export type PeriodKind = z.infer<typeof periodKindSchema>
export type ProgressResponse = z.infer<typeof progressResponseSchema>
export type GamificationResponse = z.infer<typeof gamificationResponseSchema>
export type Badge = z.infer<typeof badgeSchema>
export type StudyDnaResponse = z.infer<typeof studyDnaResponseSchema>
