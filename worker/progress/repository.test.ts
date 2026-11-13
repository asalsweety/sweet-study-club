/// <reference types="node" />

import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { dailyTotals, periodStats, streaks, streaksFromDays, type AnalyticsLog } from '../../src/shared/lib/analytics'
import { earnedBadgeIds, earnedBadgeIdsFromFacts, experienceFor, studyDna } from '../../src/shared/lib/gamification'
import { loadDayTotals, loadLifetimeTotals, loadPeriodLogs, loadStudyDna } from './repository'

let sqlite: DatabaseSync
let database: D1Database

beforeEach(() => {
  sqlite = new DatabaseSync(':memory:')
  sqlite.exec(`CREATE TABLE study_logs (
    user_id TEXT, subject_name TEXT, started_at INTEGER, ended_at INTEGER, duration_seconds INTEGER,
    test_count INTEGER, tests_correct INTEGER, tests_wrong INTEGER
  )`)
  database = {
    prepare(sql: string) {
      const statement = sqlite.prepare(sql)
      return { bind: (...args: (string | number)[]) => ({
        all: async () => ({ results: statement.all(...args) }),
        first: async () => statement.get(...args) ?? null,
      }) }
    },
  } as unknown as D1Database
})

afterEach(() => sqlite.close())

function insert(user: string, log: AnalyticsLog, completed = true) {
  sqlite.prepare('INSERT INTO study_logs VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    user, log.subjectName, Date.parse(log.startedAt), completed ? Date.parse(log.startedAt) + 1000 : null,
    log.durationSeconds, log.testCount, log.testsCorrect, log.testsWrong,
  )
}

const log = (startedAt: string, durationSeconds = 3601): AnalyticsLog => ({
  subjectName: 'Physics', startedAt, durationSeconds, testCount: 10, testsCorrect: 7, testsWrong: 2,
})

describe('aggregated progress queries', () => {
  it('matches session calculations across Tehran midnight, without other users or unfinished timers', async () => {
    const logs = [
      log('2026-10-02T20:29:59Z', 901), log('2026-10-02T20:30:00Z'),
      log('2026-10-03T08:00:00Z'), log('2026-10-03T23:00:00Z'),
      log('2026-10-04T08:00:00Z'), log('2026-10-05T08:00:00Z'),
    ]
    for (const item of logs) insert('me', item)
    insert('other', log('2026-10-03T08:00:00Z', 99999))
    insert('me', log('2026-10-03T08:00:00Z', 99999), false)
    const days = await loadDayTotals(database, 'me')
    expect(days).toEqual(dailyTotals(logs))
    const streak = streaksFromDays(days, '2026-10-05')
    expect(streak).toEqual(streaks(logs, '2026-10-05'))
    const period = await loadPeriodLogs(database, 'me', '2026-10-03', '2026-10-03')
    expect(periodStats(period, '2026-10-03', '2026-10-03')).toEqual(periodStats(logs, '2026-10-03', '2026-10-03'))
    const bounded = await loadDayTotals(database, 'me', { from: '2026-10-03', to: '2026-10-03' })
    expect([...bounded.keys()]).toEqual(['2026-10-03'])
    const totals = await loadLifetimeTotals(database, 'me')
    expect(totals.experience).toBe(experienceFor(logs))
    expect(earnedBadgeIdsFromFacts({
      totalHours: totals.seconds / 3600, sessions: totals.sessions,
      longestMinutes: totals.longestSeconds / 60, tests: totals.tests, bestStreak: streak.best, isFounder: false,
    })).toEqual(earnedBadgeIds(logs, '2026-10-05', false))
    expect(await loadStudyDna(database, 'me')).toEqual(studyDna(logs))
  })

  it('includes recent sessions after more than 20,000 older records and returns one daily row', async () => {
    const old = log('2025-01-01T08:00:00Z', 60)
    sqlite.exec('BEGIN')
    for (let index = 0; index < 20_001; index++) insert('me', old)
    insert('me', log('2026-10-03T08:00:00Z'))
    sqlite.exec('COMMIT')
    expect(await loadPeriodLogs(database, 'me', '2026-10-03', '2026-10-03')).toHaveLength(1)
    expect((await loadDayTotals(database, 'me')).size).toBe(2)
    expect((await loadLifetimeTotals(database, 'me')).sessions).toBe(20_002)
  })

  it('returns zero aggregates for an empty history', async () => {
    expect((await loadLifetimeTotals(database, 'me')).experience).toBe(0)
    expect(await loadStudyDna(database, 'me')).toEqual(studyDna([]))
    expect((await loadDayTotals(database, 'me')).size).toBe(0)
  })
})
