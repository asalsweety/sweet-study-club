import { Hono, type MiddlewareHandler } from 'hono'
import { createSheetInputSchema, maxSheetDataLength, sheetDataSchema, sheetKindSchema, updateSheetInputSchema, type SheetKind } from '../../src/shared/api/sheets'
import { ApiError, conflict, notFound } from '../http/errors'
import { readBody, userId } from '../http/validation'
import type { WorkerEnvironment } from '../types'

const maxSheetsPerMember = 300

export const defaultSheetTitles: Record<SheetKind, string> = {
  identity: 'شناسنامه و تعهدنامه',
  monthly: 'برنامۀ ماهانه',
  habits: 'عادت‌ها و اولویت‌ها',
  weekly: 'برنامۀ هفتگی',
  daily: 'برنامۀ روزانه',
  review: 'مرور و تحلیل آزمون',
  chapter: 'خلاصه و کارنامۀ فصل',
}

type SheetRow = { id: string; kind: string; title: string; data?: string; createdAt: number; updatedAt: number }
const sheetColumns = 'id, kind, title, data, created_at AS createdAt, updated_at AS updatedAt'

function summary(row: SheetRow) {
  return { id: row.id, kind: sheetKindSchema.parse(row.kind), title: row.title, createdAt: row.createdAt, updatedAt: row.updatedAt }
}

function withData(row: SheetRow) {
  let data = {}
  try {
    const parsed = sheetDataSchema.safeParse(JSON.parse(row.data ?? '{}'))
    if (parsed.success) data = parsed.data
  } catch {
    // A damaged page opens empty rather than failing.
  }
  return { ...summary(row), data }
}

export function sheetRoutes(requireSession: MiddlewareHandler<WorkerEnvironment>) {
  const app = new Hono<WorkerEnvironment>()
  app.use('/planner-sheets', requireSession)
  app.use('/planner-sheets/*', requireSession)

  app.get('/planner-sheets', async (c) => {
    const rows = await c.env.DB.prepare(
      'SELECT id, kind, title, created_at AS createdAt, updated_at AS updatedAt FROM planner_sheets WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?',
    ).bind(userId(c), maxSheetsPerMember).all<SheetRow>()
    c.header('Cache-Control', 'private, no-store')
    return c.json({ sheets: rows.results.map(summary) })
  })

  app.post('/planner-sheets', async (c) => {
    const input = await readBody(c, createSheetInputSchema)
    const member = userId(c)
    const id = input.id ?? crypto.randomUUID()
    const now = Date.now()
    const row = await c.env.DB.prepare(
      `INSERT INTO planner_sheets (id, user_id, kind, title, created_at, updated_at)
       SELECT ?, ?, ?, ?, ?, ?
       WHERE (SELECT COUNT(*) FROM planner_sheets WHERE user_id = ?) < ?
       ON CONFLICT (id) DO NOTHING RETURNING ${sheetColumns}`,
    ).bind(id, member, input.kind, input.title ?? defaultSheetTitles[input.kind], now, now, member, maxSheetsPerMember).first<SheetRow>()
    if (row) return c.json({ sheet: withData(row) }, 201)

    const existing = await c.env.DB.prepare(`SELECT ${sheetColumns} FROM planner_sheets WHERE id = ? AND user_id = ?`)
      .bind(id, member).first<SheetRow>()
    if (existing?.kind === input.kind) return c.json({ sheet: withData(existing) })
    const count = await c.env.DB.prepare('SELECT COUNT(*) AS total FROM planner_sheets WHERE user_id = ?')
      .bind(member).first<{ total: number }>()
    if (!existing && (count?.total ?? 0) >= maxSheetsPerMember) {
      throw conflict('SHEET_LIMIT', 'تعداد برگه‌ها به سقف رسیده است. برای ساخت برگهٔ تازه، یکی از برگه‌ها را حذف کن.')
    }
    throw conflict('SHEET_CREATE_CONFLICT', 'این شناسه قبلاً استفاده شده است. دوباره نوع برگه را انتخاب کن.')
  })

  app.get('/planner-sheets/:id', async (c) => {
    const row = await c.env.DB.prepare(
      `SELECT ${sheetColumns} FROM planner_sheets WHERE id = ? AND user_id = ?`,
    ).bind(c.req.param('id'), userId(c)).first<SheetRow>()
    if (!row) throw notFound('This planner page does not exist.')
    c.header('Cache-Control', 'private, no-store')
    return c.json({ sheet: withData(row) })
  })

  app.put('/planner-sheets/:id', async (c) => {
    const input = await readBody(c, updateSheetInputSchema)
    const data = input.data === undefined ? null : JSON.stringify(input.data)
    // Match SQLite's TEXT length, which counts Unicode code points.
    if (data !== null && data.length > maxSheetDataLength && [...data].length > maxSheetDataLength) {
      throw new ApiError(413, 'SHEET_TOO_LARGE', 'ظرفیت برگه پر شده است. بخشی از نوشته‌ها را به برگهٔ دیگری منتقل کن.')
    }
    const row = await c.env.DB.prepare(
      `UPDATE planner_sheets SET title = COALESCE(?, title), data = COALESCE(?, data), updated_at = MAX(updated_at + 1, ?)
       WHERE id = ? AND user_id = ? AND (? IS NULL OR updated_at = ?) RETURNING updated_at AS updatedAt`,
    ).bind(input.title ?? null, data, Date.now(), c.req.param('id'), userId(c), input.expectedUpdatedAt ?? null, input.expectedUpdatedAt ?? null).first<{ updatedAt: number }>()
    if (!row) {
      if (input.expectedUpdatedAt !== undefined && await c.env.DB.prepare('SELECT 1 FROM planner_sheets WHERE id = ? AND user_id = ?').bind(c.req.param('id'), userId(c)).first()) {
        throw conflict('SHEET_VERSION_CONFLICT', 'این برگه در دستگاه دیگری ویرایش شد.')
      }
      throw notFound('This planner page does not exist.')
    }
    return c.json(row)
  })

  app.delete('/planner-sheets/:id', async (c) => {
    await c.env.DB.prepare('DELETE FROM planner_sheets WHERE id = ? AND user_id = ?').bind(c.req.param('id'), userId(c)).run()
    return c.body(null, 204)
  })

  return app
}
