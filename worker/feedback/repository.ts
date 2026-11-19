import type { CreateFeedbackInput, FeedbackPage } from '../../src/shared/api/feedback'
import { conflict } from '../http/errors'

export async function submitFeedback(db: D1Database, userId: string, input: CreateFeedbackInput) {
  const result = await db.prepare(
    `INSERT INTO member_feedback (user_id, request_id, message, created_at)
     VALUES (?, ?, ?, ?) ON CONFLICT (user_id, request_id) DO NOTHING`,
  ).bind(userId, input.requestId, input.message, Date.now()).run()
  if (result.meta.changes > 0) return

  const existing = await db.prepare('SELECT message FROM member_feedback WHERE user_id = ? AND request_id = ?')
    .bind(userId, input.requestId).first<{ message: string }>()
  if (existing?.message !== input.message) {
    throw conflict('FEEDBACK_REQUEST_CONFLICT', 'This submission ID has already been used for another message.')
  }
}

export async function listFeedback(db: D1Database, before?: number): Promise<FeedbackPage> {
  const pageSize = 25
  const rows = await db.prepare(
    `SELECT f.id, u.name AS displayName, f.message, f.created_at AS createdAt
     FROM member_feedback f JOIN user u ON u.id = f.user_id
     ${before === undefined ? '' : 'WHERE f.id < ?'}
     ORDER BY f.id DESC LIMIT ?`,
  ).bind(...(before === undefined ? [] : [before]), pageSize + 1)
    .all<{ id: number; displayName: string; message: string; createdAt: number }>()

  const items = rows.results.slice(0, pageSize).map(row => ({
    ...row, createdAt: new Date(row.createdAt).toISOString(),
  }))
  return { items, nextCursor: rows.results.length > pageSize ? items[pageSize - 1]!.id : null }
}
