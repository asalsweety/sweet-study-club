import { z } from 'zod'

export const productKindSchema = z.enum([
  'planner',
  'study_plan',
  'package',
  'plan_by_asal',
  'dna_plan',
  'subscription',
])

export const productSchema = z.object({
  id: z.string(),
  slug: z.string(),
  kind: productKindSchema,
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  priceToman: z.number().int().nonnegative(),
  durationDays: z.number().int().nullable(),
  isActive: z.boolean(),
  owned: z.boolean(),
  ownedUntil: z.iso.datetime().nullable(),
  requiresDelivery: z.boolean(),
})

const persianDigits = (value: string) => value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
const phoneSchema = z.string().trim().transform(persianDigits).pipe(z.string().regex(/^09\d{9}$/, 'شمارۀ موبایل را به شکل ۰۹۱۲۳۴۵۶۷۸۹ بنویس.'))
/** How a physical product reaches the buyer: picked up in person or posted. */
export const deliverySchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('pickup'), name: z.string().trim().min(2).max(60), phone: phoneSchema, note: z.string().trim().max(200).optional() }),
  z.object({
    method: z.literal('shipping'), name: z.string().trim().min(2).max(60), phone: phoneSchema,
    city: z.string().trim().min(2).max(60), address: z.string().trim().min(10).max(400),
    postalCode: z.string().trim().transform(persianDigits).pipe(z.string().regex(/^\d{10}$/, 'کد پستی ۱۰ رقمی است.')),
    note: z.string().trim().max(200).optional(),
  }),
])

export const productsResponseSchema = z.object({
  products: z.array(productSchema),
  paymentsMode: z.enum(['dev', 'unavailable']),
})
export const adminProductSchema = productSchema.extend({
  position: z.number().int(),
  archivedAt: z.iso.datetime().nullable(),
})
export const adminProductsResponseSchema = z.object({ products: z.array(adminProductSchema) })

export const createOrderInputSchema = z.object({
  productId: z.string().min(1).max(64),
  idempotencyKey: z.string().min(8).max(80),
  delivery: deliverySchema.optional(),
})

export const orderSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productTitle: z.string(),
  status: z.enum(['pending', 'paid', 'cancelled', 'failed']),
  amountToman: z.number().int(),
  createdAt: z.iso.datetime(),
  paidAt: z.iso.datetime().nullable(),
  delivery: deliverySchema.nullable(),
})

export const orderResponseSchema = z.object({ order: orderSchema })
export const deliveryOrdersResponseSchema = z.object({
  orders: z.array(orderSchema.extend({
    buyerName: z.string(),
    buyerEmail: z.string(),
    fulfilledAt: z.iso.datetime().nullable(),
  })),
})
export const ordersResponseSchema = z.object({ orders: z.array(orderSchema) })

export const entitlementsResponseSchema = z.object({
  plus: z.boolean(),
  productIds: z.array(z.string()),
  kinds: z.array(productKindSchema),
})

export const planRequestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  displayName: z.string(),
  goal: z.string(),
  details: z.string(),
  status: z.enum(['submitted', 'in_progress', 'delivered']),
  response: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export const planRequestsResponseSchema = z.object({
  requests: z.array(planRequestSchema),
})

export const createPlanRequestInputSchema = z.object({
  goal: z.string().trim().min(1).max(200),
  details: z.string().trim().max(3000),
})

export const answerPlanRequestInputSchema = z.object({
  status: z.enum(['in_progress', 'delivered']),
  response: z.string().trim().max(20000).nullable(),
})

export const upsertProductInputSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]{2,60}$/),
  kind: productKindSchema,
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(300),
  description: z.string().trim().max(4000),
  priceToman: z.number().int().min(0).max(1_000_000_000),
  durationDays: z.number().int().min(1).max(3650).nullable(),
  isActive: z.boolean(),
  position: z.number().int().min(0).max(1000),
  requiresDelivery: z.boolean().optional(),
})

export const broadcastFieldsSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
})
const broadcastTone = z.enum(['notice', 'maintenance', 'important'])
const broadcastDestination = z.enum(['planner', 'learning', 'shop', 'feedback', 'ranking']).nullable()
export const simpleBroadcastSchema = broadcastFieldsSchema.extend({ expiresAt: z.iso.datetime().nullable() }).strict()
const broadcastEditorSchema = simpleBroadcastSchema.extend({
  startsAt: z.iso.datetime().nullable(),
  published: z.boolean(),
  pinned: z.boolean(),
  popup: z.boolean().optional(),
  tone: broadcastTone,
  destination: broadcastDestination,
})
export const broadcastInputSchema = broadcastEditorSchema.refine(
  ({ startsAt, expiresAt }) => !startsAt || !expiresAt || Date.parse(startsAt) < Date.parse(expiresAt),
  { path: ['expiresAt'], message: 'زمان پایان باید بعد از شروع باشد.' },
)
export const adminBroadcastsSchema = z.object({
  broadcasts: z.array(broadcastEditorSchema.extend({
    id: z.string(), createdAt: z.iso.datetime(), popup: z.boolean().default(false), revision: z.number().int().positive().default(1),
  })),
})
export const broadcastsSchema = z.object({
  broadcasts: z.array(broadcastFieldsSchema.extend({
    id: z.string(), createdAt: z.iso.datetime(), expiresAt: z.iso.datetime().nullable().default(null),
    tone: broadcastTone.default('notice'), pinned: z.boolean().default(false), destination: broadcastDestination.default(null),
    popup: z.boolean().default(false), revision: z.number().int().positive().default(1),
  })),
})

export type Delivery = z.infer<typeof deliverySchema>
export type Product = z.infer<typeof productSchema>
export type AdminProduct = z.infer<typeof adminProductSchema>
export type BroadcastInput = z.infer<typeof broadcastInputSchema>
export type ProductKind = z.infer<typeof productKindSchema>
export type Order = z.infer<typeof orderSchema>
export type PlanRequest = z.infer<typeof planRequestSchema>
export type UpsertProductInput = z.infer<typeof upsertProductInputSchema>
