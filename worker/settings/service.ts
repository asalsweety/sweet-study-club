import {
  defaultSubjects,
  subjectSchema,
  userSettingsSchema,
  type Subject,
  type UpdateSettingsInput,
  type UpsertSubjectInput,
  type UserSettings,
} from '../../src/shared/api/settings'
import { subjectsForProfile } from '../../src/shared/lib/education'
import { conflict, notFound } from '../http/errors'

type SettingsRow = {
  friendCode: string
  bio: string | null
  showOnLeaderboard: number
  liveVisibility: string
  timerDisplay: string
  chibiScene: string
  focusMinutes: number
  breakMinutes: number
  longBreakMinutes: number
  rounds: number
  dailyGoalMinutes: number
  notificationsEnabled: number
  konkurDate: string | null
  educationGroup: string | null
  educationStage: string | null
  studyGoals: string | null
  musicLinks: string | null
}

const settingsColumns = `friend_code AS friendCode, bio, show_on_leaderboard AS showOnLeaderboard,
  live_visibility AS liveVisibility, timer_display AS timerDisplay, chibi_scene AS chibiScene,
  pomodoro_focus_minutes AS focusMinutes, pomodoro_break_minutes AS breakMinutes,
  pomodoro_long_break_minutes AS longBreakMinutes, pomodoro_rounds AS rounds,
  daily_goal_minutes AS dailyGoalMinutes, notifications_enabled AS notificationsEnabled,
  konkur_date AS konkurDate, education_group AS educationGroup, education_stage AS educationStage,
  study_goals AS studyGoals, music_links AS musicLinks`

// No 0/O/1/I/L so a code read aloud or typed from a screenshot stays unambiguous.
const codeAlphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateFriendCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (byte) => codeAlphabet[byte % codeAlphabet.length]).join('')
}

function toSettings(row: SettingsRow): UserSettings {
  return userSettingsSchema.parse({
    friendCode: row.friendCode,
    bio: row.bio,
    showOnLeaderboard: row.showOnLeaderboard === 1,
    liveVisibility: row.liveVisibility,
    timerDisplay: row.timerDisplay,
    chibiScene: row.chibiScene,
    pomodoro: {
      focusMinutes: row.focusMinutes,
      breakMinutes: row.breakMinutes,
      longBreakMinutes: row.longBreakMinutes,
      rounds: row.rounds,
    },
    dailyGoalMinutes: row.dailyGoalMinutes,
    notificationsEnabled: row.notificationsEnabled === 1,
    konkurDate: row.konkurDate,
    educationGroup: row.educationGroup,
    educationStage: row.educationStage,
    studyGoals: row.studyGoals ? row.studyGoals.split(',').filter(Boolean) : [],
    musicLinks: parseLinks(row.musicLinks),
  })
}

function parseLinks(raw: string | null) {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export async function getSettings(db: D1Database, userId: string): Promise<UserSettings> {
  const select = db.prepare(`SELECT ${settingsColumns} FROM user_settings WHERE user_id = ?`).bind(userId)
  const existing = await select.first<SettingsRow>()
  if (existing) return toSettings(existing)

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inserted = await db
      .prepare('INSERT OR IGNORE INTO user_settings (user_id, friend_code, updated_at) VALUES (?, ?, ?)')
      .bind(userId, generateFriendCode(), Date.now())
      .run()
    const row = await select.first<SettingsRow>()
    if (row) return toSettings(row)
    if (inserted.meta.changes === 1) break
  }
  throw conflict('SETTINGS_UNAVAILABLE', 'Settings could not be created. Try again.')
}

export async function updateSettings(db: D1Database, userId: string, input: UpdateSettingsInput) {
  await getSettings(db, userId)
  const columns: Record<string, unknown> = {
    bio: input.bio === undefined ? undefined : input.bio || null,
    show_on_leaderboard: input.showOnLeaderboard === undefined ? undefined : Number(input.showOnLeaderboard),
    live_visibility: input.liveVisibility,
    timer_display: input.timerDisplay,
    chibi_scene: input.chibiScene,
    pomodoro_focus_minutes: input.pomodoro?.focusMinutes,
    pomodoro_break_minutes: input.pomodoro?.breakMinutes,
    pomodoro_long_break_minutes: input.pomodoro?.longBreakMinutes,
    pomodoro_rounds: input.pomodoro?.rounds,
    daily_goal_minutes: input.dailyGoalMinutes,
    notifications_enabled: input.notificationsEnabled === undefined ? undefined : Number(input.notificationsEnabled),
    konkur_date: input.konkurDate,
    education_group: input.educationGroup,
    education_stage: input.educationStage,
    study_goals: input.studyGoals === undefined ? undefined : input.studyGoals.join(','),
    music_links: input.musicLinks === undefined ? undefined : JSON.stringify(input.musicLinks),
  }
  // Column names come from the fixed map above, never from the request.
  const entries = Object.entries(columns).filter(([, value]) => value !== undefined)
  if (entries.length > 0) {
    await db
      .prepare(`UPDATE user_settings SET ${entries.map(([key]) => `${key} = ?`).join(', ')}, updated_at = ? WHERE user_id = ?`)
      .bind(...entries.map(([, value]) => value), Date.now(), userId)
      .run()
  }
  return getSettings(db, userId)
}

const subjectColumns = 'id, name, color, emoji, position'

export async function listSubjects(db: D1Database, userId: string): Promise<Subject[]> {
  const read = () =>
    db.prepare(`SELECT ${subjectColumns} FROM user_subjects WHERE user_id = ? ORDER BY position, name`).bind(userId).all()
  let result = await read()
  if (result.results.length === 0) {
    await seedSubjects(db, userId)
    result = await read()
  }
  return result.results.map((row) => subjectSchema.parse(row))
}

/** Default subjects for the person's field (Konkur experimental when unknown). */
async function seedSubjects(db: D1Database, userId: string) {
  const profile = await db
    .prepare('SELECT education_group AS g, education_stage AS s FROM user_settings WHERE user_id = ?')
    .bind(userId)
    .first<{ g: string | null; s: string | null }>()
  const seeds = profile?.g ? subjectsForProfile(profile.g, profile.s) : defaultSubjects
  const now = Date.now()
  await db.batch(
      seeds.map((subject, index) =>
        db
          .prepare('INSERT OR IGNORE INTO user_subjects (id, user_id, name, color, emoji, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(crypto.randomUUID(), userId, subject.name, subject.color, subject.emoji, index, now),
      ),
  )
}

/** Swaps the subject list for the defaults of the person's field. Study history keeps its subject names. */
export async function resetSubjects(db: D1Database, userId: string) {
  await db.prepare('DELETE FROM user_subjects WHERE user_id = ?').bind(userId).run()
  await seedSubjects(db, userId)
  return listSubjects(db, userId)
}

export async function createSubject(db: D1Database, userId: string, input: UpsertSubjectInput) {
  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO user_subjects (id, user_id, name, color, emoji, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, userId, input.name, input.color, input.emoji, input.position ?? 50, Date.now())
    .run()
    .catch(() => {
      throw conflict('SUBJECT_EXISTS', 'You already have a subject with this name.')
    })
  return listSubjects(db, userId)
}

export async function updateSubject(db: D1Database, userId: string, id: string, input: UpsertSubjectInput) {
  const result = await db
    .prepare('UPDATE user_subjects SET name = ?, color = ?, emoji = ?, position = COALESCE(?, position) WHERE id = ? AND user_id = ?')
    .bind(input.name, input.color, input.emoji, input.position ?? null, id, userId)
    .run()
    .catch(() => {
      throw conflict('SUBJECT_EXISTS', 'You already have a subject with this name.')
    })
  if (result.meta.changes === 0) throw notFound('The subject does not exist.')
  return listSubjects(db, userId)
}

export async function deleteSubject(db: D1Database, userId: string, id: string) {
  await db.prepare('DELETE FROM user_subjects WHERE id = ? AND user_id = ?').bind(id, userId).run()
  return listSubjects(db, userId)
}
