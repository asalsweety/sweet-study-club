import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import type { ZodType } from 'zod'
import type { WorkerEnvironment } from '../types'
import { forbidden, invalidInput } from './errors'

type AppContext = Context<WorkerEnvironment>

export async function readBody<T>(context: AppContext, schema: ZodType<T>): Promise<T> {
  const payload = await context.req.json().catch(() => undefined)
  const parsed = schema.safeParse(payload)
  if (!parsed.success) throw invalidInput()
  return parsed.data
}

export function readQuery<T>(context: AppContext, schema: ZodType<T>): T {
  const parsed = schema.safeParse(context.req.query())
  if (!parsed.success) throw invalidInput()
  return parsed.data
}

export const userId = (context: AppContext) => context.get('authenticatedUserId')

/** Role comes from the database on every request, never from the client. */
export const requireAdmin = createMiddleware<WorkerEnvironment>(async (context, next) => {
  const row = await context.env.DB.prepare('SELECT role FROM user WHERE id = ?')
    .bind(context.get('authenticatedUserId'))
    .first<{ role: string }>()
  if (row?.role !== 'admin') throw forbidden('Only admins can do this.')
  await next()
})
