import type { Friend, FriendsResponse, Person } from '../../src/shared/api/social'
import { startOfTehranDay, tehranClock } from '../../src/shared/lib/tehran'
import { conflict, invalidInput, notFound } from '../http/errors'

const ONLINE_WINDOW_MS = 2 * 60_000
const INVITE_TTL_MS = 7 * 24 * 3_600_000
const MAX_PENDING_OUTGOING = 30

const pair = (a: string, b: string) => (a < b ? [a, b] as const : [b, a] as const)

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function blockedEitherWay(db: D1Database, a: string, b: string) {
  const row = await db
    .prepare('SELECT 1 AS hit FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)')
    .bind(a, b, b, a)
    .first()
  return row !== null
}

async function befriend(db: D1Database, me: string, other: string, status: 'pending' | 'accepted') {
  // Unknown and blocked users get the same answer so blocks cannot be probed.
  if (other === me) throw invalidInput('You cannot add yourself.')
  const exists = await db.prepare('SELECT 1 AS hit FROM user WHERE id = ?').bind(other).first()
  if (exists === null || (await blockedEitherWay(db, me, other))) throw notFound('No user was found.')

  const [low, high] = pair(me, other)
  const existing = await db
    .prepare('SELECT status, requested_by AS requestedBy FROM friendships WHERE user_low = ? AND user_high = ?')
    .bind(low, high)
    .first<{ status: string; requestedBy: string }>()
  const now = Date.now()

  if (existing?.status === 'accepted') throw conflict('ALREADY_FRIENDS', 'You are already friends.')
  if (existing && (existing.requestedBy === other || status === 'accepted')) {
    await db
      .prepare("UPDATE friendships SET status = 'accepted', updated_at = ? WHERE user_low = ? AND user_high = ?")
      .bind(now, low, high)
      .run()
    return 'accepted' as const
  }
  if (existing) return 'pending' as const

  if (status === 'pending') {
    const pending = await db
      .prepare("SELECT COUNT(*) AS total FROM friendships WHERE requested_by = ? AND status = 'pending'")
      .bind(me)
      .first<{ total: number }>()
    if ((pending?.total ?? 0) >= MAX_PENDING_OUTGOING) {
      throw conflict('TOO_MANY_REQUESTS', 'You have too many pending requests.')
    }
  }
  await db
    .prepare('INSERT OR IGNORE INTO friendships (user_low, user_high, requested_by, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(low, high, me, status, now, now)
    .run()
  return status
}

export async function addByFriendCode(db: D1Database, me: string, friendCode: string) {
  const row = await db.prepare('SELECT user_id AS id FROM user_settings WHERE friend_code = ?').bind(friendCode).first<{ id: string }>()
  if (row === null) throw notFound('No user was found.')
  return befriend(db, me, row.id, 'pending')
}

export async function createInvite(db: D1Database, me: string) {
  const token = randomToken()
  const now = Date.now()
  await db
    .prepare('INSERT INTO friend_invites (token_hash, inviter_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(token), me, now + INVITE_TTL_MS, now)
    .run()
  return { token, expiresAt: new Date(now + INVITE_TTL_MS).toISOString() }
}

export async function acceptInvite(db: D1Database, me: string, token: string) {
  const invite = await db
    .prepare('SELECT inviter_id AS inviterId FROM friend_invites WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?')
    .bind(await sha256Hex(token), Date.now())
    .first<{ inviterId: string }>()
  if (invite === null) throw notFound('This invite link is invalid or expired.')
  return befriend(db, me, invite.inviterId, 'accepted')
}

export async function respondToRequest(db: D1Database, me: string, other: string, accept: boolean) {
  const [low, high] = pair(me, other)
  const sql = accept
    ? "UPDATE friendships SET status = 'accepted', updated_at = ? WHERE user_low = ? AND user_high = ? AND requested_by = ? AND status = 'pending'"
    : "DELETE FROM friendships WHERE ? > 0 AND user_low = ? AND user_high = ? AND requested_by = ? AND status = 'pending'"
  const result = await db.prepare(sql).bind(Date.now(), low, high, other).run()
  if (result.meta.changes === 0) throw notFound('The friend request does not exist.')
}

export async function removeFriendship(db: D1Database, me: string, other: string) {
  const [low, high] = pair(me, other)
  await db.prepare('DELETE FROM friendships WHERE user_low = ? AND user_high = ?').bind(low, high).run()
}

export async function blockUser(db: D1Database, me: string, other: string) {
  if (other === me) throw invalidInput('You cannot block yourself.')
  const [low, high] = pair(me, other)
  await db.batch([
    db.prepare('INSERT OR IGNORE INTO user_blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)').bind(me, other, Date.now()),
    db.prepare('DELETE FROM friendships WHERE user_low = ? AND user_high = ?').bind(low, high),
  ])
}

export async function unblockUser(db: D1Database, me: string, other: string) {
  await db.prepare('DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?').bind(me, other).run()
}

type FriendRow = Person & {
  status: string
  requestedBy: string
  createdAt: number
  lastSeenAt: number | null
  visibility: string | null
  timerStatus: string | null
  subjectName: string | null
  startedAt: number | null
  todaySeconds: number
}

export function presenceOf(row: Pick<FriendRow, 'lastSeenAt' | 'timerStatus'>, now: number) {
  if (row.timerStatus === 'running') return 'studying' as const
  if (row.timerStatus === 'paused') return 'break' as const
  return row.lastSeenAt !== null && now - row.lastSeenAt < ONLINE_WINDOW_MS ? ('online' as const) : ('offline' as const)
}

export async function listFriends(db: D1Database, me: string): Promise<FriendsResponse> {
  const now = Date.now()
  const dayStart = startOfTehranDay(tehranClock(now).date)
  const [rows, blocked] = await Promise.all([
    db
      .prepare(
        `SELECT u.id AS userId, u.name AS displayName, u.image AS avatarUrl, s.bio, f.status,
           f.requested_by AS requestedBy, f.created_at AS createdAt, p.last_seen_at AS lastSeenAt,
           s.live_visibility AS visibility, t.timer_status AS timerStatus, l.subject_name AS subjectName,
           l.started_at AS startedAt,
           (SELECT COALESCE(SUM(duration_seconds), 0) FROM study_logs
             WHERE user_id = u.id AND ended_at IS NOT NULL AND started_at >= ?) AS todaySeconds
         FROM friendships f
         JOIN user u ON u.id = CASE WHEN f.user_low = ? THEN f.user_high ELSE f.user_low END
         LEFT JOIN user_settings s ON s.user_id = u.id
         LEFT JOIN user_presence p ON p.user_id = u.id
         LEFT JOIN active_study_timers t ON t.user_id = u.id
         LEFT JOIN study_logs l ON l.id = t.log_id
         WHERE f.user_low = ? OR f.user_high = ?
         ORDER BY u.name`,
      )
      .bind(dayStart, me, me, me)
      .all<FriendRow>(),
    db
      .prepare('SELECT u.id AS userId, u.name AS displayName, u.image AS avatarUrl, NULL AS bio FROM user_blocks b JOIN user u ON u.id = b.blocked_id WHERE b.blocker_id = ?')
      .bind(me)
      .all<Person>(),
  ])

  const person = (row: FriendRow): Person => ({ userId: row.userId, displayName: row.displayName, avatarUrl: row.avatarUrl, bio: row.bio })
  const friends: Friend[] = rows.results
    .filter((row) => row.status === 'accepted')
    .map((row) => {
      const hidden = row.visibility === 'nobody'
      const status = hidden ? 'offline' : presenceOf(row, now)
      return {
        ...person(row),
        status,
        subjectName: hidden || row.timerStatus === null ? null : row.subjectName,
        studyingSince: hidden || row.startedAt === null ? null : new Date(row.startedAt).toISOString(),
        todaySeconds: row.todaySeconds,
      }
    })
  const pending = rows.results.filter((row) => row.status === 'pending')
  const request = (row: FriendRow) => ({ ...person(row), createdAt: new Date(row.createdAt).toISOString() })
  return {
    friends,
    incoming: pending.filter((row) => row.requestedBy !== me).map(request),
    outgoing: pending.filter((row) => row.requestedBy === me).map(request),
    blocked: blocked.results,
  }
}
