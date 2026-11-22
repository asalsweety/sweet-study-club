import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { URL } from 'node:url'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { adminBroadcastsSchema, broadcastsSchema, type BroadcastInput } from '../../src/shared/api/shop'
import { createWorkerApp } from '../app'
import { sqliteD1 } from '../testing/sqlite-d1'
import type { WorkerBindings } from '../types'
import { visibleBroadcasts } from './broadcasts'

let sqlite: DatabaseSync
let env: WorkerBindings
const app = createWorkerApp({ resolveSession: async (_env, headers) => {
  const id = headers.get('x-test-user')
  return id ? { user: { id } } : null
} })
function migrate(file: string) {
  sqlite.exec(readFileSync(new URL(`../../migrations/${file}.sql`, import.meta.url), 'utf8'))
}
beforeEach(() => {
  sqlite = new DatabaseSync(':memory:')
  for (const file of ['0001_foundation', '0002_auth_foundation', '0005_social_shop']) migrate(file)
  sqlite.exec(`INSERT INTO user (id, name, email, createdAt, updatedAt, role)
    VALUES ('admin', 'Admin', 'admin@example.test', 0, 0, 'admin'), ('member', 'Member', 'member@example.test', 0, 0, 'member');
    INSERT INTO broadcasts (id, title, body, created_at) VALUES ('old', 'Legacy notice', 'Body', 0)`)
  migrate('0022_broadcast_display')
  migrate('0024_broadcast_popups')
  env = { ASSETS: { fetch: async () => new Response() } as unknown as Fetcher, DB: sqliteD1(sqlite) }
})
afterEach(() => sqlite.close())
function request(path: string, method: string, who?: string, input?: unknown) {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (who) headers.set('x-test-user', who)
  return app.request('/api' + path, { method, headers, ...(input === undefined ? {} : { body: JSON.stringify(input) }) }, env)
}
const input: BroadcastInput = {
  title: 'Migration', body: 'The server is moving.', startsAt: null, expiresAt: null,
  tone: 'maintenance', published: true, pinned: true, destination: 'feedback',
}
const adminList = async () => adminBroadcastsSchema.parse(await (await request('/admin/broadcasts', 'GET', 'admin')).json()).broadcasts
const memberList = async () => broadcastsSchema.parse(await (await request('/broadcasts', 'GET', 'member')).json()).broadcasts

it('keeps legacy notices visible, respects the scheduled interval and removes a paused notice from member responses', async () => {
  expect((await request('/broadcasts', 'GET')).status).toBe(401)
  expect((await request('/admin/broadcasts', 'POST', 'member', input)).status).toBe(403)
  expect((await memberList())[0]).toMatchObject({ id: 'old', tone: 'notice', pinned: false, popup: false, revision: 1, destination: null })
  const startsAt = new Date(Date.now() + 60_000).toISOString()
  const expiresAt = new Date(Date.parse(startsAt) + 1000).toISOString()
  expect((await request('/admin/broadcasts', 'POST', 'admin', { ...input, startsAt, expiresAt })).status).toBe(201)
  const [message] = await adminList()
  expect(message).toMatchObject({ startsAt, expiresAt, published: true, destination: 'feedback' })
  expect((await memberList()).map(item => item.id)).toEqual(['old'])
  expect((await visibleBroadcasts(env.DB, Date.parse(startsAt))).map(item => item.title)).toEqual(['Migration', 'Legacy notice'])
  expect((await visibleBroadcasts(env.DB, Date.parse(expiresAt))).map(item => item.id)).toEqual(['old'])
  const path = '/admin/broadcasts/' + message!.id
  expect((await request(path, 'PUT', 'admin', input)).status).toBe(204)
  expect((await memberList())[0]).toMatchObject({ title: input.title, expiresAt: null, pinned: true, tone: 'maintenance' })
  expect((await request(path, 'PATCH', 'member', { published: false })).status).toBe(403)
  expect((await request(path, 'PATCH', 'admin', { published: false })).status).toBe(204)
  expect((await memberList()).map(item => item.id)).toEqual(['old'])
  expect((await adminList())[0]).toMatchObject({ published: false, title: input.title })
  expect((await request(path, 'DELETE', 'admin')).status).toBe(204)
  expect((await adminList()).map(item => item.id)).toEqual(['old'])
})

it('keeps hidden settings on legacy edits and rejects invalid scheduled windows, styles and destinations', async () => {
  expect((await request('/admin/broadcasts', 'POST', 'admin', { ...input, published: false })).status).toBe(201)
  const [message] = await adminList()
  const simpleEdit = { title: 'Edited title', body: input.body, expiresAt: null }
  expect((await request('/admin/broadcasts/' + message!.id, 'PUT', 'admin', simpleEdit)).status).toBe(204)
  expect((await adminList())[0]).toMatchObject({ ...simpleEdit, published: false, pinned: true, tone: 'maintenance', destination: 'feedback' })
  expect((await memberList()).map(item => item.id)).toEqual(['old'])
  for (const bad of [{ destination: 'https://other.example' }, { tone: 'invalid' },
    { startsAt: '2030-01-01T00:00:00.000Z', expiresAt: '2029-01-01T00:00:00.000Z' }]) {
    expect((await request('/admin/broadcasts', 'POST', 'admin', { ...input, ...bad })).status).toBe(400)
  }
  const now = Date.now()
  expect((await request('/admin/broadcasts', 'POST', 'admin', { title: 'Old form', body: 'Body', expiresInDays: 7 })).status).toBe(201)
  const legacy = (await memberList()).find(item => item.title === 'Old form')!
  expect(Date.parse(legacy.expiresAt!) - now).toBeGreaterThanOrEqual(7 * 86_400_000)
})

it('keeps popup delivery opt-in and advances the acknowledgement revision only after a visible content edit', async () => {
  expect((await request('/admin/broadcasts', 'POST', 'admin', { ...input, popup: true })).status).toBe(201)
  const [created] = await memberList()
  expect(created).toMatchObject({ popup: true, revision: 1 })
  const path = '/admin/broadcasts/' + created!.id
  expect((await request(path, 'PUT', 'admin', { ...input, pinned: false })).status).toBe(204)
  expect((await memberList())[0]).toMatchObject({ popup: true, revision: 1, pinned: false })
  expect((await request(path, 'PUT', 'admin', { title: input.title, body: 'New details', expiresAt: null })).status).toBe(204)
  expect((await memberList())[0]).toMatchObject({ popup: true, revision: 2, body: 'New details' })
  expect((await request(path, 'PUT', 'admin', { ...input, body: 'New details', popup: false })).status).toBe(204)
  expect((await memberList())[0]).toMatchObject({ popup: false, revision: 2 })
})
