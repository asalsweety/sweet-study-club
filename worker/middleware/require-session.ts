import { createMiddleware } from 'hono/factory'
import { getAuthSession } from '../auth'
import type { WorkerBindings, WorkerEnvironment } from '../types'

export type SessionIdentity = {
  user: {
    id: string
  }
}

export type SessionResolver = (
  bindings: WorkerBindings,
  headers: Headers,
) => Promise<SessionIdentity | null>

export function createRequireSession(
  resolveSession: SessionResolver = getAuthSession,
) {
  return createMiddleware<WorkerEnvironment>(
    async (context, next) => {
      const session = await resolveSession(
        context.env,
        context.req.raw.headers,
      )

      if (!session) {
        return context.json(
          {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication is required.',
              requestId: context.get('requestId'),
            },
          },
          401,
        )
      }

      context.set('authenticatedUserId', session.user.id)
      await next()
    },
  )
}
