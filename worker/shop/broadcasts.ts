import type { BroadcastInput } from '../../src/shared/api/shop'
import { notFound } from '../http/errors'

type BroadcastRow = Pick<BroadcastInput, 'title' | 'body' | 'tone' | 'destination'> & {
  id: string
  createdAt: number
  startsAt: number | null
  expiresAt: number | null
  published: number
  pinned: number
  popup: number
  revision: number
}

const fields = 'id, title, body, tone, destination, created_at AS createdAt, expires_at AS expiresAt, pinned, popup, revision'
const toDate = (timestamp: number | null) => timestamp === null ? null : new Date(timestamp).toISOString()
const toTimestamp = (iso: string | null) => iso === null ? null : Date.parse(iso)

function memberView(row: Omit<BroadcastRow, 'published' | 'startsAt'>) {
  return {
    id: row.id, title: row.title, body: row.body, tone: row.tone, destination: row.destination,
    createdAt: new Date(row.createdAt).toISOString(), expiresAt: toDate(row.expiresAt), pinned: Boolean(row.pinned),
    popup: Boolean(row.popup), revision: row.revision,
  }
}

export async function visibleBroadcasts(db: D1Database, now = Date.now()) {
  const { results } = await db.prepare(`SELECT ${fields} FROM broadcasts WHERE is_published = 1
    AND (starts_at IS NULL OR starts_at <= ?) AND (expires_at IS NULL OR expires_at > ?)
    ORDER BY pinned DESC, COALESCE(starts_at, created_at) DESC, created_at DESC, id DESC`)
    .bind(now, now).all<Omit<BroadcastRow, 'published' | 'startsAt'>>()
  return results.map(memberView)
}

export async function adminBroadcasts(db: D1Database) {
  const { results } = await db.prepare(`SELECT ${fields}, starts_at AS startsAt, is_published AS published
    FROM broadcasts ORDER BY created_at DESC, id DESC`).all<BroadcastRow>()
  return results.map(row => ({ ...memberView(row), startsAt: toDate(row.startsAt), published: Boolean(row.published) }))
}

export async function createBroadcast(db: D1Database, input: BroadcastInput, user: string, now: number) {
  await db.prepare(`INSERT INTO broadcasts (id, title, body, tone, destination, created_by, created_at, starts_at, expires_at, is_published, pinned, popup)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), input.title, input.body, input.tone, input.destination, user, now,
      toTimestamp(input.startsAt), toTimestamp(input.expiresAt), Number(input.published), Number(input.pinned), Number(input.popup ?? false)).run()
}

export async function updateBroadcast(db: D1Database, id: string, input: BroadcastInput | Pick<BroadcastInput, 'title' | 'body' | 'expiresAt'>) {
  const result = 'tone' in input
    ? await db.prepare(`UPDATE broadcasts SET title = ?, body = ?, expires_at = ?, starts_at = ?, tone = ?,
        destination = ?, is_published = ?, pinned = ?, popup = COALESCE(?, popup) WHERE id = ?`)
      .bind(input.title, input.body, toTimestamp(input.expiresAt), toTimestamp(input.startsAt), input.tone,
        input.destination, Number(input.published), Number(input.pinned), input.popup === undefined ? null : Number(input.popup), id).run()
    : await db.prepare('UPDATE broadcasts SET title = ?, body = ?, expires_at = ? WHERE id = ?')
      .bind(input.title, input.body, toTimestamp(input.expiresAt), id).run()
  if (!result.meta.changes) throw notFound()
}
