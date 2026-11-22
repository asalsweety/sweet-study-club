import type { LeaderboardEntry, LiveResponse } from '../../src/shared/api/social'
import { periodRanges, type PeriodKind } from '../../src/shared/lib/analytics'
import { addDays, startOfTehranDay, tehranClock } from '../../src/shared/lib/tehran'
import { conflict, notFound } from '../http/errors'
import { presenceOf } from './friends'

const friendIds = `SELECT CASE WHEN user_low = ?1 THEN user_high ELSE user_low END
  FROM friendships WHERE status = 'accepted' AND (user_low = ?1 OR user_high = ?1)`
const blockedIds = `SELECT blocked_id FROM user_blocks WHERE blocker_id = ?1
  UNION SELECT blocker_id FROM user_blocks WHERE blocked_id = ?1`

export async function touchPresence(db: D1Database, me: string) {
  await db
    .prepare('INSERT INTO user_presence (user_id, last_seen_at) VALUES (?, ?) ON CONFLICT (user_id) DO UPDATE SET last_seen_at = excluded.last_seen_at')
    .bind(me, Date.now())
    .run()
}

type LiveRow = {
  userId: string
  displayName: string
  avatarUrl: string | null
  verified: number
  bio: string | null
  isFriend: number
  lastSeenAt: number | null
  timerStatus: string | null
  subjectName: string | null
  startedAt: number | null
  accumulated: number | null
  segmentStart: number | null
  todaySeconds: number
}

export async function listLive(db: D1Database, me: string, scope: 'friends' | 'everyone'): Promise<LiveResponse> {
  const now = Date.now()
  const dayStart = startOfTehranDay(tehranClock(now).date)
  // Friends see people whose visibility is friends/everyone; strangers only "everyone".
  const result = await db
    .prepare(
      `SELECT u.id AS userId, u.name AS displayName, u.image AS avatarUrl, u.verified, s.bio,
         (u.id IN (${friendIds})) AS isFriend, p.last_seen_at AS lastSeenAt, t.timer_status AS timerStatus,
         l.subject_name AS subjectName, l.started_at AS startedAt, t.accumulated_seconds AS accumulated,
         t.current_segment_started_at AS segmentStart,
         (SELECT COALESCE(SUM(duration_seconds), 0) FROM study_logs
           WHERE user_id = u.id AND ended_at IS NOT NULL AND started_at >= ?2) AS todaySeconds
       FROM user u
       LEFT JOIN user_settings s ON s.user_id = u.id
       LEFT JOIN user_presence p ON p.user_id = u.id
       LEFT JOIN active_study_timers t ON t.user_id = u.id
       LEFT JOIN study_logs l ON l.id = t.log_id
       WHERE u.id != ?1 AND u.id NOT IN (${blockedIds})
         AND COALESCE(s.live_visibility, 'friends') != 'nobody'
         AND (
           (u.id IN (${friendIds}))
           OR (?3 = 'everyone' AND s.live_visibility = 'everyone' AND (t.user_id IS NOT NULL OR p.last_seen_at > ?4))
         )
       ORDER BY (t.timer_status = 'running') DESC, p.last_seen_at DESC
       LIMIT 100`,
    )
    .bind(me, dayStart, scope, now - 2 * 60_000)
    .all<LiveRow>()

  const people = result.results.map((row) => {
    const status = presenceOf(row, now)
    const running = row.segmentStart === null ? 0 : Math.floor((now - row.segmentStart) / 1000)
    return {
      userId: row.userId,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      verified: row.verified === 1,
      bio: row.bio,
      isFriend: row.isFriend === 1,
      status,
      subjectName: row.timerStatus === null ? null : row.subjectName,
      studyingSince: row.startedAt === null ? null : new Date(row.startedAt).toISOString(),
      todaySeconds: row.todaySeconds,
      elapsedSeconds: (row.accumulated ?? 0) + Math.max(0, running),
    }
  })
  return {
    people,
    counts: {
      studying: people.filter((person) => person.status === 'studying').length,
      online: people.filter((person) => person.status === 'online' || person.status === 'break').length,
      offline: people.filter((person) => person.status === 'offline').length,
    },
  }
}

export async function leaderboard(db: D1Database, me: string, period: PeriodKind, scope: 'friends' | 'everyone') {
  const today = tehranClock(Date.now()).date
  const range = periodRanges(period, today).current
  const result = await db
    .prepare(
      `WITH friends AS (${friendIds}), blocked AS (${blockedIds}),
       totals AS (
         SELECT l.user_id, SUM(l.duration_seconds) AS seconds
         FROM study_logs l LEFT JOIN user_settings s ON s.user_id = l.user_id
         WHERE l.ended_at IS NOT NULL AND l.duration_seconds > 0 AND l.started_at >= ?2 AND l.started_at < ?3
           AND COALESCE(s.show_on_leaderboard, 1) = 1 AND l.user_id NOT IN blocked
           AND (?4 = 'everyone' OR l.user_id = ?1 OR l.user_id IN friends)
         GROUP BY l.user_id
       ), ranked AS (
         SELECT user_id, seconds, RANK() OVER (ORDER BY seconds DESC) AS rank,
           ROW_NUMBER() OVER (ORDER BY seconds DESC, user_id) AS position
         FROM totals
       )
       SELECT u.id AS userId, u.name AS displayName, u.image AS avatarUrl, u.verified, s.bio,
         (u.id IN friends) AS isFriend, r.seconds, r.rank
       FROM ranked r JOIN user u ON u.id = r.user_id LEFT JOIN user_settings s ON s.user_id = r.user_id
       WHERE r.position <= 50 OR r.user_id = ?1
       ORDER BY r.position`,
    )
    .bind(me, startOfTehranDay(range.from), startOfTehranDay(addDays(range.to, 1)), scope)
    .all<Omit<LeaderboardEntry, 'isMe' | 'isFriend' | 'verified'> & { isFriend: number; verified: number }>()

  const ranked = result.results.map((row) => ({
    ...row,
    isMe: row.userId === me,
    isFriend: row.isFriend === 1,
    verified: row.verified === 1,
  }))
  const settings = await db.prepare('SELECT show_on_leaderboard AS shown FROM user_settings WHERE user_id = ?').bind(me).first<{ shown: number }>()
  return {
    period,
    scope,
    range,
    entries: ranked.slice(0, 50),
    me: ranked.find((entry) => entry.isMe) ?? null,
    optedIn: (settings?.shown ?? 1) === 1,
  }
}

export async function sendCheer(db: D1Database, me: string, to: string, emoji: string) {
  const [low, high] = me < to ? [me, to] : [to, me]
  const friends = await db
    .prepare("SELECT 1 AS hit FROM friendships WHERE user_low = ? AND user_high = ? AND status = 'accepted'")
    .bind(low, high)
    .first()
  if (friends === null) throw notFound('You can only cheer for friends.')
  const now = Date.now()
  const recent = await db
    .prepare('SELECT SUM(to_user_id = ?) AS toThem, COUNT(*) AS total FROM cheers WHERE from_user_id = ? AND created_at > ?')
    .bind(to, me, now - 3_600_000)
    .first<{ toThem: number | null; total: number }>()
  if ((recent?.toThem ?? 0) >= 3 || (recent?.total ?? 0) >= 30) {
    throw conflict('CHEER_LIMIT', 'Take a breath; you have cheered a lot this hour.')
  }
  await db
    .prepare('INSERT INTO cheers (id, from_user_id, to_user_id, emoji, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), me, to, emoji, now)
    .run()
}

export async function listUnseenCheers(db: D1Database, me: string) {
  const result = await db
    .prepare(
      `SELECT c.id, c.emoji, c.created_at AS createdAt, u.id AS userId, u.name AS displayName, u.image AS avatarUrl, u.verified
       FROM cheers c JOIN user u ON u.id = c.from_user_id
       WHERE c.to_user_id = ? AND c.seen_at IS NULL AND c.created_at > ? ORDER BY c.created_at DESC LIMIT 20`,
    )
    .bind(me, Date.now() - 24 * 3_600_000)
    .all<{ id: string; emoji: string; createdAt: number; userId: string; displayName: string; avatarUrl: string | null; verified: number }>()
  return result.results.map((row) => ({
    id: row.id,
    emoji: row.emoji,
    createdAt: new Date(row.createdAt).toISOString(),
    from: { userId: row.userId, displayName: row.displayName, avatarUrl: row.avatarUrl, verified: row.verified === 1, bio: null },
  }))
}

export async function markCheersSeen(db: D1Database, me: string) {
  await db.prepare('UPDATE cheers SET seen_at = ? WHERE to_user_id = ? AND seen_at IS NULL').bind(Date.now(), me).run()
}
