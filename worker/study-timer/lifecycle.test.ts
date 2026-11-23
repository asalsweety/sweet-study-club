/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { URL as NodeURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stopTimerResponseSchema, studyLogListResponseSchema } from '../../src/shared/api/study-timer'
import { createWorkerApp } from '../app'
import { sqliteD1 } from '../testing/sqlite-d1'
import type { WorkerBindings } from '../types'
import { pauseTimer, resumeTimer, startTimer, stopTimer } from './commands'

let sqlite: DatabaseSync
let bindings: WorkerBindings
const minute = 60_000
const now = Date.UTC(2026, 10, 23, 12)
const app = createWorkerApp({
  resolveSession: async (_bindings, headers) => {
    const id = headers.get('x-test-user')
    return id ? { user: { id } } : null
  },
})

function request(path: string, method = 'GET', body?: unknown, user: string | null = 'member') {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (user !== null) headers.set('x-test-user', user)
  return app.request(`/api/study/logs${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }, bindings)
}

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(now)
  sqlite = new DatabaseSync(':memory:')
  sqlite.exec('PRAGMA foreign_keys = ON')
  const migrations = new NodeURL('../../migrations/', import.meta.url)
  const files = readdirSync(migrations).filter(name => /^(000[1-6]|0020)_.*\.sql$/.test(name)).sort()
  for (const file of files) sqlite.exec(readFileSync(new NodeURL(file, migrations), 'utf8'))
  for (const id of ['member', 'other']) {
    sqlite.prepare('INSERT INTO user (id, name, email, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)')
      .run(id, id, `${id}@example.test`, now, now)
  }
  bindings = { APP_ENVIRONMENT: 'test', ASSETS: { fetch: async () => new Response('asset') } as unknown as Fetcher, DB: sqliteD1(sqlite) }
})
afterEach(() => { sqlite.close(); vi.restoreAllMocks() })

describe('daily study logs', () => {
  it('records a named manual session once, lists it on its Tehran date, and protects deletion', async () => {
    const input = { recordId: crypto.randomUUID(), subjectName: 'زیست', title: 'فصل اول', date: '2026-11-22', startMinute: 480, durationMinutes: 135 }
    const saved = await request('', 'POST', input)
    expect(saved.status).toBe(201)
    const { log } = stopTimerResponseSchema.parse(await saved.json())
    expect(log).toMatchObject({
      title: 'فصل اول', recordedManually: true, durationSeconds: 8100,
      startedAt: '2026-11-22T04:30:00.000Z', endedAt: '2026-11-22T06:45:00.000Z',
    })
    expect(stopTimerResponseSchema.parse(await (await request('', 'POST', input)).json()).log).toEqual(log)
    expect((await request('', 'POST', { ...input, durationMinutes: 5 })).status).toBe(409)
    const day = '?from=2026-11-22&to=2026-11-22'
    expect(studyLogListResponseSchema.parse(await (await request(day)).json()).logs).toEqual([log])
    expect(studyLogListResponseSchema.parse(await (await request(day, 'GET', undefined, 'other')).json()).logs).toEqual([])
    expect((await request(`/${log.id}`, 'DELETE', undefined, null)).status).toBe(401)
    expect((await request(`/${log.id}`, 'DELETE', undefined, 'other')).status).toBe(404)
    expect((await request(`/${log.id}`, 'DELETE')).status).toBe(204)
    expect(studyLogListResponseSchema.parse(await (await request(day)).json()).logs).toEqual([])
  })

  it('rejects future manual sessions and refuses to delete a still-active timer', async () => {
    expect((await request('', 'POST', {
      recordId: crypto.randomUUID(), subjectName: 'Physics', date: '2026-11-23', startMinute: 1439, durationMinutes: 30,
    })).status).toBe(400)
    const timer = await startTimer(bindings.DB, 'member', {
      commandId: crypto.randomUUID(), mode: 'free', subjectName: 'Physics', sessionId: null, focusLockEnabled: false, pomodoro: null,
    })
    expect((await request(`/${timer.logId}`, 'DELETE')).status).toBe(404)
  })
})

describe('pomodoro focus time', () => {
  it('resumes the unfinished round after an early break and advances after completion', async () => {
    const db = bindings.DB
    const command = (expectedVersion: number) => ({ commandId: crypto.randomUUID(), expectedVersion })
    const started = await startTimer(db, 'member', {
      commandId: crypto.randomUUID(), mode: 'pomodoro', subjectName: 'Physics',
      sessionId: null, focusLockEnabled: false,
      pomodoro: { focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15, rounds: 4 },
    }, now)
    const early = (await pauseTimer(db, 'member', command(started.version), now + 10 * minute))!
    expect(early.pomodoro).toMatchObject({ phase: 'break', round: 1, interruptedFocusSeconds: 600 })
    const resumed = (await resumeTimer(db, 'member', command(early.version), now + 20 * minute))!
    expect(resumed.pomodoro).toMatchObject({
      phase: 'focus', round: 1, interruptedFocusSeconds: null, phaseStartedAt: new Date(now + 10 * minute).toISOString(),
    })
    expect(resumed.logId).toBe(started.logId)
    const completed = (await pauseTimer(db, 'member', command(resumed.version), now + 35 * minute))!
    expect(completed.pomodoro?.interruptedFocusSeconds).toBeNull()
    const next = (await resumeTimer(db, 'member', command(completed.version), now + 40 * minute))!
    expect(next.pomodoro?.round).toBe(2)
    const log = await stopTimer(db, 'member', {
      ...command(next.version), title: 'Chapters 1–2', testCount: 0, testsCorrect: 0, testsWrong: 0, focusRating: null, note: null,
    }, now + 45 * minute)
    expect(log).toMatchObject({ id: started.logId, title: 'Chapters 1–2', durationSeconds: 1800, recordedManually: false })
  })
})

describe('offline timer sync', () => {
  function finished(overrides: Record<string, unknown> = {}) {
    return {
      id: crypto.randomUUID(), mode: 'free', subjectName: 'Physics', title: 'Chapter 2', recordedManually: false,
      sessionId: null, startedAt: new Date(now - 30 * minute).toISOString(),
      endedAt: new Date(now - 5 * minute).toISOString(), durationSeconds: 900, testCount: 3,
      testsCorrect: 2, testsWrong: 1, focusRating: 4, note: 'Read and reviewed', ...overrides,
    }
  }

  function upload(accountId: string, log: ReturnType<typeof finished>, baseVersion: number | null = null, cookieUser = 'member', expectedAccount?: string) {
    const headers = new Headers({ 'content-type': 'application/json', 'x-test-user': cookieUser })
    if (expectedAccount) headers.set('X-SweetStudy-Account', expectedAccount)
    return app.request('/api/study/timer/offline', { method: 'POST', headers, body: JSON.stringify({ accountId, log, baseVersion }) }, bindings)
  }

  it('preserves exact timestamps and focused seconds, scopes to the account, and saves a single log across retries', async () => {
    const log = finished()
    expect((await upload('other', log)).status).toBe(409)
    expect((await upload('other', log, null, 'other', 'member')).status).toBe(409)
    expect(stopTimerResponseSchema.parse(await (await upload('member', log)).json()).log).toEqual(log)
    expect(stopTimerResponseSchema.parse(await (await upload('member', log)).json()).log).toEqual(log)
    expect((await upload('member', { ...log, durationSeconds: 901 })).status).toBe(409)
    expect((await upload('member', finished())).status).toBe(409)
    expect((await upload('member', finished({ durationSeconds: 1600 }))).status).toBe(400)
    expect(studyLogListResponseSchema.parse(await (await request('?from=2026-11-23&to=2026-11-23')).json()).logs).toEqual([log])
    expect((await request(`/${log.id}`, 'DELETE')).status).toBe(204)
    expect((await upload('member', log)).status).toBe(200)
    expect(studyLogListResponseSchema.parse(await (await request('?from=2026-11-23&to=2026-11-23')).json()).logs).toEqual([])
  })

  it('requires the version of the same ongoing timer before closing it from offline', async () => {
    const started = await startTimer(bindings.DB, 'member', {
      commandId: crypto.randomUUID(), mode: 'free', subjectName: 'Physics', sessionId: null, focusLockEnabled: false, pomodoro: null,
    }, now - 30 * minute)
    const paused = await pauseTimer(bindings.DB, 'member', { commandId: crypto.randomUUID(), expectedVersion: started.version }, now - 20 * minute)
    const log = finished({ id: started.logId, startedAt: started.startedAt })
    expect((await upload('member', log, started.version)).status).toBe(409)
    expect(stopTimerResponseSchema.parse(await (await upload('member', log, paused!.version)).json()).log).toEqual(log)
    expect((await upload('member', log, paused!.version)).status).toBe(200)
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM active_study_timers').get()).toMatchObject({ count: 0 })
  })
})
