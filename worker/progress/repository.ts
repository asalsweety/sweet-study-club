import type { AnalyticsLog, DayTotal } from '../../src/shared/lib/analytics'
import { studyDnaFromHours } from '../../src/shared/lib/gamification'
import { addDays, startOfTehranDay } from '../../src/shared/lib/tehran'

export async function loadPeriodLogs(db: D1Database, user: string, from: string, to: string): Promise<AnalyticsLog[]> {
  const result = await db.prepare(
    `SELECT subject_name AS subjectName, started_at AS startedAt, duration_seconds AS durationSeconds,
       test_count AS testCount, tests_correct AS testsCorrect, tests_wrong AS testsWrong
     FROM study_logs WHERE user_id = ? AND ended_at IS NOT NULL AND started_at >= ? AND started_at < ?
     ORDER BY started_at`,
  ).bind(user, startOfTehranDay(from), startOfTehranDay(addDays(to, 1)))
    .all<Omit<AnalyticsLog, 'startedAt'> & { startedAt: number }>()
  return result.results.map((row) => ({ ...row, startedAt: new Date(row.startedAt).toISOString() }))
}

export async function loadDayTotals(db: D1Database, user: string, range?: { from: string; to: string }) {
  const bounds = range ? 'AND started_at >= ? AND started_at < ?' : ''
  const values = range ? [startOfTehranDay(range.from), startOfTehranDay(addDays(range.to, 1))] : []
  const result = await db.prepare(
    `SELECT strftime('%Y-%m-%d', started_at / 1000, 'unixepoch', '+210 minutes') AS date,
       SUM(duration_seconds) AS seconds, COUNT(*) AS sessions, SUM(test_count) AS tests
     FROM study_logs WHERE user_id = ? AND ended_at IS NOT NULL ${bounds}
     GROUP BY date ORDER BY date`,
  ).bind(user, ...values).all<DayTotal>()
  return new Map(result.results.map((day) => [day.date, day]))
}

export async function loadLifetimeTotals(db: D1Database, user: string) {
  const result = await db.prepare(
    `SELECT COUNT(*) AS sessions, COALESCE(SUM(duration_seconds), 0) AS seconds,
       COALESCE(MAX(duration_seconds), 0) AS longestSeconds, COALESCE(SUM(test_count), 0) AS tests,
       COALESCE(SUM(CAST(duration_seconds / 60 AS INTEGER) + tests_correct * 2), 0) AS experience
     FROM study_logs WHERE user_id = ? AND ended_at IS NOT NULL`,
  ).bind(user).first<{ sessions: number; seconds: number; longestSeconds: number; tests: number; experience: number }>()
  return result ?? { sessions: 0, seconds: 0, longestSeconds: 0, tests: 0, experience: 0 }
}

export async function loadStudyDna(db: D1Database, user: string) {
  const result = await db.prepare(
    `SELECT CAST(strftime('%H', started_at / 1000, 'unixepoch', '+210 minutes') AS INTEGER) AS hour,
       SUM(duration_seconds) AS seconds, COUNT(*) AS sessions
     FROM study_logs WHERE user_id = ? AND ended_at IS NOT NULL GROUP BY hour`,
  ).bind(user).all<{ hour: number; seconds: number; sessions: number }>()
  const hourly = Array.from({ length: 24 }, () => 0)
  let sessions = 0
  let seconds = 0
  for (const row of result.results) {
    hourly[row.hour] = row.seconds / 60
    sessions += row.sessions
    seconds += row.seconds
  }
  return studyDnaFromHours(hourly, sessions, seconds)
}
