/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { URL as NodeURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { leaderboardResponseSchema } from '../../src/shared/api/social'
import { periodStats, type PeriodKind } from '../../src/shared/lib/analytics'
import { createWorkerApp } from '../app'
import { loadPeriodLogs } from '../progress/repository'
import { sqliteD1 } from '../testing/sqlite-d1'
import type { WorkerBindings } from '../types'

const now = Date.parse('2026-11-23T12:00Z')
const app = createWorkerApp({ resolveSession: async () => ({ user: { id: 'me' } }) })
let sqlite: DatabaseSync
let bindings: WorkerBindings

function member(id: string) {
  sqlite.prepare('INSERT INTO user (id, name, email, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)')
    .run(id, id, `${id}@example.test`, now, now)
}

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(now)
  sqlite = new DatabaseSync(':memory:')
  sqlite.exec('PRAGMA foreign_keys = ON')
  const migrations = new NodeURL('../../migrations/', import.meta.url)
  for (const file of readdirSync(migrations).filter(name => /^(000[1-6]|0016|0020|0023)_/.test(name)).sort()) {
    sqlite.exec(readFileSync(new NodeURL(file, migrations), 'utf8'))
  }
  member('me')
  bindings = { APP_ENVIRONMENT: 'test', ASSETS: { fetch: async () => new Response('asset') } as unknown as Fetcher, DB: sqliteD1(sqlite) }
})
afterEach(() => { sqlite.close(); vi.restoreAllMocks() })

async function board(period: PeriodKind = 'day', scope = 'everyone') {
  const response = await app.request(`/api/leaderboard?period=${period}&scope=${scope}`, {}, bindings)
  expect(response.status).toBe(200)
  return leaderboardResponseSchema.parse(await response.json())
}

function log(id: string, seconds: number | null, startedAt = now - 3_600_000) {
  const logId = crypto.randomUUID()
  sqlite.prepare(`INSERT INTO study_logs
    (id, user_id, mode, subject_name, started_at, ended_at, duration_seconds, created_at, updated_at)
    VALUES (?, ?, 'free', 'زیست', ?, ?, ?, ?, ?)`)
    .run(logId, id, startedAt, seconds === null ? null : startedAt + seconds * 1000, seconds, startedAt, now)
  return logId
}

describe('leaderboard', () => {
  it('matches Progress for saved focus and manual study across Tehran midnight, Saturday and the Persian month', async () => {
    log('me', 600, Date.parse('2026-11-20T20:29Z')) // Friday, before both this week and this month
    log('me', 900, Date.parse('2026-11-20T20:30Z')) // Saturday 30 Aban
    log('me', 1200, Date.parse('2026-11-21T20:30Z')) // Sunday 1 Azar
    log('me', 1800, Date.parse('2026-11-22T20:30Z')) // Monday at midnight in Tehran
    log('me', null)
    const manualId = crypto.randomUUID()
    const save = await app.request('/api/study/logs', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recordId: manualId, subjectName: 'زیست', date: '2026-11-23', durationMinutes: 20, startMinute: 480 }) }, bindings)
    expect(save.status).toBe(201)
    for (const [period, seconds] of [['day', 3000], ['week', 5100], ['month', 4200]] as const) {
      const { range, me } = await board(period)
      expect(me?.seconds).toBe(seconds)
      const sessions = await loadPeriodLogs(bindings.DB, 'me', range.from, range.to)
      expect(periodStats(sessions, range.from, range.to).totalSeconds).toBe(me?.seconds)
    }
    expect((await app.request(`/api/study/logs/${manualId}`, { method: 'DELETE' }, bindings)).status).toBe(204)
    expect((await board()).me?.seconds).toBe(1800)
  })

  it('returns the viewer below 200 and when a tie extends beyond the first 50', async () => {
    log('me', 1)
    for (let i = 0; i < 205; i++) {
      const id = `ahead-${String(i).padStart(3, '0')}`
      member(id)
      log(id, 2)
    }
    const first = await board()
    expect(first.entries).toHaveLength(50)
    expect(first.entries.every(entry => entry.rank === 1)).toBe(true)
    expect(first.entries.map(entry => entry.userId)).toEqual(Array.from({ length: 50 }, (_, i) => `ahead-${String(i).padStart(3, '0')}`))
    expect(first.me).toMatchObject({ rank: 206, seconds: 1, isMe: true })
    log('me', 1)
    const tied = await board()
    expect(tied.entries).toEqual(first.entries)
    expect(tied.me).toMatchObject({ rank: 1, seconds: 2, isMe: true })
  })

  it('ranks within the selected audience and excludes hidden, blocked and zero-time members', async () => {
    for (const id of ['friend', 'stranger', 'pending', 'hidden', 'blocked', 'blocker', 'empty']) member(id)
    for (const id of ['hidden', 'blocked', 'blocker', 'pending', 'stranger']) log(id, 90)
    log('friend', 45)
    log('me', 30)
    log('empty', 0)
    const settings = sqlite.prepare('INSERT INTO user_settings (user_id, friend_code, show_on_leaderboard, updated_at) VALUES (?, ?, 0, ?)')
    settings.run('hidden', 'HIDDEN', now)
    const friend = sqlite.prepare('INSERT INTO friendships VALUES (?, ?, ?, ?, ?, ?)')
    friend.run('friend', 'me', 'friend', 'accepted', now, now)
    friend.run('me', 'pending', 'me', 'pending', now, now)
    sqlite.prepare('INSERT INTO user_blocks VALUES (?, ?, ?)').run('me', 'blocked', now)
    sqlite.prepare('INSERT INTO user_blocks VALUES (?, ?, ?)').run('blocker', 'me', now)
    expect((await board()).entries.map(row => [row.userId, row.rank])).toEqual([['pending', 1], ['stranger', 1], ['friend', 3], ['me', 4]])
    const friends = await board('day', 'friends')
    expect(friends.entries.map(row => row.userId)).toEqual(['friend', 'me'])
    expect(friends.entries[0]?.isFriend).toBe(true)
    expect(friends.me?.rank).toBe(2)
    settings.run('me', 'MYCODE', now)
    const hidden = await board('day', 'friends')
    expect(hidden.me).toBeNull()
    expect(hidden.optedIn).toBe(false)
    expect(hidden.entries.map(row => row.userId)).toEqual(['friend'])
  })
})
