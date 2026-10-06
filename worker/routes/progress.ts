import { Hono, type MiddlewareHandler } from 'hono'
import { z } from 'zod'
import { periodKindSchema } from '../../src/shared/api/progress'
import {
  dailyTotals,
  percentChange,
  periodRanges,
  periodStats,
  streaks,
  type AnalyticsLog,
} from '../../src/shared/lib/analytics'
import { badgeCatalog, earnedBadgeIds, experienceFor, levelProgress, studyDna } from '../../src/shared/lib/gamification'
import { addDays, tehranClock } from '../../src/shared/lib/tehran'
import { readBody, readQuery, userId } from '../http/validation'
import { getSettings } from '../settings/service'
import type { WorkerEnvironment } from '../types'

async function loadLogs(db: D1Database, user: string): Promise<AnalyticsLog[]> {
  const result = await db
    .prepare(
      `SELECT subject_name AS subjectName, started_at AS startedAt, duration_seconds AS durationSeconds,
         test_count AS testCount, tests_correct AS testsCorrect, tests_wrong AS testsWrong
       FROM study_logs WHERE user_id = ? AND ended_at IS NOT NULL ORDER BY started_at LIMIT 20000`,
    )
    .bind(user)
    .all<Omit<AnalyticsLog, 'startedAt'> & { startedAt: number }>()
  return result.results.map((row) => ({ ...row, startedAt: new Date(row.startedAt).toISOString() }))
}

async function gamification(db: D1Database, user: string) {
  const [logs, profile, awards, state] = await Promise.all([
    loadLogs(db, user),
    db.prepare('SELECT role FROM user WHERE id = ?').bind(user).first<{ role: string }>(),
    db.prepare('SELECT badge_id AS id, awarded_at AS awardedAt, seen_at AS seenAt FROM badge_awards WHERE user_id = ?')
      .bind(user)
      .all<{ id: string; awardedAt: number; seenAt: number | null }>(),
    db.prepare('SELECT last_seen_level AS level FROM gamification_state WHERE user_id = ?').bind(user).first<{ level: number }>(),
  ])
  const today = tehranClock(Date.now()).date
  const known = new Map(awards.results.map((award) => [award.id, award]))
  const earned = earnedBadgeIds(logs, today, profile?.role === 'admin')
  const fresh = earned.filter((id) => !known.has(id))
  const now = Date.now()
  if (fresh.length > 0) {
    await db.batch(
      fresh.map((id) =>
        db.prepare('INSERT OR IGNORE INTO badge_awards (user_id, badge_id, awarded_at) VALUES (?, ?, ?)').bind(user, id, now),
      ),
    )
    for (const id of fresh) known.set(id, { id, awardedAt: now, seenAt: null })
  }
  const level = levelProgress(experienceFor(logs))
  const lastSeen = state?.level ?? 1
  return {
    level,
    levelUp: level.level > lastSeen ? { from: lastSeen, to: level.level } : null,
    badges: badgeCatalog.map((badge) => {
      const award = known.get(badge.id)
      return {
        ...badge,
        earned: award !== undefined,
        awardedAt: award ? new Date(award.awardedAt).toISOString() : null,
        seen: award?.seenAt != null,
      }
    }),
  }
}

export function progressRoutes(requireSession: MiddlewareHandler<WorkerEnvironment>) {
  const app = new Hono<WorkerEnvironment>()
  for (const path of ['/progress', '/progress/*', '/gamification', '/gamification/*', '/study-dna']) {
    app.use(path, requireSession)
  }

  app.get('/progress', async (c) => {
    const { period } = readQuery(c, z.object({ period: periodKindSchema.default('week') }))
    const user = userId(c)
    const [logs, settings] = await Promise.all([loadLogs(c.env.DB, user), getSettings(c.env.DB, user)])
    const today = tehranClock(Date.now()).date
    const ranges = periodRanges(period, today)
    const current = periodStats(logs, ranges.current.from, ranges.current.to)
    const previous = periodStats(logs, ranges.previous.from, ranges.previous.to)
    return c.json({
      period,
      current,
      previous,
      change: {
        totalSeconds: percentChange(current.totalSeconds, previous.totalSeconds),
        sessions: percentChange(current.sessions, previous.sessions),
        averageSecondsPerStudyDay: percentChange(current.averageSecondsPerStudyDay, previous.averageSecondsPerStudyDay),
      },
      streak: streaks(logs, today),
      today: { seconds: dailyTotals(logs).get(today)?.seconds ?? 0, goalMinutes: settings.dailyGoalMinutes },
    })
  })

  app.get('/progress/heatmap', async (c) => {
    const { days } = readQuery(c, z.object({ days: z.coerce.number().int().min(7).max(371).default(140) }))
    const today = tehranClock(Date.now()).date
    const stats = periodStats(await loadLogs(c.env.DB, userId(c)), addDays(today, -(days - 1)), today)
    return c.json({ days: stats.byDay })
  })

  app.get('/gamification', async (c) => c.json(await gamification(c.env.DB, userId(c))))

  app.post('/gamification/seen', async (c) => {
    const user = userId(c)
    const input = await readBody(c, z.object({ badgeIds: z.array(z.string().max(40)).max(50), level: z.number().int().min(1).max(100) }))
    const now = Date.now()
    await c.env.DB.batch([
      ...input.badgeIds.map((id) =>
        c.env.DB.prepare('UPDATE badge_awards SET seen_at = ? WHERE user_id = ? AND badge_id = ? AND seen_at IS NULL').bind(now, user, id),
      ),
      c.env.DB.prepare(
        `INSERT INTO gamification_state (user_id, last_seen_level, updated_at) VALUES (?, ?, ?)
         ON CONFLICT (user_id) DO UPDATE SET last_seen_level = MAX(last_seen_level, excluded.last_seen_level), updated_at = excluded.updated_at`,
      ).bind(user, input.level, now),
    ])
    return c.body(null, 204)
  })

  app.get('/study-dna', async (c) => c.json({ dna: studyDna(await loadLogs(c.env.DB, userId(c))) }))

  return app
}
