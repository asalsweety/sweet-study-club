import { readFileSync } from 'node:fs'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { URL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { feedbackPageSchema } from '../../src/shared/api/feedback'
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
  for (const file of ['0001_foundation', '0002_auth_foundation', '0015_member_feedback']) {
    sqlite.exec(readFileSync(new URL(`../../migrations/${file}.sql`, import.meta.url), 'utf8'))
  }
  for (const [id, name, role] of [['one', 'مینا', 'member'], ['two', 'آوا', 'member'], ['admin', 'مدیر', 'admin']] as const) {
    sqlite.prepare('INSERT INTO user (id, name, email, createdAt, updatedAt, role) VALUES (?, ?, ?, 0, 0, ?)')
      .run(id, name, id + '@example.test', role)
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

function request(path: string, member?: string, input?: unknown) {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (member) headers.set('x-test-user', member)
  return app.request('/api' + path, input === undefined ? { headers } : {
    method: 'POST', headers, body: JSON.stringify(input),
  }, bindings)
}

describe('member feedback', () => {
  it('authenticates senders, validates their message and restricts the inbox to administrators', async () => {
    const requestId = crypto.randomUUID()
    expect((await request('/feedback', undefined, { requestId, message: 'سلام' })).status).toBe(401)
    expect((await request('/admin/feedback')).status).toBe(401)
    expect((await request('/admin/feedback', 'two')).status).toBe(403)
    expect((await request('/feedback', 'one')).status).toBe(404)
    for (const message of [' \n ', 'x'.repeat(2001), '\0hi']) {
      expect((await request('/feedback', 'one', { requestId, message })).status).toBe(400)
    }
    expect((await request('/feedback', 'one', { requestId, message: 'test', userId: 'two' })).status).toBe(400)
    expect((await request('/admin/feedback?before=-2', 'admin')).status).toBe(400)
    const inbox = await request('/admin/feedback', 'admin')
    expect(inbox.headers.get('Cache-Control')).toBe('private, no-store')
    expect(await inbox.json()).toEqual({ items: [], nextCursor: null })
  })

  it('records one entry for concurrent retries and scopes submission IDs to the authenticated sender', async () => {
    const input = { requestId: crypto.randomUUID(), message: '  بازخورد\nتست  ' }
    const replies = await Promise.all([request('/feedback', 'one', input), request('/feedback', 'one', input)])
    for (const reply of replies) {
      expect(reply.status).toBe(201)
      expect(await reply.json()).toEqual({ received: true })
    }
    expect((await request('/feedback', 'one', { ...input, message: 'changed' })).status).toBe(409)
    expect((await request('/feedback', 'two', input)).status).toBe(201)
    const { items } = feedbackPageSchema.parse(await (await request('/admin/feedback', 'admin')).json())
    expect(items.map(({ displayName, message }) => [displayName, message])).toEqual([
      ['آوا', 'بازخورد\nتست'], ['مینا', 'بازخورد\nتست'],
    ])
    sqlite.prepare('DELETE FROM user WHERE id = ?').run('two')
    expect(sqlite.prepare('SELECT COUNT(*) AS total FROM member_feedback').get()?.total).toBe(1)
  })

  it('paginates newest first without moving older entries when new feedback arrives', async () => {
    for (let i = 1; i <= 26; i++) {
      await request('/feedback', 'one', { requestId: crypto.randomUUID(), message: String(i) })
    }
    const first = feedbackPageSchema.parse(await (await request('/admin/feedback', 'admin')).json())
    expect(first.items).toHaveLength(25)
    expect(first.items[0]?.message).toBe('26')
    expect(first.nextCursor).toBe(first.items.at(-1)?.id)
    await request('/feedback', 'two', { requestId: crypto.randomUUID(), message: 'new while reviewing' })
    const second = feedbackPageSchema.parse(await (await request('/admin/feedback?before=' + first.nextCursor, 'admin')).json())
    expect(second.items.map(item => item.message)).toEqual(['1'])
    expect(second.nextCursor).toBeNull()
  })
})
