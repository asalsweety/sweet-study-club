import { Hono } from 'hono'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import type { ServiceStatus } from '../src/shared/api/system'
import { createAuth } from './auth'
import type { WorkerEnvironment } from './types'

const serviceName = 'sweet-study-club-api' as const

function createStatus(
  status: ServiceStatus['status'],
  environment: string | undefined,
  requestIdentifier: string,
): ServiceStatus {
  return {
    service: serviceName,
    status,
    environment: environment ?? 'unknown',
    timestamp: new Date().toISOString(),
    requestId: requestIdentifier,
  }
}

export function createWorkerApp() {
  const app = new Hono<WorkerEnvironment>()

  app.use('/api/*', requestId())
  app.use('/api/*', secureHeaders())

  app.all('/api/auth/*', (context) => {
    return createAuth(context.env).handler(context.req.raw)
  })

  app.get('/api/health', (context) => {
    return context.json(
      createStatus(
        'ok',
        context.env.APP_ENVIRONMENT,
        context.get('requestId'),
      ),
    )
  })

  app.get('/api/ready', async (context) => {
    try {
      const metadata = await context.env.DB.prepare(
        'SELECT value FROM system_metadata WHERE key = ?',
      )
        .bind('schema_version')
        .first<{ value: string }>()

      if (metadata?.value !== '2') {
        throw new Error('The expected database migration is missing.')
      }

      return context.json(
        createStatus(
          'ok',
          context.env.APP_ENVIRONMENT,
          context.get('requestId'),
        ),
      )
    } catch (error) {
      console.error('Database readiness check failed.', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
        requestId: context.get('requestId'),
      })

      return context.json(
        createStatus(
          'unavailable',
          context.env.APP_ENVIRONMENT,
          context.get('requestId'),
        ),
        503,
      )
    }
  })

  app.notFound((context) => {
    if (context.req.path.startsWith('/api/')) {
      return context.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'The requested API route does not exist.',
            requestId: context.get('requestId'),
          },
        },
        404,
      )
    }

    return context.env.ASSETS.fetch(context.req.raw)
  })

  app.onError((error, context) => {
    const requestIdentifier = context.get('requestId')

    console.error('Unhandled API request failure.', {
      errorName: error.name,
      method: context.req.method,
      path: context.req.path,
      requestId: requestIdentifier,
    })

    return context.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'The server could not complete this request.',
          requestId: requestIdentifier,
        },
      },
      500,
    )
  })

  return app
}

export const workerApp = createWorkerApp()
