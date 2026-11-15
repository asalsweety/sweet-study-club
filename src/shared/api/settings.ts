import { z } from 'zod'
import { isoDateSchema } from './schedule'
import { pomodoroPlanSchema } from './study-timer'

export const liveVisibilitySchema = z.enum(['everyone', 'friends', 'nobody'])
export const timerDisplaySchema = z.enum(['digital', 'chibi'])
export const chibiSceneSchema = z.enum([
  'night-desk',
  'rainy-window',
  'snow-cabin',
  'sunny-library',
])

export const educationGroupSchema = z.enum(['school', 'medicine', 'dentistry', 'bachelor-medicine', 'pharmacy', 'other'])
export const studyGoalSchema = z.enum(['exam', 'habit', 'focus', 'grades', 'planning', 'friends'])

const musicHosts = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com', 'on.soundcloud.com', 'open.spotify.com']
/** A YouTube, SoundCloud or Spotify link saved for the focus room. */
export const musicLinkSchema = z.object({
  id: z.string().min(1).max(40),
  url: z.string().trim().max(500).url().refine((value) => {
    try {
      const url = new URL(value)
      return url.protocol === 'https:' && musicHosts.includes(url.hostname.toLowerCase())
    } catch {
      return false
    }
  }, 'Only YouTube, SoundCloud and Spotify links are supported.'),
  title: z.string().trim().min(1).max(60),
})

export const userSettingsSchema = z.object({
  friendCode: z.string().min(6).max(12),
  bio: z.string().nullable(),
  showOnLeaderboard: z.boolean(),
  liveVisibility: liveVisibilitySchema,
  timerDisplay: timerDisplaySchema,
  chibiScene: chibiSceneSchema,
  pomodoro: pomodoroPlanSchema,
  dailyGoalMinutes: z.number().int().min(0).max(1440),
  notificationsEnabled: z.boolean(),
  konkurDate: isoDateSchema.nullable(),
  educationGroup: educationGroupSchema.nullable(),
  educationStage: z.string().max(40).nullable(),
  studyGoals: z.array(studyGoalSchema),
  musicLinks: z.array(musicLinkSchema),
})

export const settingsResponseSchema = z.object({
  settings: userSettingsSchema,
})

export const updateSettingsInputSchema = z
  .object({
    bio: z.string().trim().max(280).nullable(),
    showOnLeaderboard: z.boolean(),
    liveVisibility: liveVisibilitySchema,
    timerDisplay: timerDisplaySchema,
    chibiScene: chibiSceneSchema,
    pomodoro: pomodoroPlanSchema,
    dailyGoalMinutes: z.number().int().min(0).max(1440),
    notificationsEnabled: z.boolean(),
    konkurDate: isoDateSchema.nullable(),
    educationGroup: educationGroupSchema,
    educationStage: z.string().trim().min(1).max(40),
    studyGoals: z.array(studyGoalSchema).max(6),
    musicLinks: z.array(musicLinkSchema).max(8),
  })
  .partial()

export const subjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  emoji: z.string().min(1).max(8),
  position: z.number().int(),
})

export const subjectsResponseSchema = z.object({
  subjects: z.array(subjectSchema),
})

export const upsertSubjectInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  emoji: z.string().trim().min(1).max(8),
  position: z.number().int().min(0).max(100).optional(),
})

export const defaultSubjects = [
  { name: 'زیست', emoji: '🧬', color: '#22c55e' },
  { name: 'شیمی', emoji: '⚗️', color: '#f97316' },
  { name: 'فیزیک', emoji: '🧲', color: '#3b82f6' },
  { name: 'ریاضی', emoji: '📐', color: '#a855f7' },
  { name: 'ادبیات', emoji: '📚', color: '#ec4899' },
  { name: 'عربی', emoji: '🕌', color: '#14b8a6' },
  { name: 'دینی', emoji: '🌙', color: '#eab308' },
  { name: 'زبان', emoji: '🌍', color: '#6366f1' },
] as const

export type UserSettings = z.infer<typeof userSettingsSchema>
export type MusicLink = z.infer<typeof musicLinkSchema>
export type EducationGroupId = z.infer<typeof educationGroupSchema>
export type UpdateSettingsInput = z.infer<typeof updateSettingsInputSchema>
export type Subject = z.infer<typeof subjectSchema>
export type UpsertSubjectInput = z.infer<typeof upsertSubjectInputSchema>
