import { Hono, type MiddlewareHandler } from 'hono'
import { invalidInput, notFound } from '../http/errors'
import { userId } from '../http/validation'
import type { WorkerEnvironment } from '../types'
import { findProfileByUserId } from './repository'

/** Pictures are resized to 256px in the browser; this leaves generous headroom. */
export const maxAvatarBytes = 256 * 1024

type AvatarType = 'image/webp' | 'image/jpeg' | 'image/png'

/** Trust the file's own bytes, not the Content-Type the client claims. */
export function detectAvatarType(bytes: Uint8Array): AvatarType | null {
  const startsWith = (signature: number[], offset = 0) => signature.every((byte, index) => bytes[offset + index] === byte)
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg'
  // "RIFF" .... "WEBP"
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'
  return null
}

export const avatarPath = (id: string, version: number) => `/api/avatars/${encodeURIComponent(id)}?v=${version}`

export async function saveAvatar(db: D1Database, id: string, bytes: Uint8Array) {
  if (bytes.byteLength === 0 || bytes.byteLength > maxAvatarBytes) throw invalidInput('The picture must be smaller than 256 KB.')
  const type = detectAvatarType(bytes)
  if (!type) throw invalidInput('Only PNG, JPEG or WebP pictures are accepted.')
  const now = Date.now()
  await db.batch([
    db.prepare(
      `INSERT INTO user_avatars (user_id, content_type, bytes, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET content_type = excluded.content_type, bytes = excluded.bytes, updated_at = excluded.updated_at`,
    ).bind(id, type, bytes, now),
    db.prepare('UPDATE user SET image = ?, updatedAt = ? WHERE id = ?').bind(avatarPath(id, now), now, id),
  ])
}

export async function removeAvatar(db: D1Database, id: string) {
  await db.batch([
    db.prepare('DELETE FROM user_avatars WHERE user_id = ?').bind(id),
    db.prepare('UPDATE user SET image = NULL, updatedAt = ? WHERE id = ?').bind(Date.now(), id),
  ])
}

export function avatarRoutes(requireSession: MiddlewareHandler<WorkerEnvironment>) {
  const app = new Hono<WorkerEnvironment>()

  app.put('/profile/avatar', requireSession, async (c) => {
    const declared = Number(c.req.header('content-length') ?? 0)
    if (declared > maxAvatarBytes) throw invalidInput('The picture must be smaller than 256 KB.')
    const bytes = new Uint8Array(await c.req.arrayBuffer())
    await saveAvatar(c.env.DB, userId(c), bytes)
    return c.json({ profile: await findProfileByUserId(c.env.DB, userId(c)) })
  })

  app.delete('/profile/avatar', requireSession, async (c) => {
    await removeAvatar(c.env.DB, userId(c))
    return c.json({ profile: await findProfileByUserId(c.env.DB, userId(c)) })
  })

  // Members only; the ?v= version in each URL makes long caching safe.
  app.get('/avatars/:id', requireSession, async (c) => {
    const row = await c.env.DB.prepare('SELECT content_type AS contentType, bytes FROM user_avatars WHERE user_id = ?')
      .bind(c.req.param('id'))
      .first<{ contentType: string; bytes: ArrayBuffer | number[] }>()
    if (!row) throw notFound('This member has no profile picture.')
    const body = row.bytes instanceof ArrayBuffer ? new Uint8Array(row.bytes) : new Uint8Array(row.bytes)
    return c.body(body, 200, {
      'Content-Type': row.contentType,
      'Cache-Control': 'private, max-age=31536000, immutable',
      'Content-Security-Policy': "default-src 'none'",
    })
  })

  return app
}
