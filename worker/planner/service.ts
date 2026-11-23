import {
  plannerItemSchema,
  type CreatePlannerItemInput,
  type PlannerItem,
  type UpdatePlannerItemInput,
} from '../../src/shared/api/planner'
import { invalidInput, notFound } from '../http/errors'

type PlannerRow = {
  id: string
  date: string
  kind: string
  title: string
  details: string | null
  subjectName: string | null
  plannedMinutes: number | null
  plannedTests: number | null
  isDone: number
  remindAt: number | null
  position: number
}

const plannerColumns = `id, plan_date AS date, kind, title, details, subject_name AS subjectName,
  planned_minutes AS plannedMinutes, planned_tests AS plannedTests, is_done AS isDone,
  remind_at AS remindAt, position`

const toItem = (row: PlannerRow): PlannerItem =>
  plannerItemSchema.parse({
    ...row,
    isDone: row.isDone === 1,
    remindAt: row.remindAt === null ? null : new Date(row.remindAt).toISOString(),
  })

const toEpoch = (iso: string | null | undefined) =>
  iso === undefined ? undefined : iso === null ? null : Date.parse(iso)

const MAX_RANGE_DAYS = 62

export async function listPlannerItems(db: D1Database, userId: string, from: string, to: string) {
  if ((Date.parse(to) - Date.parse(from)) / 86_400_000 > MAX_RANGE_DAYS) {
    throw invalidInput('The planner range is too long.')
  }
  const result = await db
    .prepare(
      `SELECT ${plannerColumns} FROM planner_items
       WHERE user_id = ? AND plan_date BETWEEN ? AND ? ORDER BY plan_date, is_done, position, created_at`,
    )
    .bind(userId, from, to)
    .all<PlannerRow>()
  return result.results.map(toItem)
}

async function findItem(db: D1Database, userId: string, id: string) {
  const row = await db
    .prepare(`SELECT ${plannerColumns} FROM planner_items WHERE id = ? AND user_id = ?`)
    .bind(id, userId)
    .first<PlannerRow>()
  if (row === null) throw notFound('The planner item does not exist.')
  return toItem(row)
}

export async function createPlannerItem(db: D1Database, userId: string, input: CreatePlannerItemInput) {
  const id = input.id ?? crypto.randomUUID()
  const now = Date.now()
  const result = await db
    .prepare(
      `INSERT INTO planner_items (id, user_id, plan_date, kind, title, details, subject_name,
         planned_minutes, planned_tests, is_done, remind_at, position, created_at, updated_at)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, total, ?, ?
       FROM (SELECT COUNT(*) AS total FROM planner_items WHERE user_id = ? AND plan_date = ?)
       WHERE total < 100 ON CONFLICT(id) DO NOTHING`,
    )
    .bind(id, userId, input.date, input.kind, input.title, input.details || null, input.subjectName,
      input.plannedMinutes, input.plannedTests, toEpoch(input.remindAt) ?? null, now, now, userId, input.date)
    .run()
  if (!result.meta.changes) {
    const existing = await db.prepare('SELECT 1 FROM planner_items WHERE user_id = ? AND id = ?').bind(userId, id).first()
    if (!existing) throw invalidInput('این کار ثبت نشد. هر روز می‌تواند حداکثر ۱۰۰ کار داشته باشد.')
  }
  return findItem(db, userId, id)
}

export async function updatePlannerItem(db: D1Database, userId: string, id: string, input: UpdatePlannerItemInput) {
  const columns: Record<string, unknown> = {
    plan_date: input.date,
    kind: input.kind,
    title: input.title,
    details: input.details === undefined ? undefined : input.details || null,
    subject_name: input.subjectName,
    planned_minutes: input.plannedMinutes,
    planned_tests: input.plannedTests,
    is_done: input.isDone === undefined ? undefined : Number(input.isDone),
    remind_at: toEpoch(input.remindAt),
    position: input.position,
  }
  const entries = Object.entries(columns).filter(([, value]) => value !== undefined)
  if (entries.length > 0) {
    const result = await db
      .prepare(
        `UPDATE planner_items SET ${entries.map(([key]) => `${key} = ?`).join(', ')}, updated_at = ?
         WHERE id = ? AND user_id = ?`,
      )
      .bind(...entries.map(([, value]) => value), Date.now(), id, userId)
      .run()
    if (result.meta.changes === 0) throw notFound('The planner item does not exist.')
  }
  return findItem(db, userId, id)
}

export async function deletePlannerItem(db: D1Database, userId: string, id: string) {
  const result = await db.prepare('DELETE FROM planner_items WHERE id = ? AND user_id = ?').bind(id, userId).run()
  if (result.meta.changes === 0) throw notFound('The planner item does not exist.')
}

/** Reminders due in a window, for the client-side notification scheduler. */
export async function listDueReminders(db: D1Database, userId: string, fromMs: number, toMs: number) {
  const result = await db
    .prepare(
      `SELECT ${plannerColumns} FROM planner_items
       WHERE user_id = ? AND is_done = 0 AND remind_at BETWEEN ? AND ? ORDER BY remind_at LIMIT 50`,
    )
    .bind(userId, fromMs, toMs)
    .all<PlannerRow>()
  return result.results.map(toItem)
}
