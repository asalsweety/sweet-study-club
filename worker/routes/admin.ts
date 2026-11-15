import { Hono, type MiddlewareHandler } from 'hono'
import { z } from 'zod'
import { createOverrideInputSchema, isoDateSchema, upsertStudyPartInputSchema } from '../../src/shared/api/schedule'
import { answerPlanRequestInputSchema, upsertProductInputSchema } from '../../src/shared/api/shop'
import { startOfTehranDay, tehranClock } from '../../src/shared/lib/tehran'
import { invalidInput } from '../http/errors'
import { readBody, readQuery, requireAdmin, userId } from '../http/validation'
import * as schedule from '../schedule/service'
import * as shop from '../shop/service'
import type { WorkerEnvironment } from '../types'

const broadcastInput = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
  expiresInDays: z.number().int().min(1).max(365).nullable(),
})

export function adminRoutes(requireSession: MiddlewareHandler<WorkerEnvironment>) {
  const app = new Hono<WorkerEnvironment>()
  app.use('/admin/*', requireSession, requireAdmin)

  app.get('/admin/overview', async (c) => {
    const db = c.env.DB
    const dayStart = startOfTehranDay(tehranClock(Date.now()).date)
    const [users, activeToday, studiedToday, revenue, pendingPlans, studyingNow] = await Promise.all([
      db.prepare('SELECT COUNT(*) AS value FROM user').first<{ value: number }>(),
      db.prepare('SELECT COUNT(DISTINCT user_id) AS value FROM study_logs WHERE started_at >= ?').bind(dayStart).first<{ value: number }>(),
      db.prepare('SELECT COALESCE(SUM(duration_seconds), 0) AS value FROM study_logs WHERE ended_at IS NOT NULL AND started_at >= ?').bind(dayStart).first<{ value: number }>(),
      db.prepare("SELECT COALESCE(SUM(amount_toman), 0) AS value FROM shop_orders WHERE status = 'paid'").first<{ value: number }>(),
      db.prepare("SELECT COUNT(*) AS value FROM plan_requests WHERE status != 'delivered'").first<{ value: number }>(),
      db.prepare("SELECT COUNT(*) AS value FROM active_study_timers WHERE timer_status = 'running'").first<{ value: number }>(),
    ])
    return c.json({
      users: users?.value ?? 0,
      activeToday: activeToday?.value ?? 0,
      studiedTodaySeconds: studiedToday?.value ?? 0,
      revenueToman: revenue?.value ?? 0,
      pendingPlanRequests: pendingPlans?.value ?? 0,
      studyingNow: studyingNow?.value ?? 0,
    })
  })

  app.get('/admin/users', async (c) => {
    const { q } = readQuery(c, z.object({ q: z.string().trim().max(80).optional() }))
    const like = `%${(q ?? '').replace(/[%_]/g, '')}%`
    const result = await c.env.DB.prepare(
      `SELECT u.id, u.name AS displayName, u.email, u.role, u.createdAt,
         (SELECT COALESCE(SUM(duration_seconds), 0) FROM study_logs WHERE user_id = u.id AND ended_at IS NOT NULL) AS totalSeconds,
         p.last_seen_at AS lastSeenAt
       FROM user u LEFT JOIN user_presence p ON p.user_id = u.id
       WHERE u.name LIKE ? OR u.email LIKE ? ORDER BY u.createdAt DESC LIMIT 100`,
    )
      .bind(like, like)
      .all()
    return c.json({ users: result.results })
  })

  app.post('/admin/users/:id/role', async (c) => {
    const { role } = await readBody(c, z.object({ role: z.enum(['member', 'admin']) }))
    if (c.req.param('id') === userId(c) && role !== 'admin') throw invalidInput('You cannot remove your own admin role.')
    await c.env.DB.prepare('UPDATE user SET role = ?, updatedAt = ? WHERE id = ?').bind(role, Date.now(), c.req.param('id')).run()
    return c.body(null, 204)
  })

  app.get('/admin/parts', async (c) => c.json({ parts: await schedule.listStudyParts(c.env.DB) }))
  app.post('/admin/parts', async (c) => {
    await schedule.createStudyPart(c.env.DB, await readBody(c, upsertStudyPartInputSchema))
    return c.json({ parts: await schedule.listStudyParts(c.env.DB) }, 201)
  })
  app.put('/admin/parts/:id', async (c) => {
    await schedule.updateStudyPart(c.env.DB, c.req.param('id'), await readBody(c, upsertStudyPartInputSchema))
    return c.json({ parts: await schedule.listStudyParts(c.env.DB) })
  })
  app.delete('/admin/parts/:id', async (c) => {
    await schedule.deleteStudyPart(c.env.DB, c.req.param('id'))
    return c.json({ parts: await schedule.listStudyParts(c.env.DB) })
  })

  app.get('/admin/overrides', async (c) => {
    const { from, to } = readQuery(c, z.object({ from: isoDateSchema, to: isoDateSchema }))
    return c.json({ overrides: await schedule.listOverrides(c.env.DB, from, to) })
  })
  app.post('/admin/overrides', async (c) => {
    const id = await schedule.createOverride(c.env.DB, userId(c), await readBody(c, createOverrideInputSchema))
    return c.json({ id }, 201)
  })
  app.delete('/admin/overrides/:id', async (c) => {
    await schedule.deleteOverride(c.env.DB, c.req.param('id'))
    return c.body(null, 204)
  })

  app.get('/admin/delivery-orders', async (c) => c.json({ orders: await shop.listDeliveryOrders(c.env.DB) }))
  app.get('/admin/products', async (c) => c.json({ products: await shop.listProducts(c.env.DB, userId(c), true) }))
  app.post('/admin/products', async (c) =>
    c.json({ id: await shop.upsertProduct(c.env.DB, null, await readBody(c, upsertProductInputSchema)) }, 201))
  app.put('/admin/products/:id', async (c) =>
    c.json({ id: await shop.upsertProduct(c.env.DB, c.req.param('id'), await readBody(c, upsertProductInputSchema)) }))

  app.get('/admin/plan-requests', async (c) => c.json({ requests: await shop.listPlanRequests(c.env.DB, null) }))
  app.post('/admin/plan-requests/:id', async (c) => {
    const input = await readBody(c, answerPlanRequestInputSchema)
    await shop.answerPlanRequest(c.env.DB, c.req.param('id'), input.status, input.response)
    return c.json({ requests: await shop.listPlanRequests(c.env.DB, null) })
  })

  app.post('/admin/broadcasts', async (c) => {
    const input = await readBody(c, broadcastInput)
    const now = Date.now()
    await c.env.DB.prepare('INSERT INTO broadcasts (id, title, body, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), input.title, input.body, userId(c), now,
        input.expiresInDays === null ? null : now + input.expiresInDays * 86_400_000)
      .run()
    return c.body(null, 201)
  })
  app.delete('/admin/broadcasts/:id', async (c) => {
    await c.env.DB.prepare('DELETE FROM broadcasts WHERE id = ?').bind(c.req.param('id')).run()
    return c.body(null, 204)
  })

  return app
}
