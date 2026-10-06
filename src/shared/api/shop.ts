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
})

export const productsResponseSchema = z.object({
  products: z.array(productSchema),
  paymentsMode: z.enum(['dev', 'unavailable']),
})

export const createOrderInputSchema = z.object({
  productId: z.string().min(1).max(64),
  idempotencyKey: z.string().min(8).max(80),
})

export const orderSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productTitle: z.string(),
  status: z.enum(['pending', 'paid', 'cancelled', 'failed']),
  amountToman: z.number().int(),
  createdAt: z.iso.datetime(),
  paidAt: z.iso.datetime().nullable(),
})

export const orderResponseSchema = z.object({ order: orderSchema })
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
})

export type Product = z.infer<typeof productSchema>
export type ProductKind = z.infer<typeof productKindSchema>
export type Order = z.infer<typeof orderSchema>
export type PlanRequest = z.infer<typeof planRequestSchema>
export type UpsertProductInput = z.infer<typeof upsertProductInputSchema>
