import { Hono, type MiddlewareHandler } from 'hono'
import { createOrderInputSchema, createPlanRequestInputSchema } from '../../src/shared/api/shop'
import { readBody, userId } from '../http/validation'
import * as shop from '../shop/service'
import type { WorkerEnvironment } from '../types'

export function shopRoutes(requireSession: MiddlewareHandler<WorkerEnvironment>) {
  const app = new Hono<WorkerEnvironment>()
  for (const path of ['/shop', '/shop/*', '/broadcasts']) app.use(path, requireSession)

  app.get('/shop/products', async (c) =>
    c.json({
      products: await shop.listProducts(c.env.DB, userId(c)),
      paymentsMode: shop.paymentsMode(c.env.APP_ENVIRONMENT),
    }))

  app.get('/shop/orders', async (c) => c.json({ orders: await shop.listOrders(c.env.DB, userId(c)) }))

  app.post('/shop/orders', async (c) => {
    const input = await readBody(c, createOrderInputSchema)
    return c.json({ order: await shop.createOrder(c.env.DB, userId(c), input.productId, input.idempotencyKey) }, 201)
  })

  // Local-only stand-in for a gateway callback; refuses outside the local environment.
  app.post('/shop/orders/:id/dev-pay', async (c) =>
    c.json({ order: await shop.fulfillOrder(c.env.DB, userId(c), c.req.param('id'), c.env.APP_ENVIRONMENT) }))

  app.get('/shop/entitlements', async (c) => c.json(await shop.entitlementSummary(c.env.DB, userId(c))))

  app.get('/shop/plan-requests', async (c) => c.json({ requests: await shop.listPlanRequests(c.env.DB, userId(c)) }))

  app.post('/shop/plan-requests', async (c) => {
    const input = await readBody(c, createPlanRequestInputSchema)
    return c.json({ requests: await shop.createPlanRequest(c.env.DB, userId(c), input.goal, input.details) }, 201)
  })

  app.get('/broadcasts', async (c) => {
    const result = await c.env.DB.prepare(
      `SELECT id, title, body, created_at AS createdAt FROM broadcasts
       WHERE expires_at IS NULL OR expires_at > ? ORDER BY created_at DESC LIMIT 5`,
    )
      .bind(Date.now())
      .all<{ id: string; title: string; body: string; createdAt: number }>()
    return c.json({
      broadcasts: result.results.map((row) => ({ ...row, createdAt: new Date(row.createdAt).toISOString() })),
    })
  })

  return app
}
