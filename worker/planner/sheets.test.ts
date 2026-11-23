import { readFileSync } from 'node:fs'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { URL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sheetResponseSchema, sheetsResponseSchema } from '../../src/shared/api/sheets'
import { createWorkerApp } from '../app'
import type { WorkerBindings } from '../types'

const app = createWorkerApp({ resolveSession: async (_env, headers) => {
  const id = headers.get('x-test-user')
  return id ? { user: { id } } : null
} })
let sqlite: DatabaseSync
let bindings: WorkerBindings

beforeEach(() => {
  sqlite = new DatabaseSync(':memory:')
  sqlite.exec('PRAGMA foreign_keys = ON')
  for (const file of ['0001_foundation', '0002_auth_foundation', '0018_planner_sheets']) {
    sqlite.exec(readFileSync(new URL(`../../migrations/${file}.sql`, import.meta.url), 'utf8'))
  }
  for (const id of ['one', 'two']) {
    sqlite.prepare('INSERT INTO user (id, name, email, createdAt, updatedAt) VALUES (?, ?, ?, 0, 0)')
      .run(id, id, id + '@example.test')
  }
  bindings = {
    ASSETS: { fetch: async () => new Response() } as unknown as Fetcher,
    DB: {
      prepare: (sql: string) => ({
        bind: (...args: SQLInputValue[]) => ({
          first: async () => sqlite.prepare(sql).get(...args) ?? null,
          all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
          run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...args).changes } }),
        }),
      }),
    } as unknown as D1Database,
  }
})

afterEach(() => sqlite.close())

function request(member: string | null, path = '', method = 'GET', input?: unknown) {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (member) headers.set('x-test-user', member)
  return app.request('/api/planner-sheets' + path, {
    method, headers, ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  }, bindings)
}

describe('planner pages', () => {
  it('rejects stale notebook writes so replay can merge with the newest page', async () => {
    const created = await request('one', '', 'POST', { kind: 'weekly' })
    const { sheet } = sheetResponseSchema.parse(await created.json())
    const updated = await request('one', '/' + sheet.id, 'PUT', { data: { notes: 'اول' }, expectedUpdatedAt: sheet.updatedAt })
    expect(updated.status).toBe(200)
    expect((await request('one', '/' + sheet.id, 'PUT', { data: { notes: 'دوم' }, expectedUpdatedAt: sheet.updatedAt })).status).toBe(409)
    expect(sheetResponseSchema.parse(await (await request('one', '/' + sheet.id)).json()).sheet.data).toEqual({ notes: 'اول' })
  })
  it('creates and reopens pages for both current and legacy clients', async () => {
    expect((await request(null, '', 'POST', { kind: 'chapter' })).status).toBe(401)
    const legacy = await request('one', '', 'POST', { kind: 'weekly' })
    expect(legacy.status).toBe(201)
    const { sheet: oldPage } = sheetResponseSchema.parse(await legacy.json())

    const input = { id: crypto.randomUUID(), kind: 'chapter' }
    const [created, replay] = await Promise.all([
      request('one', '', 'POST', input),
      request('one', '', 'POST', input),
    ])
    expect([created.status, replay.status].sort()).toEqual([200, 201])
    for (const response of [created, replay]) {
      expect(sheetResponseSchema.parse(await response.json()).sheet).toMatchObject({ id: input.id, kind: 'chapter', data: {} })
    }
    const list = sheetsResponseSchema.parse(await (await request('one')).json())
    expect(list.sheets.map(({ id }) => id)).toEqual(expect.arrayContaining([oldPage.id, input.id]))
    expect(list.sheets).toHaveLength(2)
    expect((await request('two', '/' + input.id)).status).toBe(404)
    expect((await request('one', '', 'POST', { ...input, kind: 'daily' })).status).toBe(409)
  })

  it('saves long notes, returns existing edits on a create retry, and keeps them on a size error', async () => {
    const input = { id: crypto.randomUUID(), kind: 'chapter' }
    await request('one', '', 'POST', input)
    const notes = 'ن'.repeat(6000)
    const data = { notes, 'task.done': true }
    expect((await request('one', '/' + input.id, 'PUT', { data, title: 'علوم' })).status).toBe(200)
    const oversized = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`field${index}`, notes]))
    expect((await request('one', '/' + input.id, 'PUT', { data: oversized })).status).toBe(413)
    for (const response of [await request('one', '/' + input.id), await request('one', '', 'POST', input)]) {
      expect(sheetResponseSchema.parse(await response.json()).sheet).toMatchObject({ id: input.id, title: 'علوم', data })
    }
  })

  it('enforces the page limit atomically without blocking a retry for an existing page', async () => {
    sqlite.exec(`WITH RECURSIVE number(n) AS (
      SELECT 1 UNION ALL SELECT n + 1 FROM number WHERE n < 299
    )
    INSERT INTO planner_sheets (id, user_id, kind, title, created_at, updated_at)
    SELECT 'legacy-' || n, 'one', 'daily', 'قدیمی', n, n FROM number`)
    const [first, second] = await Promise.all([crypto.randomUUID(), crypto.randomUUID()].map(async (id) => ({
      id, response: await request('one', '', 'POST', { id, kind: 'daily' }),
    })))
    expect([first!.response.status, second!.response.status].sort()).toEqual([201, 409])
    const saved = first!.response.status === 201 ? first : second
    expect((await request('one', '', 'POST', { id: saved!.id, kind: 'daily' })).status).toBe(200)
    expect(sheetsResponseSchema.parse(await (await request('one')).json()).sheets).toHaveLength(300)
  })
})
