import {
  orderSchema,
  planRequestSchema,
  adminProductSchema,
  type Delivery,
  type Order,
  type PlanRequest,
  type Product,
  type UpsertProductInput,
} from '../../src/shared/api/shop'
import { ApiError, conflict, forbidden, notFound } from '../http/errors'

const DAY_MS = 86_400_000

type ProductRow = Omit<Product, 'isActive' | 'owned' | 'ownedUntil' | 'requiresDelivery'> & {
  position: number
  archivedAt: number | null
  requiresDelivery: number
  isActive: number
  ownedAt: number | null
  expiresAt: number | null
}

/** Real gateways plug in here; until one is configured only local dev can "pay". */
export const paymentsMode = (environment: string | undefined) => (environment === 'local' ? 'dev' : 'unavailable')

export async function listProducts(db: D1Database, me: string, includeInactive = false) {
  const now = Date.now()
  const result = await db
    .prepare(
      `SELECT p.id, p.slug, p.kind, p.title, p.summary, p.description, p.price_toman AS priceToman,
         p.duration_days AS durationDays, p.is_active AS isActive, p.requires_delivery AS requiresDelivery,
         p.position, p.archived_at AS archivedAt,
         e.granted_at AS ownedAt, e.expires_at AS expiresAt
       FROM shop_products p
       LEFT JOIN entitlements e ON e.product_id = p.id AND e.user_id = ? AND (e.expires_at IS NULL OR e.expires_at > ?)
       ${includeInactive ? '' : 'WHERE p.is_active = 1 AND p.archived_at IS NULL'}
       ORDER BY p.position, p.title`,
    )
    .bind(me, now)
    .all<ProductRow>()
  return result.results.map(({ ownedAt, expiresAt, archivedAt, ...row }) =>
    adminProductSchema.parse({
      ...row,
      archivedAt: archivedAt === null ? null : new Date(archivedAt).toISOString(),
      isActive: row.isActive === 1,
      requiresDelivery: row.requiresDelivery === 1,
      owned: ownedAt !== null,
      ownedUntil: expiresAt === null ? null : new Date(expiresAt).toISOString(),
    }),
  )
}

type OrderRow = Omit<Order, 'createdAt' | 'paidAt' | 'delivery'> & { createdAt: number; paidAt: number | null; delivery: string | null }

const orderColumns = `o.id, o.product_id AS productId, p.title AS productTitle, o.status,
  o.amount_toman AS amountToman, o.created_at AS createdAt, o.paid_at AS paidAt, o.delivery_details AS delivery`

const toOrder = (row: OrderRow) =>
  orderSchema.parse({
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    paidAt: row.paidAt === null ? null : new Date(row.paidAt).toISOString(),
    delivery: row.delivery === null ? null : JSON.parse(row.delivery),
  })

async function findOrder(db: D1Database, me: string, id: string) {
  const row = await db
    .prepare(`SELECT ${orderColumns} FROM shop_orders o JOIN shop_products p ON p.id = o.product_id WHERE o.id = ? AND o.user_id = ?`)
    .bind(id, me)
    .first<OrderRow>()
  if (row === null) throw notFound('The order does not exist.')
  return toOrder(row)
}

export async function listOrders(db: D1Database, me: string) {
  const result = await db
    .prepare(`SELECT ${orderColumns} FROM shop_orders o JOIN shop_products p ON p.id = o.product_id WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 100`)
    .bind(me)
    .all<OrderRow>()
  return result.results.map(toOrder)
}

export async function createOrder(db: D1Database, me: string, productId: string, idempotencyKey: string, delivery?: Delivery) {
  const existing = await db
    .prepare('SELECT id FROM shop_orders WHERE user_id = ? AND idempotency_key = ?')
    .bind(me, idempotencyKey)
    .first<{ id: string }>()
  if (existing) return findOrder(db, me, existing.id)

  const product = await db
    .prepare('SELECT id, price_toman AS price, duration_days AS days, requires_delivery AS physical FROM shop_products WHERE id = ? AND is_active = 1 AND archived_at IS NULL')
    .bind(productId)
    .first<{ id: string; price: number; days: number | null; physical: number }>()
  if (product === null) throw notFound('The product is not available.')
  if (product.physical === 1 && !delivery) throw new ApiError(400, 'DELIVERY_REQUIRED', 'Choose pickup or shipping for this product.')

  const owned = await db
    .prepare('SELECT 1 AS hit FROM entitlements WHERE user_id = ? AND product_id = ? AND expires_at IS NULL')
    .bind(me, productId)
    .first()
  if (owned && product.physical !== 1) throw conflict('ALREADY_OWNED', 'You already own this product.')

  const id = crypto.randomUUID()
  const now = Date.now()
  // The amount is copied from the catalog server-side; the client never sends a price.
  await db
    .prepare(
      `INSERT OR IGNORE INTO shop_orders (id, user_id, product_id, status, amount_toman, provider, idempotency_key, created_at, updated_at, delivery_method, delivery_details)
       VALUES (?, ?, ?, 'pending', ?, 'dev', ?, ?, ?, ?, ?)`,
    )
    .bind(id, me, productId, product.price, idempotencyKey, now, now, product.physical === 1 && delivery ? delivery.method : null, product.physical === 1 && delivery ? JSON.stringify(delivery) : null)
    .run()
  const stored = await db.prepare('SELECT id FROM shop_orders WHERE user_id = ? AND idempotency_key = ?').bind(me, idempotencyKey).first<{ id: string }>()
  return findOrder(db, me, stored?.id ?? id)
}

/** Marks a pending order paid and grants (or extends) its entitlement. */
export async function fulfillOrder(db: D1Database, me: string, orderId: string, environment: string | undefined) {
  if (paymentsMode(environment) !== 'dev') {
    throw new ApiError(503, 'PAYMENTS_UNAVAILABLE', 'Online payment is not configured yet.')
  }
  const order = await db
    .prepare('SELECT o.status, o.product_id AS productId, p.duration_days AS days FROM shop_orders o JOIN shop_products p ON p.id = o.product_id WHERE o.id = ? AND o.user_id = ?')
    .bind(orderId, me)
    .first<{ status: string; productId: string; days: number | null }>()
  if (order === null) throw notFound('The order does not exist.')
  if (order.status === 'paid') return findOrder(db, me, orderId)
  if (order.status !== 'pending') throw conflict('ORDER_CLOSED', 'This order can no longer be paid.')

  const now = Date.now()
  const extension = order.days === null ? null : order.days * DAY_MS
  await db.batch([
    db.prepare("UPDATE shop_orders SET status = 'paid', paid_at = ?, updated_at = ?, provider_reference = ? WHERE id = ? AND status = 'pending'")
      .bind(now, now, `dev-${orderId.slice(0, 8)}`, orderId),
    db.prepare(
      `INSERT INTO entitlements (user_id, product_id, source_order_id, granted_at, expires_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id, product_id) DO UPDATE SET source_order_id = excluded.source_order_id,
         expires_at = CASE WHEN excluded.expires_at IS NULL THEN NULL
           ELSE MAX(COALESCE(entitlements.expires_at, 0), ?) + ? END`,
    ).bind(me, order.productId, orderId, now, extension === null ? null : now + extension, now, extension ?? 0),
  ])
  return findOrder(db, me, orderId)
}

export async function entitlementSummary(db: D1Database, me: string) {
  const result = await db
    .prepare(
      `SELECT p.id, p.kind FROM entitlements e JOIN shop_products p ON p.id = e.product_id
       WHERE e.user_id = ? AND (e.expires_at IS NULL OR e.expires_at > ?)`,
    )
    .bind(me, Date.now())
    .all<{ id: string; kind: Product['kind'] }>()
  const kinds = [...new Set(result.results.map((row) => row.kind))]
  return { plus: kinds.includes('subscription'), productIds: result.results.map((row) => row.id), kinds }
}

type PlanRow = Omit<PlanRequest, 'createdAt' | 'updatedAt'> & { createdAt: number; updatedAt: number }

const planColumns = `r.id, r.user_id AS userId, u.name AS displayName, r.goal, r.details, r.status, r.response,
  r.created_at AS createdAt, r.updated_at AS updatedAt`

const toPlan = (row: PlanRow) =>
  planRequestSchema.parse({ ...row, createdAt: new Date(row.createdAt).toISOString(), updatedAt: new Date(row.updatedAt).toISOString() })

export async function listPlanRequests(db: D1Database, me: string | null) {
  const result = await db
    .prepare(`SELECT ${planColumns} FROM plan_requests r JOIN user u ON u.id = r.user_id ${me ? 'WHERE r.user_id = ?' : ''} ORDER BY r.created_at DESC LIMIT 200`)
    .bind(...(me ? [me] : []))
    .all<PlanRow>()
  return result.results.map(toPlan)
}

export async function createPlanRequest(db: D1Database, me: string, goal: string, details: string) {
  const now = Date.now()
  const result = await db.prepare(
    `INSERT INTO plan_requests (id, user_id, product_id, goal, details, status, created_at, updated_at)
     SELECT ?, e.user_id, p.id, ?, ?, 'submitted', ?, ? FROM entitlements e JOIN shop_products p ON p.id = e.product_id
     WHERE e.user_id = ? AND (e.expires_at IS NULL OR e.expires_at > ?) AND p.kind IN ('plan_by_asal', 'dna_plan')
     ORDER BY p.kind = 'plan_by_asal' DESC, e.granted_at DESC, p.id LIMIT 1`,
  ).bind(crypto.randomUUID(), goal, details, now, now, me, now).run()
  if (!result.meta.changes) throw forbidden('Buy a personal plan first.')
  return listPlanRequests(db, me)
}

export async function answerPlanRequest(db: D1Database, id: string, status: string, response: string | null) {
  const result = await db
    .prepare('UPDATE plan_requests SET status = ?, response = COALESCE(?, response), updated_at = ? WHERE id = ?')
    .bind(status, response, Date.now(), id)
    .run()
  if (result.meta.changes === 0) throw notFound('The request does not exist.')
}

export async function upsertProduct(db: D1Database, id: string | null, input: UpsertProductInput) {
  const now = Date.now()
  const productId = id ?? crypto.randomUUID()
  const values = [
    input.slug, input.kind, input.title, input.summary, input.description, input.priceToman,
    input.durationDays, Number(input.isActive), input.position,
    input.requiresDelivery === undefined ? null : Number(input.requiresDelivery),
  ] as const
  try {
    const result = id === null
      ? await db.prepare(`INSERT INTO shop_products
        (id, slug, kind, title, summary, description, price_toman, duration_days, is_active, position, requires_delivery, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 0), ?, ?)`).bind(productId, ...values, now, now).run()
      : await db.prepare(`UPDATE shop_products SET slug = ?, kind = ?, title = ?, summary = ?, description = ?,
        price_toman = ?, duration_days = ?, is_active = ?, position = ?, requires_delivery = COALESCE(?, requires_delivery), updated_at = ?
        WHERE id = ? AND archived_at IS NULL AND (kind = ? OR (
          NOT EXISTS (SELECT 1 FROM shop_orders WHERE product_id = shop_products.id)
          AND NOT EXISTS (SELECT 1 FROM entitlements WHERE product_id = shop_products.id)
          AND NOT EXISTS (SELECT 1 FROM plan_requests WHERE product_id = shop_products.id)
        ))`).bind(...values, now, id, input.kind).run()
    if (!result.meta.changes) {
      const product = await db.prepare('SELECT archived_at AS archivedAt FROM shop_products WHERE id = ?').bind(productId).first<{ archivedAt: number | null }>()
      if (!product || product.archivedAt !== null) throw notFound('The editable product does not exist.')
      throw conflict('PRODUCT_KIND_IN_USE', 'نوع محصولی که سفارش یا دسترسی دارد قابل تغییر نیست.')
    }
  } catch (error) {
    if (String(error).includes('UNIQUE constraint failed: shop_products.slug')) {
      throw conflict('SLUG_TAKEN', 'این شناسه قبلاً برای محصول دیگری استفاده شده است.')
    }
    throw error
  }
  return productId
}

export async function setProductArchived(db: D1Database, id: string, archived: boolean) {
  const now = Date.now()
  const result = await db.prepare(`UPDATE shop_products SET archived_at = ?, is_active = 0, updated_at = ?
    WHERE id = ? AND archived_at IS ${archived ? '' : 'NOT '}NULL`).bind(archived ? now : null, now, id).run()
  if (!result.meta.changes && !await db.prepare('SELECT id FROM shop_products WHERE id = ?').bind(id).first()) throw notFound()
}

/** Orders that need handing over or posting, newest first, for the admin studio. */
export async function listDeliveryOrders(db: D1Database) {
  const result = await db
    .prepare(`SELECT ${orderColumns}, u.name AS buyerName, u.email AS buyerEmail, o.fulfilled_at AS fulfilledAt FROM shop_orders o
       JOIN shop_products p ON p.id = o.product_id JOIN "user" u ON u.id = o.user_id
       WHERE o.delivery_method IS NOT NULL ORDER BY o.created_at DESC LIMIT 100`)
    .all<OrderRow & { buyerName: string; buyerEmail: string; fulfilledAt: number | null }>()
  return result.results.map(({ buyerName, buyerEmail, fulfilledAt, ...row }) => ({
    ...toOrder(row), buyerName, buyerEmail,
    fulfilledAt: fulfilledAt === null ? null : new Date(fulfilledAt).toISOString(),
  }))
}

export async function setOrderFulfilled(db: D1Database, id: string, fulfilled: boolean) {
  const now = Date.now()
  const result = await db.prepare(`UPDATE shop_orders SET fulfilled_at = CASE WHEN ? THEN COALESCE(fulfilled_at, ?) ELSE NULL END,
    updated_at = ? WHERE id = ? AND delivery_method IS NOT NULL AND status = 'paid'`).bind(Number(fulfilled), now, now, id).run()
  if (!result.meta.changes) throw notFound('سفارش پرداخت‌شده با تحویل فیزیکی پیدا نشد.')
}
